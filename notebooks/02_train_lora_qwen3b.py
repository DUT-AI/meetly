"""
Meetly - QLoRA Fine-tuning Script for Qwen/Qwen2.5-3B-Instruct.
Task: Meeting Action Item & Task Extraction (MIE).

Target Hardware:
- Google Colab T4 16GB / Tesla V100 / RTX 3060 / A100.
- Peak VRAM Usage: ~5.8 GB (with 4-bit NormalFloat quantization).
- Training Time: ~1.5 - 2.5 hours for 3 epochs (1,080 samples).
"""

import os
import sys
from pathlib import Path

import torch
from datasets import load_dataset
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
)
from trl import SFTTrainer

# Base model identifier
MODEL_ID = os.getenv("BASE_MODEL_ID", "Qwen/Qwen2.5-3B-Instruct")
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "./models/meetly_task_extractor_qwen3b_lora")


def train():
    current_dir = Path(__file__).resolve().parent
    data_dir = current_dir / "data"
    train_file = str(data_dir / "dataset_tasks_train.jsonl")
    val_file = str(data_dir / "dataset_tasks_val.jsonl")

    if not os.path.exists(train_file):
        print(
            f"Error: Training file not found at {train_file}. Please run 01_prepare_dataset.py first!"
        )
        sys.exit(1)

    print("=== Starting QLoRA Fine-tuning for Meetly Task Extractor ===")
    print(f"Base Model: {MODEL_ID}")
    print(f"CUDA Available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"GPU Device: {torch.cuda.get_device_name(0)}")

    # 1. 4-bit Quantization Configuration (QLoRA)
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16
        if torch.cuda.is_bf16_supported()
        else torch.float16,
        bnb_4bit_use_double_quant=True,
    )

    # 2. Load Tokenizer
    tokenizer = AutoTokenizer.from_pretrained(
        MODEL_ID,
        trust_remote_code=True,
        padding_side="right",
    )
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # 3. Load Base Model in 4-bit
    device_map = "auto" if torch.cuda.is_available() else "cpu"
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        quantization_config=bnb_config if torch.cuda.is_available() else None,
        device_map=device_map,
        torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
        trust_remote_code=True,
    )

    if torch.cuda.is_available():
        model = prepare_model_for_kbit_training(model)

    # 4. LoRA Adapter Configuration
    peft_config = LoraConfig(
        r=16,
        lora_alpha=32,
        target_modules=[
            "q_proj",
            "k_proj",
            "v_proj",
            "o_proj",
            "gate_proj",
            "up_proj",
            "down_proj",
        ],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
    )
    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters()

    # 5. Load Dataset
    dataset = load_dataset(
        "json",
        data_files={"train": train_file, "validation": val_file},
    )

    def formatting_prompts_func(example):
        output_texts = []
        for msgs in example["messages"]:
            text = tokenizer.apply_chat_template(
                msgs,
                tokenize=False,
                add_generation_prompt=False,
            )
            output_texts.append(text)
        return output_texts

    import inspect
    try:
        from trl import SFTConfig
        has_sft_config = True
    except ImportError:
        has_sft_config = False

    # 6. Training Arguments / SFTConfig
    ConfigClass = SFTConfig if has_sft_config else TrainingArguments
    config_params = inspect.signature(ConfigClass.__init__).parameters

    training_kwargs = {
        "output_dir": OUTPUT_DIR,
        "per_device_train_batch_size": 2,
        "gradient_accumulation_steps": 4,
        "warmup_steps": 15,
        "num_train_epochs": 3,
        "learning_rate": 2e-4,
        "lr_scheduler_type": "cosine",
        "fp16": torch.cuda.is_available() and not torch.cuda.is_bf16_supported(),
        "bf16": torch.cuda.is_available() and torch.cuda.is_bf16_supported(),
        "logging_steps": 10,
        "eval_steps": 50,
        "save_strategy": "steps",
        "save_steps": 100,
        "save_total_limit": 2,
        "optim": "paged_adamw_8bit" if torch.cuda.is_available() else "adamw_torch",
        "report_to": "none",
    }
    eval_key = "eval_strategy" if "eval_strategy" in config_params else "evaluation_strategy"
    training_kwargs[eval_key] = "steps"

    if has_sft_config:
        if "max_length" in config_params:
            training_kwargs["max_length"] = 2048
        elif "max_seq_length" in config_params:
            training_kwargs["max_seq_length"] = 2048

    training_args = ConfigClass(**training_kwargs)

    # 7. SFT Trainer (Adapts dynamically to older and newer TRL versions)
    trainer_params = inspect.signature(SFTTrainer.__init__).parameters
    trainer_kwargs = {
        "model": model,
        "train_dataset": dataset["train"],
        "eval_dataset": dataset["validation"],
        "peft_config": peft_config,
        "formatting_func": formatting_prompts_func,
        "args": training_args,
    }
    if "processing_class" in trainer_params:
        trainer_kwargs["processing_class"] = tokenizer
    elif "tokenizer" in trainer_params:
        trainer_kwargs["tokenizer"] = tokenizer

    if "max_seq_length" in trainer_params:
        trainer_kwargs["max_seq_length"] = 2048

    trainer = SFTTrainer(**trainer_kwargs)

    print("\nStarting Training...")
    trainer.train()

    print(f"\nTraining completed! Saving LoRA adapter to {OUTPUT_DIR}...")
    trainer.model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    print("All artifacts saved successfully.")


if __name__ == "__main__":
    train()

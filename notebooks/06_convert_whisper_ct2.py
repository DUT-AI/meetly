#!/usr/bin/env python3
"""
Meetly - Whisper Large-v3 LoRA Adapter Merge & CTranslate2 Conversion
====================================================================
Merges trained LoRA weights with openai/whisper-large-v3 and converts
the resulting model into CTranslate2 format for faster-whisper deployment.

Usage:
    python notebooks/06_convert_whisper_ct2.py \
        --base_model openai/whisper-large-v3 \
        --lora_dir ./models/whisper-large-v3-vietnamese-lora \
        --output_ct2 ./models/meetly-faster-whisper-large-v3 \
        --quantization float16
"""

import argparse
import logging
import os
import shutil
import subprocess
import sys
from pathlib import Path

try:
    import torch
except ImportError:
    torch = None

logging.basicConfig(
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
)
logger = logging.getLogger("WhisperCT2Converter")


def merge_lora_and_convert_to_ct2(
    base_model_id: str = "openai/whisper-large-v3",
    lora_dir: str = "./models/whisper-large-v3-vietnamese-lora",
    merged_dir: str = "./models/whisper-large-v3-vietnamese-merged",
    output_ct2_dir: str = "./models/meetly-faster-whisper-large-v3",
    quantization: str = "float16",
):
    """
    1. Loads base Whisper Large-v3 and merges trained LoRA adapter weights.
    2. Exports full HuggingFace checkpoint.
    3. Converts HuggingFace checkpoint to CTranslate2 for Faster-Whisper.
    """
    logger.info("=" * 70)
    logger.info("Meetly AI - Whisper Large-v3 LoRA Merge & CTranslate2 Converter")
    logger.info(f"Base Model:     {base_model_id}")
    logger.info(f"LoRA Adapter:   {lora_dir}")
    logger.info(f"Merged Export:  {merged_dir}")
    logger.info(f"CTranslate2:    {output_ct2_dir} ({quantization})")
    logger.info("=" * 70)

    # 1. Check if LoRA adapter directory exists
    if not os.path.exists(lora_dir):
        logger.warning(
            f"LoRA directory '{lora_dir}' not found. If converting base model directly, skipping LoRA merge."
        )
        source_model_for_ct2 = base_model_id
    else:
        from peft import PeftModel
        from transformers import WhisperForConditionalGeneration, WhisperProcessor

        logger.info(f"Step 1: Loading base model {base_model_id} in float16/float32...")
        device = "cuda" if torch.cuda.is_available() else "cpu"
        dtype = torch.float16 if torch.cuda.is_available() else torch.float32

        base_model = WhisperForConditionalGeneration.from_pretrained(
            base_model_id,
            torch_dtype=dtype,
            low_cpu_mem_usage=True,
        )

        logger.info(f"Step 2: Attaching LoRA adapter from {lora_dir}...")
        model = PeftModel.from_pretrained(base_model, lora_dir)

        logger.info("Step 3: Merging LoRA adapter weights into base model weights...")
        merged_model = model.merge_and_unload()

        logger.info(f"Step 4: Saving unified merged model to {merged_dir}...")
        os.makedirs(merged_dir, exist_ok=True)
        merged_model.save_pretrained(merged_dir)

        # Copy or save processor files
        processor = WhisperProcessor.from_pretrained(
            lora_dir if os.path.exists(os.path.join(lora_dir, "tokenizer_config.json")) else base_model_id
        )
        processor.save_pretrained(merged_dir)
        logger.info("Merged model saved successfully.")
        source_model_for_ct2 = merged_dir

    # 2. Convert to CTranslate2 using ct2-transformers-converter or Python API
    logger.info(f"Step 5: Converting {source_model_for_ct2} to CTranslate2 ({quantization})...")
    os.makedirs(output_ct2_dir, exist_ok=True)

    ct2_bin = shutil.which("ct2-transformers-converter") or (
        os.path.join(os.path.dirname(sys.executable), "ct2-transformers-converter")
        if os.path.exists(os.path.join(os.path.dirname(sys.executable), "ct2-transformers-converter"))
        else "ct2-transformers-converter"
    )

    ct2_cmd = [
        ct2_bin,
        "--model",
        source_model_for_ct2,
        "--output_dir",
        output_ct2_dir,
        "--quantization",
        quantization,
        "--copy_files",
        "tokenizer.json",
        "preprocessor_config.json",
        "--force",
    ]

    converted_ok = False
    try:
        logger.info(f"Executing: {' '.join(ct2_cmd)}")
        subprocess.run(ct2_cmd, check=True)
        logger.info(f"CTranslate2 model generated at: {output_ct2_dir}")
        converted_ok = True
    except (subprocess.SubprocessError, FileNotFoundError) as e:
        logger.warning(
            f"Command line converter failed ({e}). Attempting via Python ctranslate2 API..."
        )
        try:
            import ctranslate2.converters

            converter = ctranslate2.converters.TransformersConverter(
                model_name_or_path=source_model_for_ct2,
                copy_files=["tokenizer.json", "preprocessor_config.json"],
                load_as_float16=(quantization == "float16"),
            )
            converter.convert(
                output_dir=output_ct2_dir,
                quantization=quantization,
                force=True,
            )
            logger.info(f"CTranslate2 model generated via Python API at: {output_ct2_dir}")
            converted_ok = True
        except Exception as py_err:
            logger.error(
                f"CTranslate2 conversion failed: {py_err}\n"
                f"Please ensure ctranslate2 is installed: pip install ctranslate2\n"
                f"Manual command: {' '.join(ct2_cmd)}"
            )
            converted_ok = False

    # Cleanup temporary merged model if in /dev/shm
    if source_model_for_ct2.startswith("/dev/shm") and os.path.exists(source_model_for_ct2):
        logger.info(f"Cleaning up temporary RAM disk directory: {source_model_for_ct2}")
        shutil.rmtree(source_model_for_ct2, ignore_errors=True)

    if not converted_ok:
        return False

    # 3. Test verification with faster-whisper
    logger.info("Step 6: Verifying CTranslate2 model loading with faster-whisper...")
    try:
        from faster_whisper import WhisperModel

        device_to_test = "cuda" if torch.cuda.is_available() else "cpu"
        compute_to_test = "float16" if torch.cuda.is_available() else "int8"
        test_model = WhisperModel(
            model_size_or_path=output_ct2_dir,
            device=device_to_test,
            compute_type=compute_to_test,
        )
        logger.info("Verification PASSED! Model initialized cleanly with Faster-Whisper.")
        logger.info("=" * 70)
        logger.info("DEPLOYMENT INSTRUCTIONS FOR MEETLY:")
        logger.info("1. Set in your .env:")
        logger.info(f"   STT_MODEL_ID={output_ct2_dir}")
        logger.info("   OFFLINE_STT_MODEL_SIZE={output_ct2_dir}")
        logger.info("2. Restart Meetly API: python apps/api/main.py")
        logger.info("=" * 70)
        return True
    except Exception as e:
        logger.warning(f"Could not perform verification load ({e}). Check CTranslate2 files.")
        return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Merge Whisper LoRA adapter and convert to CTranslate2 format."
    )
    parser.add_argument(
        "--base_model",
        type=str,
        default="openai/whisper-large-v3",
        help="Base Whisper HuggingFace model ID",
    )
    parser.add_argument(
        "--lora_dir",
        type=str,
        default="./models/whisper-large-v3-vietnamese-lora",
        help="Path to trained LoRA adapter directory",
    )
    parser.add_argument(
        "--merged_dir",
        type=str,
        default="/dev/shm/whisper_merged" if os.path.exists("/dev/shm") else "./models/whisper-large-v3-vietnamese-merged",
        help="Path to save merged HuggingFace model (uses RAM disk /dev/shm if present to save disk space)",
    )
    parser.add_argument(
        "--output_ct2",
        type=str,
        default="./models/meetly-faster-whisper-large-v3",
        help="Output directory for CTranslate2 model",
    )
    parser.add_argument(
        "--quantization",
        type=str,
        default="float16",
        choices=["float16", "int8", "int8_float16"],
        help="Quantization format for CTranslate2",
    )

    args = parser.parse_args()

    merge_lora_and_convert_to_ct2(
        base_model_id=args.base_model,
        lora_dir=args.lora_dir,
        merged_dir=args.merged_dir,
        output_ct2_dir=args.output_ct2,
        quantization=args.quantization,
    )

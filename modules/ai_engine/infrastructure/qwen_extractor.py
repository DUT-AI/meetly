"""
Qwen2.5-3B Task Extractor Infrastructure Implementation.
Implements ITaskExtractor adhering to Clean Architecture.
Supports 4-bit NormalFloat quantization, LoRA loading, and schema parsing.
"""

import json
import os
import re
import time

try:
    import torch
except ImportError:
    torch = None

from loguru import logger

from modules.ai_engine.domain.entities import (
    AlignmentMethod,
    ExtractedTask,
    TaskExtractionResult,
)
from modules.ai_engine.domain.interfaces import ITaskExtractor

DEFAULT_SYSTEM_PROMPT = (
    "Bạn là chuyên gia Thư ký Cuộc họp AI của hệ thống Meetly.\n"
    "Nhiệm vụ của bạn là đọc kỹ biên bản hội thoại cuộc họp (kèm mốc thời gian và tên người phát biểu) "
    "và trích xuất danh sách tất cả các công việc cần làm (Action Items) theo định dạng JSON có cấu trúc.\n\n"
    "QUY TẮC BẮT BUỘC:\n"
    "1. Phân biệt người thực hiện (Assignee): Chỉ gán 'assignee' cho người TRỰC TIẾP NHẬN hoặc ĐƯỢC CHỈ ĐỊNH rõ ràng sẽ làm việc đó. "
    "Tuyệt đối không nhầm lẫn giữa người giao việc (Requester) và người làm việc.\n"
    "2. Chuẩn hóa Hạn chót (Deadline): Giữ nguyên mốc thời gian cam kết trong hội thoại (ví dụ: 'thứ Sáu', 'trước 17h ngày mai', 'cuối sprint').\n"
    "3. Bắt nguồn âm thanh (Timestamp): Ghi lại chính xác mốc thời gian (start_ms) nơi câu lệnh giao việc hoặc câu nhận việc được nói ra.\n"
    "4. Chống ảo giác (Anti-Hallucination): Chỉ trích xuất công việc ĐƯỢC NÓI TRỰC TIẾP trong hội thoại. Không tự suy diễn. "
    "Nếu cuộc họp không có việc cần làm, trả về danh sách rỗng: []\n\n"
    "ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (DUY NHẤT MỘT MẢNG JSON, KHÔNG KÈM TEXT DẪN):\n"
    "[\n"
    "  {\n"
    '    "task_title": "Tên công việc ngắn gọn bắt đầu bằng động từ hành động",\n'
    '    "assignee": "Tên người chịu trách nhiệm thực thi",\n'
    '    "deadline": "Thời hạn hoàn thành được nhắc đến",\n'
    '    "source_timestamp_ms": 125000,\n'
    '    "confidence": 0.95\n'
    "  }\n"
    "]"
)


class QwenTaskExtractorService(ITaskExtractor):
    """
    Clean Architecture Infrastructure implementation of ITaskExtractor
    using Qwen/Qwen2.5-3B-Instruct with fine-tuned LoRA weights.
    """

    def __init__(
        self,
        model_id: str | None = None,
        adapter_path: str | None = None,
        device: str | None = None,
    ) -> None:
        self.model_id = model_id or os.getenv(
            "QWEN_MODEL_ID", "Qwen/Qwen2.5-3B-Instruct"
        )
        self.adapter_path = adapter_path or os.getenv(
            "TASK_EXTRACTOR_LORA_PATH", "./models/meetly_task_extractor_qwen3b_lora"
        )
        self.device = device or (
            "cuda" if (torch is not None and torch.cuda.is_available()) else "cpu"
        )
        self.tokenizer = None
        self.model = None
        self._is_ready = False

    def load_model(self) -> None:
        if torch is None:
            raise RuntimeError("PyTorch is required to load QwenTaskExtractorService.")
        from peft import PeftModel
        from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

        logger.info(f"[QwenTaskExtractor] Loading {self.model_id} on {self.device}...")
        self.tokenizer = AutoTokenizer.from_pretrained(
            self.model_id, trust_remote_code=True, padding_side="left"
        )
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token

        bnb_config = None
        if self.device == "cuda":
            bnb_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.float16,
            )

        base_model = AutoModelForCausalLM.from_pretrained(
            self.model_id,
            quantization_config=bnb_config,
            device_map="auto" if self.device == "cuda" else None,
            torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
            trust_remote_code=True,
        )

        if os.path.exists(self.adapter_path) and os.path.exists(
            os.path.join(self.adapter_path, "adapter_config.json")
        ):
            logger.info(
                f"[QwenTaskExtractor] Loading LoRA adapter from {self.adapter_path}"
            )
            self.model = PeftModel.from_pretrained(base_model, self.adapter_path)
            self._alignment_method = AlignmentMethod.SFT_LORA
        else:
            self.model = base_model
            self._alignment_method = AlignmentMethod.ZERO_SHOT

        self.model.eval()
        self._is_ready = True
        logger.info("[QwenTaskExtractor] Ready for inference.")

    def is_ready(self) -> bool:
        return self._is_ready

    def extract_tasks(self, transcript_text: str) -> TaskExtractionResult:
        t0 = time.time()
        if not self._is_ready or not self.model or not self.tokenizer:
            # Fallback heuristic
            tasks = self._fallback_extract(transcript_text)
            return TaskExtractionResult(
                tasks=tasks,
                raw_response="[Fallback Heuristic]",
                is_valid_json=True,
                inference_time_ms=(time.time() - t0) * 1000,
                model_name="Fallback",
                alignment_method=AlignmentMethod.ZERO_SHOT,
            )

        messages = [
            {"role": "system", "content": DEFAULT_SYSTEM_PROMPT},
            {"role": "user", "content": f"Biên bản cuộc họp:\n{transcript_text}"},
        ]
        text = self.tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
        inputs = self.tokenizer(text, return_tensors="pt").to(self.device)

        if torch is None:
            raise RuntimeError("PyTorch is required for model inference.")

        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=768,
                temperature=0.1,
                top_p=0.9,
                repetition_penalty=1.1,
                do_sample=False,
            )

        response_tokens = outputs[0][len(inputs.input_ids[0]) :]
        raw_text = self.tokenizer.decode(
            response_tokens, skip_special_tokens=True
        ).strip()

        tasks, is_valid = self._parse_tasks(raw_text)
        elapsed_ms = (time.time() - t0) * 1000

        return TaskExtractionResult(
            tasks=tasks,
            raw_response=raw_text,
            is_valid_json=is_valid,
            inference_time_ms=elapsed_ms,
            model_name=self.model_id,
            alignment_method=getattr(
                self, "_alignment_method", AlignmentMethod.SFT_LORA
            ),
        )

    def _parse_tasks(self, raw_text: str) -> tuple[list[ExtractedTask], bool]:
        try:
            match = re.search(r"\[\s*\{.*\}\s*\]", raw_text, re.DOTALL)
            json_str = match.group(0) if match else raw_text
            data = json.loads(json_str)
            if not isinstance(data, list):
                return [], False

            tasks = []
            for item in data:
                if isinstance(item, dict) and "task_title" in item:
                    tasks.append(
                        ExtractedTask(
                            task_title=str(item.get("task_title", "")).strip(),
                            assignee=str(item.get("assignee", "Chưa rõ")).strip(),
                            deadline=str(item.get("deadline", "Chưa rõ")).strip(),
                            source_timestamp_ms=int(item.get("source_timestamp_ms", 0)),
                            confidence=float(item.get("confidence", 0.95)),
                        )
                    )
            return tasks, True
        except Exception:
            return [], False

    def _fallback_extract(self, text: str) -> list[ExtractedTask]:
        tasks = []
        for line in text.split("\n"):
            if any(
                k in line.lower() for k in ["sửa", "fix", "deploy", "hoàn thành", "cần"]
            ):
                tasks.append(
                    ExtractedTask(
                        task_title=line.split(":")[-1].strip() if ":" in line else line,
                        assignee="Chưa chỉ định",
                        deadline="Trong tuần",
                        confidence=0.8,
                    )
                )
        return tasks

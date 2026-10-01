import json
import os
import re
from typing import Any

import torch
from loguru import logger

SYSTEM_PROMPT = (
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


class QwenTaskExtractor:
    """
    Inference Engine using Qwen/Qwen2.5-3B-Instruct fine-tuned with LoRA
    for Meeting Information Extraction (MIE).
    """

    def __init__(
        self,
        base_model_id: str | None = None,
        adapter_path: str | None = None,
        device: str | None = None,
    ) -> None:
        self.base_model_id = base_model_id or os.getenv(
            "QWEN_MODEL_ID", "Qwen/Qwen2.5-3B-Instruct"
        )
        self.adapter_path = adapter_path or os.getenv(
            "TASK_EXTRACTOR_LORA_PATH", "./models/meetly_task_extractor_qwen3b_lora"
        )
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")

        self.tokenizer = None
        self.model = None
        self._is_ready = False

    def load_model(self) -> None:
        from peft import PeftModel
        from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

        logger.info(
            f"[QwenTaskExtractor] Loading {self.base_model_id} on {self.device}..."
        )

        self.tokenizer = AutoTokenizer.from_pretrained(
            self.base_model_id, trust_remote_code=True, padding_side="left"
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
            self.base_model_id,
            quantization_config=bnb_config,
            device_map="auto" if self.device == "cuda" else None,
            torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
            trust_remote_code=True,
        )

        if os.path.exists(self.adapter_path) and os.path.exists(
            os.path.join(self.adapter_path, "adapter_config.json")
        ):
            logger.info(
                f"[QwenTaskExtractor] Loading fine-tuned LoRA adapter from {self.adapter_path}"
            )
            self.model = PeftModel.from_pretrained(base_model, self.adapter_path)
        else:
            logger.warning(
                f"[QwenTaskExtractor] LoRA adapter not found at {self.adapter_path}, running with base model."
            )
            self.model = base_model

        self.model.eval()
        self._is_ready = True
        logger.info("[QwenTaskExtractor] Successfully loaded Qwen Task Extractor!")

    def is_ready(self) -> bool:
        return self._is_ready

    def extract_tasks(self, transcript_text: str) -> list[dict[str, Any]]:
        """Extract structured tasks from transcript text."""
        if not self._is_ready or not self.model or not self.tokenizer:
            # Fallback stub if model is not loaded in memory
            return self._heuristic_fallback(transcript_text)

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Biên bản cuộc họp:\n{transcript_text}",
            },
        ]

        text = self.tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
        inputs = self.tokenizer(text, return_tensors="pt").to(self.device)

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
        response_text = self.tokenizer.decode(
            response_tokens, skip_special_tokens=True
        ).strip()

        # Parse JSON array out of response
        return self._parse_json_tasks(response_text)

    def _parse_json_tasks(self, text: str) -> list[dict[str, Any]]:
        try:
            # Match JSON array [ ... ]
            json_match = re.search(r"\[\s*\{.*\}\s*\]", text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
            return json.loads(text)
        except Exception as e:
            logger.warning(
                f"[QwenTaskExtractor] JSON parsing failed: {e}. Raw: {text[:200]}"
            )
            return []

    def _heuristic_fallback(self, transcript_text: str) -> list[dict[str, Any]]:
        """Fast fallback extractor based on dialogue parsing."""
        tasks = []
        lines = transcript_text.strip().split("\n")
        for line in lines:
            if any(
                kw in line.lower()
                for kw in ["nhờ", "fix", "sửa", "deploy", "hoàn thành", "trước"]
            ):
                # Simple extraction heuristic
                tasks.append(
                    {
                        "task_title": line.split(":")[-1].strip()
                        if ":" in line
                        else line,
                        "assignee": "Chưa chỉ định",
                        "deadline": "Trong tuần",
                        "source_timestamp_ms": 0,
                        "confidence": 0.85,
                    }
                )
        return tasks

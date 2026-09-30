"""
Meetly - Dataset Preparation for Task & Action Item Extraction.
Formats Vietnamese IT Meeting transcripts into Qwen2.5 ChatML conversation format:
<|im_start|>system...<|im_end|>
<|im_start|>user...<|im_end|>
<|im_start|>assistant...<|im_end|>
"""

import json
import random
from pathlib import Path

SYSTEM_PROMPT = (
    "Bạn là chuyên gia Thư ký Cuộc họp AI của hệ thống Meetly.\n"
    "Nhiệm vụ của bạn là đọc kỹ biên bản hội thoại cuộc họp công nghệ thông tin (kèm mốc thời gian và tên người phát biểu) "
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

# Benchmark core meeting scenarios covering various IT workflows
SAMPLE_CONVERSATIONS = [
    {
        "transcript": (
            "[00:02:15] Nguyễn Hoàng Minh: Phước ơi, cái API đăng nhập bên backend đang bị lỗi xác thực token JWT, "
            "em kiểm tra và sửa xong rồi deploy lên staging trước thứ Sáu này nhé.\n"
            "[00:02:30] Đặng Quốc Phước: Dạ vâng anh Minh, phần này em đang nắm rồi, chiều nay em fix luôn, "
            "chậm nhất thứ Năm là có trên staging để test.\n"
            "[00:02:45] Trương Bùi Diễn: Tiện thể Phước xem lại luôn phần refresh token cookie giùm anh nhé.\n"
            "[00:02:50] Đặng Quốc Phước: Vâng anh Diễn, em gộp vào chung một pull request luôn."
        ),
        "tasks": [
            {
                "task_title": "Kiểm tra, sửa lỗi xác thực token JWT của API đăng nhập và refresh token cookie, deploy lên staging",
                "assignee": "Đặng Quốc Phước",
                "deadline": "Thứ Năm",
                "source_timestamp_ms": 135000,
                "confidence": 0.96,
            }
        ],
    },
    {
        "transcript": (
            "[00:08:10] Quế Đình Anh Tú: Bên frontend mình cần làm lại trang Dashboard hiển thị danh sách cuộc họp "
            "và bộ lọc theo người nói. Phần này ai nhận được nhỉ?\n"
            "[00:08:25] Trường Bùi Diễn: Để em nhận phần này cho. Em sẽ dùng TanStack Query v5 với component Radix UI.\n"
            "[00:08:40] Quế Đình Anh Tú: Ok Diễn, em cố gắng xong trước 17h thứ Tư tuần tới để kịp ghép API với bên backend nhé.\n"
            "[00:08:45] Trường Bùi Diễn: Dạ rõ, trước 17h thứ Tư em tạo PR."
        ),
        "tasks": [
            {
                "task_title": "Thiết kế lại trang Dashboard hiển thị cuộc họp và bộ lọc người nói bằng TanStack Query v5 và Radix UI",
                "assignee": "Trường Bùi Diễn",
                "deadline": "Trước 17h thứ Tư tuần tới",
                "source_timestamp_ms": 505000,
                "confidence": 0.95,
            }
        ],
    },
    {
        "transcript": (
            "[00:15:00] Nguyễn Hoàng Minh: Hệ thống MinIO storage hiện tại chưa bật SSL certificate trên môi trường production, "
            "ai rảnh cấu hình certbot Let's Encrypt giúp team với?\n"
            "[00:15:15] Đặng Quốc Phước: Em đang bận fix nốt module transcription rồi anh ơi, không kịp đâu.\n"
            "[00:15:20] Quế Đình Anh Tú: Để em nhận cho anh Minh. Em sẽ cấu hình Nginx reverse proxy kèm certbot SSL cho MinIO.\n"
            "[00:15:35] Nguyễn Hoàng Minh: Tuyệt vời Tú, xong trước cuối tuần này nhé.\n"
            "[00:15:40] Quế Đình Anh Tú: Dạ vâng anh, Chủ nhật em chốt."
        ),
        "tasks": [
            {
                "task_title": "Cấu hình Nginx reverse proxy kèm SSL certificate Let's Encrypt cho MinIO storage trên production",
                "assignee": "Quế Đình Anh Tú",
                "deadline": "Chủ nhật",
                "source_timestamp_ms": 920000,
                "confidence": 0.94,
            }
        ],
    },
    {
        "transcript": (
            "[00:22:10] Trường Bùi Diễn: Mọi người thấy màu sắc của button trên Chrome Extension hiện tại có hơi tối không?\n"
            "[00:22:20] Quế Đình Anh Tú: Em thấy màu tím đen dark mode nhìn hiện đại mà, hợp với tông màu Meetly.\n"
            "[00:22:30] Nguyễn Hoàng Minh: Ừ anh cũng thấy ổn rồi, giữ nguyên phong cách đó đi, không cần đổi đâu.\n"
            "[00:22:40] Trường Bùi Diễn: Dạ vâng, vậy em giữ nguyên thiết kế cũ."
        ),
        "tasks": [],
    },
    {
        "transcript": (
            "[00:30:05] Nguyễn Hoàng Minh: Chúng ta cần 2 việc gấp trước đợt nộp hồ sơ cuộc thi:\n"
            "Thứ nhất, Tú viết lại tài liệu Privacy Policy cho Extension để nộp lên Chrome Web Store v1.0.1, xong trước 12h trưa mai.\n"
            "Thứ hai, Diễn chạy benchmark đo lại WER và RTF của mô hình Faster-Whisper trên GPU trường, hạn là tối thứ Sáu.\n"
            "[00:30:35] Quế Đình Anh Tú: Em nhận phần Privacy Policy, trưa mai em nộp bản thảo.\n"
            "[00:30:42] Trường Bùi Diễn: Em nhận phần benchmark đo kiểm ASR, tối thứ Sáu em xuất bảng kết quả."
        ),
        "tasks": [
            {
                "task_title": "Viết lại tài liệu Privacy Policy cho Extension để nộp Chrome Web Store v1.0.1",
                "assignee": "Quế Đình Anh Tú",
                "deadline": "12h trưa mai",
                "source_timestamp_ms": 1805000,
                "confidence": 0.98,
            },
            {
                "task_title": "Đo kiểm và lập bảng benchmark WER, RTF của mô hình Faster-Whisper trên máy chủ GPU",
                "assignee": "Trường Bùi Diễn",
                "deadline": "Tối thứ Sáu",
                "source_timestamp_ms": 1805000,
                "confidence": 0.97,
            },
        ],
    },
]

TOPICS = [
    (
        "tối ưu hóa database query",
        "sửa lỗi memory leak trên Redis worker",
        "Viết migration Alembic thêm index",
        "thứ Hai tuần sau",
    ),
    (
        "triển khai Docker compose profile cho AI service",
        "build lại image frontend Next.js",
        "cấu hình health check container",
        "trước 18h ngày mai",
    ),
    (
        "tích hợp Zalo Bot webhook để nhận thông báo task",
        "viết unit test cho use case meeting reminder",
        "refactor lại module notifications",
        "thứ Sáu",
    ),
    (
        "nghiên cứu mô hình ECAPA-TDNN cho diarization",
        "viết script tính Cosine Similarity với pgvector",
        "tối ưu ngưỡng clustering AHC",
        "cuối sprint",
    ),
    (
        "sửa lỗi CORS khi Chrome Extension gọi vào backend",
        "thêm permission tabs vào manifest.json",
        "kiểm thử WebSocket streaming trên Google Meet",
        "trước 15h chiều nay",
    ),
]

MEMBERS = [
    "Nguyễn Hoàng Minh",
    "Trường Bùi Diễn",
    "Quế Đình Anh Tú",
    "Đặng Quốc Phước",
    "Phan Văn An",
]


def generate_synthetic_samples(count: int = 1200) -> list[dict]:
    """Generates synthetic high-variance samples covering IT meeting patterns."""
    samples = []

    # 1. Include base curated seed scenarios
    for s in SAMPLE_CONVERSATIONS:
        samples.append(
            {
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": f"Biên bản cuộc họp:\n{s['transcript']}",
                    },
                    {
                        "role": "assistant",
                        "content": json.dumps(s["tasks"], ensure_ascii=False, indent=2),
                    },
                ]
            }
        )

    # 2. Procedural expansion with realistic speech variants
    random.seed(42)
    for i in range(count - len(SAMPLE_CONVERSATIONS)):
        requester, assignee = random.sample(MEMBERS, 2)
        topic_idx = i % len(TOPICS)
        task_action, task_detail, _tech_scope, deadline = TOPICS[topic_idx]

        minute = random.randint(1, 45)
        sec = random.randint(10, 50)
        ms = (minute * 60 + sec) * 1000

        # Scenario A: Assignment accepted (80% probability)
        if random.random() < 0.85:
            transcript = (
                f"[{minute:02d}:{sec:02d}] {requester}: Nhờ {assignee} xử lý giúp team vụ {task_action}, "
                f"cụ thể là {task_detail} nhé. Cần hoàn thành {deadline}.\n"
                f"[{minute:02d}:{sec + 15:02d}] {assignee}: Dạ vâng anh {requester}, em nhận việc này, {deadline} em push code lên git."
            )
            tasks = [
                {
                    "task_title": f"{task_action.capitalize()} ({task_detail})",
                    "assignee": assignee,
                    "deadline": deadline,
                    "source_timestamp_ms": ms,
                    "confidence": round(random.uniform(0.92, 0.98), 2),
                }
            ]
        else:
            # Scenario B: Pure discussion without explicit tasks
            transcript = (
                f"[{minute:02d}:{sec:02d}] {requester}: Mọi người thấy kiến trúc {task_action} thế nào, có cần đổi không?\n"
                f"[{minute:02d}:{sec + 20:02d}] {assignee}: Em thấy hiện tại vẫn đáp ứng tải tốt, tạm thời chưa cần refactor đâu anh."
            )
            tasks = []

        samples.append(
            {
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"Biên bản cuộc họp:\n{transcript}"},
                    {
                        "role": "assistant",
                        "content": json.dumps(tasks, ensure_ascii=False, indent=2),
                    },
                ]
            }
        )

    random.shuffle(samples)
    return samples


def main():
    output_dir = Path(__file__).resolve().parent / "data"
    output_dir.mkdir(parents=True, exist_ok=True)

    print("Generating 1,200 high-quality IT meeting samples for Qwen2.5-3B-Instruct...")
    dataset = generate_synthetic_samples(1200)

    # Split 90% train (1080 samples), 10% val (120 samples)
    split_idx = int(len(dataset) * 0.9)
    train_data = dataset[:split_idx]
    val_data = dataset[split_idx:]

    train_path = output_dir / "dataset_tasks_train.jsonl"
    val_path = output_dir / "dataset_tasks_val.jsonl"

    with open(train_path, "w", encoding="utf-8") as f:
        f.writelines(json.dumps(item, ensure_ascii=False) + "\n" for item in train_data)

    with open(val_path, "w", encoding="utf-8") as f:
        f.writelines(json.dumps(item, ensure_ascii=False) + "\n" for item in val_data)

    print("Generated successfully!")
    print(f" - Train set: {len(train_data)} samples -> {train_path}")
    print(f" - Validation set: {len(val_data)} samples -> {val_path}")


if __name__ == "__main__":
    main()

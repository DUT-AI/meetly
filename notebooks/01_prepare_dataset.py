"""
Meetly - Advanced Dataset Preparation for Task & Action Item Extraction.
Generates diverse, realistic Vietnamese IT meeting transcripts without template overfitting.
Features:
- 50+ diverse IT engineering scenarios across Backend, Frontend, DevOps, Database, AI, QA, Security.
- 10 distinct conversational interaction patterns (direct delegation, volunteering, handoffs, self-initiated, multi-task, negative cases).
- Strict Zero-Leakage Train/Val split: Validation scenarios are completely disjoint from training scenarios.
- ChatML format for Qwen2.5-3B-Instruct fine-tuning.
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

TEAM_MEMBERS = [
    "Nguyễn Hoàng Minh",
    "Trường Bùi Diễn",
    "Quế Đình Anh Tú",
    "Đặng Quốc Phước",
    "Phan Văn An",
    "Lê Thị Thảo",
    "Vũ Đức Trọng",
    "Trần Hoàng Nam",
    "Phạm Khánh Linh",
    "Bùi Quốc Huy",
    "Đỗ Hải Yến",
    "Ngô Quang Khải",
]

# 40 Diverse Training Scenarios (Domain Richness)
TRAIN_SCENARIOS = [
    # Backend & API
    {
        "action": "tối ưu hóa database query và thêm index",
        "detail": "sửa lỗi slow query trên bảng transcript_segments và thêm partial index cho session_id",
        "default_deadline": "thứ Hai tuần sau",
        "category": "backend",
    },
    {
        "action": "sửa lỗi xác thực token JWT",
        "detail": "xử lý expired token và kiểm tra cơ chế refresh token cookie trên API gateway",
        "default_deadline": "trước 17h chiều nay",
        "category": "backend",
    },
    {
        "action": "viết migration Alembic",
        "detail": "bổ sung bảng task_assignees để hỗ trợ giao việc cho nhiều thành viên",
        "default_deadline": "sáng mai",
        "category": "backend",
    },
    {
        "action": "tích hợp WebSocket reconnect",
        "detail": "triển khai heartbeat ping-pong và exponential backoff khi rớt mạng",
        "default_deadline": "thứ Tư tuần này",
        "category": "backend",
    },
    {
        "action": "refactor kiến trúc Dishka DI",
        "detail": "chuyển đổi các use case sang inject theo request scope để tránh memory leak",
        "default_deadline": "cuối tuần này",
        "category": "backend",
    },
    {
        "action": "tích hợp Celery worker",
        "detail": "xử lý các tác vụ gửi email thông báo và webhook bất đồng bộ",
        "default_deadline": "thứ Sáu",
        "category": "backend",
    },
    # Frontend & UI/UX
    {
        "action": "thiết kế lại modal phân vai diễn giả",
        "detail": "dùng Radix UI Dialog và hiển thị dropdown mapping thành viên trực quan",
        "default_deadline": "trước 18h ngày mai",
        "category": "frontend",
    },
    {
        "action": "tối ưu hóa re-render trên dashboard cuộc họp",
        "detail": "dùng useMemo và tách nhỏ component TranscriptItem để đạt 60fps khi scroll",
        "default_deadline": "thứ Năm",
        "category": "frontend",
    },
    {
        "action": "bổ sung giao diện dark mode và theme tokens",
        "detail": "chuẩn hóa bảng màu TailwindCSS theo tiêu chuẩn WCAG tương phản cao",
        "default_deadline": "cuối sprint",
        "category": "frontend",
    },
    {
        "action": "sửa lỗi hydration mismatch trên Next.js 14",
        "detail": "xử lý múi giờ địa phương trên các thẻ hiển thị timestamp cuộc họp",
        "default_deadline": "chiều nay",
        "category": "frontend",
    },
    {
        "action": "xây dựng giao diện thu âm mẫu giọng Voicebank",
        "detail": "hiển thị waveform animation thời gian thực và đếm ngược 5 giây",
        "default_deadline": "thứ Ba tới",
        "category": "frontend",
    },
    # DevOps & Infrastructure
    {
        "action": "cấu hình CI/CD pipeline trên GitHub Actions",
        "detail": "tự động chạy lint ruff, pytest và build Docker image khi push vào nhánh main",
        "default_deadline": "thứ Sáu tuần này",
        "category": "devops",
    },
    {
        "action": "triển khai Nginx reverse proxy kèm SSL Let's Encrypt",
        "detail": "bảo mật kết nối MinIO S3 storage và WebSocket server",
        "default_deadline": "trước 12h trưa mai",
        "category": "devops",
    },
    {
        "action": "thiết lập monitoring Prometheus và Grafana",
        "detail": "theo dõi GPU memory usage, latency suy luận Whisper và CPU load",
        "default_deadline": "thứ Hai tuần sau",
        "category": "devops",
    },
    {
        "action": "viết Docker Compose production profile",
        "detail": "cấu hình health check, restart policy và volume persistence cho Postgres",
        "default_deadline": "cuối tuần",
        "category": "devops",
    },
    {
        "action": "tối ưu hóa tài nguyên GPU server",
        "detail": "cấu hình NVIDIA Container Toolkit và giới hạn VRAM per container",
        "default_deadline": "thứ Tư",
        "category": "devops",
    },
    # AI & Speech Pipeline
    {
        "action": "nghiên cứu mô hình ECAPA-TDNN cho diarization",
        "detail": "viết script trích xuất vector 192 chiều và so khớp Cosine Distance với Voicebank",
        "default_deadline": "cuối sprint",
        "category": "ai",
    },
    {
        "action": "huấn luyện QLoRA cho Qwen2.5-3B",
        "detail": "tinh chỉnh adapter 4-bit NF4 trên tập dữ liệu meeting action items tiếng Việt",
        "default_deadline": "tối thứ Năm",
        "category": "ai",
    },
    {
        "action": "tối ưu ngưỡng VAD trong Silero ONNX",
        "detail": "cắt bỏ khoảng lặng chính xác hơn và loại bỏ tiếng thở khi ghi âm",
        "default_deadline": "trước 15h ngày mai",
        "category": "ai",
    },
    {
        "action": "triển khai giải mã âm thanh in-memory bằng PyAV",
        "detail": "hỗ trợ nạp trực tiếp file MP3, M4A, WebM về 16kHz float32 không qua đĩa cứng",
        "default_deadline": "sáng thứ Sáu",
        "category": "ai",
    },
    {
        "action": "thực hiện RL alignment với thuật toán GRPO",
        "detail": "xây dựng rule-based reward verifier phạt hallucination và thưởng định dạng JSON",
        "default_deadline": "thứ Bảy tuần này",
        "category": "ai",
    },
    # QA & Testing
    {
        "action": "viết bộ unit test cho use case họp offline",
        "detail": "mock đầy đủ các repository và kiểm thử tính đúng đắn của pipeline trích xuất",
        "default_deadline": "trước 17h thứ Tư",
        "category": "qa",
    },
    {
        "action": "kiểm thử tải mô phỏng WebSocket với Locust",
        "detail": "đo độ trễ khi có 50 phòng họp stream audio đồng thời",
        "default_deadline": "thứ Sáu",
        "category": "qa",
    },
    {
        "action": "kiểm tra bảo mật và quét lỗ hổng phụ thuộc",
        "detail": "dùng Bandit và Trivy quét container image trước khi release",
        "default_deadline": "đầu tuần sau",
        "category": "qa",
    },
    {
        "action": "viết test E2E Playwright cho luồng tạo cuộc họp",
        "detail": "kiểm tra từ bước đăng nhập, tạo meeting đến khi hiển thị biên bản",
        "default_deadline": "thứ Năm",
        "category": "qa",
    },
    # Extension & Integration
    {
        "action": "sửa lỗi CORS và CSP trên Chrome Extension",
        "detail": "thêm quyền tabCapture vào manifest.json và fix kết nối WebSocket qua WSS",
        "default_deadline": "trước 15h chiều nay",
        "category": "extension",
    },
    {
        "action": "tích hợp webhook thông báo Zalo Official Account",
        "detail": "tự động gửi tin nhắn kèm sticker nhắc việc khi sắp đến hạn deadline",
        "default_deadline": "thứ Sáu",
        "category": "extension",
    },
    {
        "action": "viết Discord Bot reminder",
        "detail": "gửi danh sách task tồn đọng mỗi sáng 8h vào kênh chung của team",
        "default_deadline": "thứ Hai tới",
        "category": "extension",
    },
    {
        "action": "cập nhật tài liệu Privacy Policy cho Extension",
        "detail": "bổ sung cam kết không lưu dữ liệu giọng nói trái phép để gửi Google xét duyệt",
        "default_deadline": "12h trưa mai",
        "category": "extension",
    },
    # Mobile & Multi-platform
    {
        "action": "tối ưu hóa giao diện mobile web trên Safari iOS",
        "detail": "sửa lỗi thanh scroll bị nhảy và lỗi quyền micro trên thiết bị di động",
        "default_deadline": "thứ Năm",
        "category": "mobile",
    },
    {
        "action": "tích hợp Web Share API",
        "detail": "cho phép xuất báo cáo tóm tắt cuộc họp sang định dạng PDF và chia sẻ nhanh",
        "default_deadline": "cuối tuần",
        "category": "mobile",
    },
    # Database & Storage
    {
        "action": "cấu hình auto vacuum và connection pooling cho PostgreSQL",
        "detail": "dùng PgBouncer để quản lý pool kết nối khi tải cao",
        "default_deadline": "thứ Tư",
        "category": "database",
    },
    {
        "action": "thiết lập cơ chế backup định kỳ cho MinIO",
        "detail": "viết script sync dữ liệu audio asset sang ổ cứng lưu trữ phụ hàng ngày",
        "default_deadline": "thứ Bảy",
        "category": "database",
    },
    {
        "action": "chuẩn hóa dữ liệu log bằng cấu trúc JSON với Loguru",
        "detail": "bổ sung trace_id trên từng request để dễ dàng debug trên hệ thống tập trung",
        "default_deadline": "thứ Hai tuần sau",
        "category": "backend",
    },
    {
        "action": "viết benchmark đo lường WER và RTF",
        "detail": "so sánh tốc độ phiên âm giữa Whisper float16 và int8 trên GPU V100",
        "default_deadline": "tối thứ Sáu",
        "category": "ai",
    },
    {
        "action": "sửa lỗi memory leak trên Redis cache worker",
        "detail": "đặt TTL hợp lý cho các ticket xác thực phiên âm stream",
        "default_deadline": "trước 17h ngày mai",
        "category": "backend",
    },
    {
        "action": "nâng cấp thư viện TanStack Query lên v5.60",
        "detail": "chuyển đổi cú pháp useQuery mới và tối ưu cơ chế optimistic update cho task status",
        "default_deadline": "thứ Năm tuần này",
        "category": "frontend",
    },
    {
        "action": "triển khai tính năng lọc task theo nhiều người phụ trách",
        "detail": "cập nhật API query và filter bar trên trang quản lý công việc",
        "default_deadline": "cuối sprint",
        "category": "backend",
    },
    {
        "action": "bổ sung tính năng đổi nhãn diễn giả trực tiếp",
        "detail": "cho phép người dùng gán lại tên người nói khi AI nhận diện nhầm và lưu lại vector",
        "default_deadline": "trước 18h ngày mai",
        "category": "frontend",
    },
    {
        "action": "chuẩn hóa tài liệu API theo tiêu chuẩn OpenAPI / Swagger",
        "detail": "viết mô tả chi tiết cho từng endpoint trong router offline-meetings",
        "default_deadline": "thứ Sáu này",
        "category": "backend",
    },
]

# 12 Completely Disjoint Validation Scenarios (Zero Data Leakage)
VAL_SCENARIOS = [
    {
        "action": "nghiên cứu tích hợp mô hình tóm tắt văn bản ViT5",
        "detail": "viết pipeline fine-tune ViT5-base để sinh tóm tắt executive summary từ transcript dài",
        "default_deadline": "thứ Tư tuần tới",
        "category": "ai_unseen",
    },
    {
        "action": "triển khai OpenTelemetry tracing",
        "detail": "gắn trace span vào middleware FastAPI để đo chính xác thời gian qua từng microservice",
        "default_deadline": "thứ Sáu tuần sau",
        "category": "devops_unseen",
    },
    {
        "action": "viết script benchmark load k6 cho WebSocket",
        "detail": "giả lập 200 client kết nối audio stream đồng thời và ghi nhận tỷ lệ mất gói",
        "default_deadline": "trước 16h thứ Năm",
        "category": "qa_unseen",
    },
    {
        "action": "triển khai xác thực 2 lớp TOTP",
        "detail": "tạo QR code và xác minh mã OTP 6 số qua Google Authenticator cho tài khoản admin",
        "default_deadline": "cuối sprint tới",
        "category": "security_unseen",
    },
    {
        "action": "thiết lập cơ chế Data Retention và tự động nén log",
        "detail": "viết cronjob xóa các file audio tạm sau 30 ngày để tiết kiệm dung lượng đĩa cứng",
        "default_deadline": "thứ Hai tuần tới",
        "category": "database_unseen",
    },
    {
        "action": "nghiên cứu thư viện WebRTC Native C++",
        "detail": "thử nghiệm capture âm thanh trực tiếp từ card âm thanh không phụ thuộc trình duyệt",
        "default_deadline": "cuối tháng này",
        "category": "core_unseen",
    },
    {
        "action": "xây dựng tính năng xuất biên bản họp ra file Word docx",
        "detail": "dùng thư viện python-docx định dạng bảng biểu action items và logo công ty",
        "default_deadline": "trước 12h thứ Sáu",
        "category": "feature_unseen",
    },
    {
        "action": "cấu hình rate limit bằng Token Bucket trên Redis",
        "detail": "chống spam request vào endpoint tải file ghi âm cuộc họp",
        "default_deadline": "thứ Ba tới",
        "category": "security_unseen",
    },
    {
        "action": "tối ưu dung lượng Docker image bằng multi-stage build",
        "detail": "chuyển sang base image Alpine và dọn dẹp cache pip để giảm kích thước xuống dưới 200MB",
        "default_deadline": "trước 17h ngày mai",
        "category": "devops_unseen",
    },
    {
        "action": "viết migration chuyển đổi cột id sang UUIDv7",
        "detail": "đảm bảo tính sắp xếp theo thời gian và tăng hiệu năng index B-Tree",
        "default_deadline": "thứ Năm tuần tới",
        "category": "database_unseen",
    },
    {
        "action": "xây dựng giao diện xem phổ âm thanh Spectrogram",
        "detail": "dùng Web Audio API và HTML5 Canvas để visualize tần số giọng nói người phát biểu",
        "default_deadline": "cuối tuần sau",
        "category": "frontend_unseen",
    },
    {
        "action": "kiểm thử bảo mật chống lỗ hổng SQL Injection và XSS",
        "detail": "dùng OWASP ZAP scan toàn bộ các form nhập liệu và báo cáo nguy cơ",
        "default_deadline": "thứ Hai tuần sau",
        "category": "security_unseen",
    },
]


def format_ms_to_time(ms: int) -> str:
    total_sec = ms // 1000
    m = total_sec // 60
    s = total_sec % 60
    return f"{m:02d}:{s:02d}"


def create_dialogue_sample(scenario: dict, members: list[str], is_val: bool = False) -> dict:
    """
    Creates a highly natural, varied dialogue sample using 10 different conversational patterns.
    """
    action = scenario["action"]
    detail = scenario["detail"]
    deadline = scenario["default_deadline"]

    # Pick 2-4 participants for this conversation
    participants = random.sample(members, k=random.randint(2, 4))
    requester = participants[0]
    candidate1 = participants[1]
    candidate2 = participants[2] if len(participants) > 2 else candidate1

    start_sec = random.randint(60, 2400)
    t0_ms = start_sec * 1000
    t1_ms = t0_ms + random.randint(8000, 18000)
    t2_ms = t1_ms + random.randint(8000, 16000)
    t3_ms = t2_ms + random.randint(8000, 15000)

    # Patterns: 1..8 are Actionable, 9..10 are Negative (no action item)
    pattern_type = random.choice([
        "direct_delegate",
        "volunteer",
        "rejection_handoff",
        "self_initiative",
        "multi_turn_negotiate",
        "manager_wrapup",
        "two_tasks_split",
        "negative_chit_chat",
        "negative_deferred",
    ])

    lines = []
    tasks = []

    if pattern_type == "direct_delegate":
        # Requester directly delegates to candidate1, candidate1 agrees
        templates_req = [
            f"[{format_ms_to_time(t0_ms)}] {requester}: {candidate1} ơi, phụ trách giúp team vụ {action} nhé, cụ thể là {detail}. Cần xong {deadline}.",
            f"[{format_ms_to_time(t0_ms)}] {requester}: Về phần {action}, anh nhờ {candidate1} xử lý ({detail}). Em chốt kịp {deadline} không?",
            f"[{format_ms_to_time(t0_ms)}] {requester}: {candidate1} gánh việc {action} giúp team với. Nhớ để ý {detail} nhé. Hạn là {deadline}.",
        ]
        templates_ack = [
            f"[{format_ms_to_time(t1_ms)}] {candidate1}: Dạ vâng anh {requester}, em nhận việc này, {deadline} em push code lên git.",
            f"[{format_ms_to_time(t1_ms)}] {candidate1}: Vâng anh, phần này em đang nắm rồi, em sẽ hoàn thành đúng {deadline}.",
            f"[{format_ms_to_time(t1_ms)}] {candidate1}: Ok anh {requester}, em chốt làm vụ {action}, {deadline} em tạo pull request.",
        ]
        lines = [random.choice(templates_req), random.choice(templates_ack)]
        tasks = [
            {
                "task_title": f"{action.capitalize()} ({detail})",
                "assignee": candidate1,
                "deadline": deadline,
                "source_timestamp_ms": t0_ms,
                "confidence": round(random.uniform(0.93, 0.98), 2),
            }
        ]

    elif pattern_type == "volunteer":
        # Requester asks open question, candidate1 volunteers
        templates_req = [
            f"[{format_ms_to_time(t0_ms)}] {requester}: Phần {action} đang bị nghẽn, cụ thể cần {detail}. Ai trong team nhận được phần này trước {deadline} không?",
            f"[{format_ms_to_time(t0_ms)}] {requester}: Team mình ai rảnh nhận làm {action} ({detail}) giúp em với, cần chốt vào {deadline} nhé.",
        ]
        templates_vol = [
            f"[{format_ms_to_time(t1_ms)}] {candidate1}: Để em nhận cho anh {requester}. Em đang quen luồng này rồi, {deadline} em nộp bản hoàn chỉnh.",
            f"[{format_ms_to_time(t1_ms)}] {candidate1}: Phần này để tôi nhận cho cả nhà. {deadline} tôi commit lên repo nhé.",
        ]
        lines = [random.choice(templates_req), random.choice(templates_vol)]
        tasks = [
            {
                "task_title": f"{action.capitalize()} ({detail})",
                "assignee": candidate1,
                "deadline": deadline,
                "source_timestamp_ms": t1_ms,
                "confidence": round(random.uniform(0.94, 0.98), 2),
            }
        ]

    elif pattern_type == "rejection_handoff":
        # Requester asks candidate1 -> candidate1 refuses -> candidate2 steps in!
        # Tests CRITICAL anti-confusion capability (candidate2 is assignee, NOT candidate1)
        lines = [
            f"[{format_ms_to_time(t0_ms)}] {requester}: {candidate1} ơi, làm giúp anh vụ {action} ({detail}) trước {deadline} được không?",
            f"[{format_ms_to_time(t1_ms)}] {candidate1}: Dạ anh {requester} ơi, em đang kẹt deadline gấp bên module khác rồi, sợ không kịp đâu ạ.",
            f"[{format_ms_to_time(t2_ms)}] {requester}: Căng nhỉ, vậy {candidate2} xem gánh đỡ bạn task {action} này được không em?",
            f"[{format_ms_to_time(t3_ms)}] {candidate2}: Dạ được anh {requester}, em vừa xong việc bên kia rồi. Để em làm {detail}, {deadline} em giao.",
        ]
        tasks = [
            {
                "task_title": f"{action.capitalize()} ({detail})",
                "assignee": candidate2,
                "deadline": deadline,
                "source_timestamp_ms": t2_ms,
                "confidence": round(random.uniform(0.92, 0.97), 2),
            }
        ]

    elif pattern_type == "self_initiative":
        # Candidate1 discovers an issue and commits to fixing it self-motivated
        lines = [
            f"[{format_ms_to_time(t0_ms)}] {candidate1}: Mọi người ơi, em vừa kiểm tra thấy {detail}. Vấn đề này có thể ảnh hưởng hệ thống.",
            f"[{format_ms_to_time(t1_ms)}] {requester}: Chuẩn đấy em, lỗi này cần ưu tiên xử lý gấp.",
            f"[{format_ms_to_time(t2_ms)}] {candidate1}: Vâng, để em chủ động {action} luôn, {deadline} em giải quyết dứt điểm.",
        ]
        tasks = [
            {
                "task_title": f"{action.capitalize()} ({detail})",
                "assignee": candidate1,
                "deadline": deadline,
                "source_timestamp_ms": t2_ms,
                "confidence": round(random.uniform(0.94, 0.98), 2),
            }
        ]

    elif pattern_type == "multi_turn_negotiate":
        # Deadline negotiation: Requester wants today, assignee negotiates deadline
        negotiated_deadline = "thứ Sáu tuần này" if "mai" in deadline else "thứ Hai tuần sau"
        lines = [
            f"[{format_ms_to_time(t0_ms)}] {requester}: {candidate1} xem làm ngay vụ {action} ({detail}) chiều nay xong luôn được không?",
            f"[{format_ms_to_time(t1_ms)}] {candidate1}: Chiều nay gấp quá anh ơi, em cần test kỹ lại case edge nữa. Cho em dời sang {negotiated_deadline} nhé.",
            f"[{format_ms_to_time(t2_ms)}] {requester}: Ừ vậy cũng được, nhớ đảm bảo chất lượng, chốt {negotiated_deadline} nhé.",
            f"[{format_ms_to_time(t3_ms)}] {candidate1}: Dạ rõ anh, em ghi nhận.",
        ]
        tasks = [
            {
                "task_title": f"{action.capitalize()} ({detail})",
                "assignee": candidate1,
                "deadline": negotiated_deadline,
                "source_timestamp_ms": t0_ms,
                "confidence": round(random.uniform(0.91, 0.96), 2),
            }
        ]

    elif pattern_type == "two_tasks_split":
        # Two distinct tasks assigned in the same meeting turn
        other_scenario = random.choice(VAL_SCENARIOS if is_val else TRAIN_SCENARIOS)
        lines = [
            f"[{format_ms_to_time(t0_ms)}] {requester}: Cuộc họp hôm nay chúng ta có 2 đầu việc cần chốt:\n"
            f"- Thứ nhất, nhờ {candidate1} {action} ({detail}), hạn là {deadline}.\n"
            f"- Thứ hai, nhờ {candidate2} {other_scenario['action']} ({other_scenario['detail']}), hạn là {other_scenario['default_deadline']}.",
            f"[{format_ms_to_time(t1_ms)}] {candidate1}: Em nhận phần {action}, {deadline} em xong.",
            f"[{format_ms_to_time(t2_ms)}] {candidate2}: Em nhận phần {other_scenario['action']}, đúng {other_scenario['default_deadline']} em nộp PR.",
        ]
        tasks = [
            {
                "task_title": f"{action.capitalize()} ({detail})",
                "assignee": candidate1,
                "deadline": deadline,
                "source_timestamp_ms": t0_ms,
                "confidence": round(random.uniform(0.93, 0.98), 2),
            },
            {
                "task_title": f"{other_scenario['action'].capitalize()} ({other_scenario['detail']})",
                "assignee": candidate2,
                "deadline": other_scenario["default_deadline"],
                "source_timestamp_ms": t0_ms,
                "confidence": round(random.uniform(0.93, 0.98), 2),
            },
        ]

    elif pattern_type == "manager_wrapup":
        # Recap / summary at the end of meeting
        lines = [
            f"[{format_ms_to_time(t0_ms)}] {requester}: Tóm lại buổi họp hôm nay, thống nhất giao cho {candidate1} phụ trách {action} ({detail}), hoàn thành {deadline} nhé.",
            f"[{format_ms_to_time(t1_ms)}] {candidate1}: Dạ vâng em xác nhận, em sẽ cập nhật tiến độ lên Jira.",
        ]
        tasks = [
            {
                "task_title": f"{action.capitalize()} ({detail})",
                "assignee": candidate1,
                "deadline": deadline,
                "source_timestamp_ms": t0_ms,
                "confidence": round(random.uniform(0.95, 0.99), 2),
            }
        ]

    elif pattern_type == "negative_chit_chat":
        # Pure technical debate with no action item committed (Negative sample)
        lines = [
            f"[{format_ms_to_time(t0_ms)}] {requester}: Mọi người thấy giải pháp {action} ({detail}) hiện tại thế nào, có cần đổi công nghệ không?",
            f"[{format_ms_to_time(t1_ms)}] {candidate1}: Em thấy hiện tại hệ thống chạy vẫn rất ổn định, tạm thời chưa phát sinh lỗi gì nghiêm trọng.",
            f"[{format_ms_to_time(t2_ms)}] {candidate2}: Đúng rồi anh, giữ nguyên kiến trúc cũ đi, khi nào có lượng người dùng tăng đột biến thì hãy tính.",
            f"[{format_ms_to_time(t3_ms)}] {requester}: Nhất trí, vậy giữ nguyên hiện trạng nhé.",
        ]
        tasks = []

    elif pattern_type == "negative_deferred":
        # Task proposed but officially rejected or deferred to next quarter (Negative sample)
        lines = [
            f"[{format_ms_to_time(t0_ms)}] {requester}: Có cần {candidate1} làm thêm vụ {action} luôn trong sprint này không?",
            f"[{format_ms_to_time(t1_ms)}] {candidate1}: Sprint này mình ưu tiên hoàn thiện tính năng core trước đã anh.",
            f"[{format_ms_to_time(t2_ms)}] {requester}: Ok em, vậy phần {action} này tạm thời hủy/dời lại nhé, không làm đợt này.",
        ]
        tasks = []

    transcript_text = "\n".join(lines)
    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Biên bản cuộc họp:\n{transcript_text}"},
            {
                "role": "assistant",
                "content": json.dumps(tasks, ensure_ascii=False, indent=2),
            },
        ]
    }


def generate_full_dataset(train_count: int = 1080, val_count: int = 120):
    """
    Generates training and validation sets with zero overlap in technical scenarios.
    """
    random.seed(42)

    train_samples = []
    print(f"Generating {train_count} diverse training samples from {len(TRAIN_SCENARIOS)} scenarios...")
    for _ in range(train_count):
        scenario = random.choice(TRAIN_SCENARIOS)
        sample = create_dialogue_sample(scenario, TEAM_MEMBERS, is_val=False)
        train_samples.append(sample)

    val_samples = []
    print(f"Generating {val_count} unseen validation samples from {len(VAL_SCENARIOS)} disjoint scenarios...")
    for _ in range(val_count):
        scenario = random.choice(VAL_SCENARIOS)
        sample = create_dialogue_sample(scenario, TEAM_MEMBERS, is_val=True)
        val_samples.append(sample)

    random.shuffle(train_samples)
    random.shuffle(val_samples)

    return train_samples, val_samples


def main():
    output_dir = Path(__file__).resolve().parent / "data"
    output_dir.mkdir(parents=True, exist_ok=True)

    train_data, val_data = generate_full_dataset(train_count=1080, val_count=120)

    train_path = output_dir / "dataset_tasks_train.jsonl"
    val_path = output_dir / "dataset_tasks_val.jsonl"

    with open(train_path, "w", encoding="utf-8") as f:
        f.writelines(json.dumps(item, ensure_ascii=False) + "\n" for item in train_data)

    with open(val_path, "w", encoding="utf-8") as f:
        f.writelines(json.dumps(item, ensure_ascii=False) + "\n" for item in val_data)

    print("\n✅ DATASET RE-GENERATED SUCCESSFULLY WITH ZERO LEAKAGE!")
    print(f" - Train set: {len(train_data)} samples -> {train_path}")
    print(f" - Validation set (UNSEEN DOMAINS): {len(val_data)} samples -> {val_path}")


if __name__ == "__main__":
    main()

# KỊCH BẢN THUYẾT TRÌNH VIDEO 5 PHÚT: DỰ ÁN MEETLY
**Hệ Sinh Thái Biên Bản Cuộc Họp Thông Minh & Tự Động Phân Công Công Việc Bằng AI**
*Thời lượng tối đa: 05 phút 00 giây — Định dạng: Video Demo & Pitching Cuộc thi AI / Đồ án*

---

## BẢNG PHÂN BỔ THỜI LƯỢNG 5 PHÚT (TIMELINE OVERVIEW)

| Phần | Nội dung thuyết trình theo mẫu chuẩn | Thời lượng | Mốc thời gian |
| :---: | :--- | :---: | :---: |
| **1** | Bài toán hoặc vấn đề thực tiễn cần giải quyết | 35 giây | `00:00 – 00:35` |
| **2** | Mục tiêu, phạm vi và đối tượng ứng dụng của sản phẩm | 25 giây | `00:35 – 01:00` |
| **3** | Mô tả các chức năng hệ thống | 40 giây | `01:00 – 01:40` |
| **4** | So sánh với mô hình cơ sở & Phân tích đóng góp hệ thống | 30 giây | `01:40 – 02:10` |
| **5** | Thuật toán, mô hình và công cụ AI được sử dụng | 40 giây | `02:10 – 02:50` |
| **6** | Quy trình huấn luyện, tinh chỉnh (SFT + GRPO) & Khai thác | 45 giây | `02:50 – 03:35` |
| **7** | Chỉ số, phương pháp và tiêu chí đánh giá kết quả | 25 giây | `03:35 – 04:00` |
| **8** | Kết quả thử nghiệm thực tế (Benchmark & Live Demo) | 35 giây | `04:00 – 04:35` |
| **9** | Kiến trúc hệ thống và Phương án triển khai | 25 giây | `04:35 – 05:00` |

---

## KỊCH BẢN CHI TIẾT TỪNG PHÚT (WORD-FOR-WORD SCRIPT)

### PHẦN 1: Bài toán hoặc vấn đề thực tiễn cần giải quyết (00:00 – 00:35 | 35s)
* **Hình ảnh trên video:** Quay cảnh người dùng tham gia cuộc họp online dài 1 tiếng; sau cuộc họp không ai nhớ ai phải làm gì, biên bản họp viết tay sơ sài, thất lạc task.
* **Lời thuyết trình (Voice-over):**
  > "Kính thưa Ban giám khảo và các bạn, trong thời đại làm việc số hóa và làm việc từ xa, trung bình một kỹ sư hoặc nhà quản lý phải tham gia từ 10 đến 15 cuộc họp mỗi tuần. Tuy nhiên, một thực tế nhức nhối là **hơn 70% các kết luận và phân công công việc sau cuộc họp bị lãng quên hoặc trôi đi** do việc ghi chép biên bản thủ công mất quá nhiều thời gian và thiếu đồng bộ.
  > Các công cụ hiện có trên thị trường như Otter.ai hay FPT.AI hầu như chỉ dừng lại ở mức bóc băng âm thanh thành văn bản thô, chưa hiểu được ngữ cảnh phân công công việc, và hoàn toàn tách rời khỏi hệ thống quản lý công việc của phòng ban. Đây chính là động lực để chúng em phát triển **Meetly**."

---

### PHẦN 2: Mục tiêu, phạm vi và đối tượng ứng dụng (00:35 – 01:00 | 25s)
* **Hình ảnh trên video:** Hiện logo Meetly với slogan: *"From Spoken Words to Actionable Tasks"*. Chuyển cảnh hiển thị giao diện đa nền tảng (Web app, Chrome Extension).
* **Lời thuyết trình (Voice-over):**
  > "**Mục tiêu của Meetly** là xây dựng một nền tảng all-in-one khép kín: Tự động ghi âm, định danh chính xác người phát biểu, tóm tắt biên bản họp, và **tự động bóc tách từng nhiệm vụ cụ thể để đẩy thẳng lên bảng việc Kanban của phòng ban**.
  > **Phạm vi & Đối tượng phục vụ:** Các doanh nghiệp phần mềm, nhóm khởi nghiệp công nghệ, phòng ban vận hành và các tổ chức giáo dục thường xuyên họp trên Google Meet, Discord hoặc phòng họp trực tiếp."

---

### PHẦN 3: Mô tả các chức năng hệ thống (01:00 – 01:40 | 40s)
* **Hình ảnh trên video:** Video màn hình thực tế: Bấm thu âm trên Extension -> Tải lên Meetly -> Âm thanh phát sóng âm Waveform -> Xuất hiện transcript -> Nút "Đồng bộ Việc phòng ban" -> Bảng Kanban tự nhảy task.
* **Lời thuyết trình (Voice-over):**
  > "Hệ thống Meetly sở hữu 4 trụ cột chức năng vượt trội:
  > * **Thứ nhất — Thu thập âm thanh đa kênh:** Ghi âm trực tiếp qua Chrome Extension trên Google Meet, bot Discord, hoặc tải lên file âm thanh cuộc họp offline.
  > * **Thứ hai — Trình phát Timeline thông minh:** Đồng bộ hóa âm thanh với từng câu hội thoại, cho phép nhấp vào bất kỳ đoạn transcript nào để nghe lại đúng mốc âm thanh đó.
  > * **Thứ ba — Định danh giọng nói Centroid Voicebank:** Nhận diện đích danh từng thành viên phòng ban thay vì các nhãn vô danh 'Speaker 1', 'Speaker 2'.
  > * **Thứ tư — Trích xuất & Đồng bộ việc tự động:** Mô hình AI phân tích cuộc họp, tìm ra ai làm việc gì, hạn chót khi nào, và tự động tạo thẻ việc lên bảng Việc phòng ban với cơ chế UPSERT thông minh."

---

### PHẦN 4: So sánh với mô hình cơ sở & Phân tích đóng góp (01:40 – 02:10 | 30s)
* **Hình ảnh trên video:** Bảng so sánh 3 cột: Phương pháp truyền thống vs Mô hình AI thông thường vs Meetly.
* **Lời thuyết trình (Voice-over):**
  > "So với các giải pháp truyền thống và mô hình cơ sở:
  > * **Với ASR thông thường:** Whisper bản gốc gặp lỗi rất nặng khi gặp từ mượn CNTT tiếng Anh chêm xen tiếng Việt (*Code-switching*) với tỷ lệ lỗi từ lên tới 24.8%. Meetly đã giải quyết triệt để vấn đề này, đưa tỷ lệ lỗi xuống chỉ còn **7.5%**.
  > * **Với các LLM tổng quát:** Khi yêu cầu trích xuất việc, các LLM như GPT-3.5 hay Qwen gốc thường nhầm lẫn giữa người giao việc và người làm việc, và tự bịa ra các công việc ảo (*Hallucination* ~10%). Meetly với quy trình căn chỉnh đặc thù đã giảm tỷ lệ ảo giác xuống chỉ còn **3.1%**."

---

### PHẦN 5: Thuật toán, mô hình và công cụ AI được sử dụng (02:10 – 02:50 | 40s)
* **Hình ảnh trên video:** Sơ đồ luồng AI: Faster-Whisper Large-v3 (128 Mel channels) -> Centroid Voicebank 192-dim -> Qwen2.5-3B Instruct (4-bit NF4).
* **Lời thuyết trình (Voice-over):**
  > "Để đạt được hiệu năng cao trên tài nguyên tối ưu, Meetly kết hợp cụm công nghệ AI SOTA:
  > 1. **Nhận dạng giọng nói ASR:** Mô hình **Whisper Large-v3** chạy trên nền tảng **CTranslate2**, sử dụng 128 dải Mel filterbanks giải mã tốc độ cao đạt Real-Time Factor 0.14x.
  > 2. **Định danh người nói (Voicebank Matching):** Sử dụng mạng trích xuất đặc trưng âm học 192 chiều, tính toán khoảng cách Cosine với vector trung tâm Centroid của từng thành viên.
  > 3. **Bộ xử lý hậu kỳ tiếng Việt:** Chuẩn hóa Unicode, triệt tiêu chữ Hán cổ lọt vào transcript và khử lỗi phát âm địa phương.
  > 4. **Trích xuất thông tin:** Sử dụng mô hình ngôn ngữ **Qwen2.5-3B-Instruct**, được lượng tử hóa 4-bit NormalFloat (*NF4*) vận hành chỉ với 3.2 GB VRAM."

---

### PHẦN 6: Quy trình huấn luyện, tinh chỉnh & Khai thác mô hình (02:50 – 03:35 | 45s)
* **Hình ảnh trên video:** Hình ảnh mô phỏng quá trình huấn luyện QLoRA và sơ đồ thuật toán GRPO (Group Relative Policy Optimization) không cần mô hình Critic.
* **Lời thuyết trình (Voice-over):**
  > "Quy trình huấn luyện và tối ưu hóa của nhóm được tiến hành qua 3 giai đoạn bài bản:
  > * **Giai đoạn 1 — Tinh chỉnh ASR:** Áp dụng **LoRA 8-bit** trên Whisper Large-v3 với tập dữ liệu hội thoại kỹ thuật tiếng Việt, tập trung thích ứng trên các tầng Attention projection.
  > * **Giai đoạn 2 — Domain SFT trên Qwen2.5-3B:** Tinh chỉnh có giám sát bằng **QLoRA 4-bit** trên tập 1,200 mẫu hội thoại có cấu trúc chuỗi suy luận (*Chain-of-Thought*).
  > * **Giai đoạn 3 — Căn chỉnh Học tăng cường GRPO:** Đây là điểm sáng học thuật của dự án. Nhóm áp dụng thuật toán **Group Relative Policy Optimization (GRPO)** kết hợp 3 hàm thưởng quy tắc (*Rule-based Verifiers*): Thưởng định dạng JSON chuẩn, Thưởng độ chính xác thực thể thành viên, và Phạt nặng các công việc bị ảo giác. Phương pháp này giúp mô hình đạt độ chuẩn xác vượt bậc mà **không cần duy trì mô hình Critic riêng**, tiết kiệm 50% tài nguyên VRAM."

---

### PHẦN 7: Chỉ số & Tiêu chí đánh giá kết quả (03:35 – 04:00 | 25s)
* **Hình ảnh trên video:** Đồ thị chỉ số WER, F1-score và bảng đo kiểm thực nghiệm.
* **Lời thuyết trình (Voice-over):**
  > "Nhóm đo lường chất lượng hệ thống bằng các chỉ số chuẩn mực quốc tế:
  > * Đối với nhận dạng tiếng nói: Sử dụng **Word Error Rate (WER)** và **Character Error Rate (CER)** chia theo tập từ thuần Việt và từ mượn CNTT.
  > * Đối với trích xuất công việc: Đánh giá bằng **F1-Score** trên 3 thành phần cốt lõi: Tên công việc (Title), Người thực hiện (Assignee), và Hạn chót (Deadline), kết hợp đo lường **Tỷ lệ Ảo giác (Hallucination Rate)** và **Thời gian phản hồi (Latency)**."

---

### PHẦN 8: Kết quả thử nghiệm & Thực chứng (04:00 – 04:35 | 35s)
* **Hình ảnh trên video:** Chiếu bảng số liệu thực nghiệm benchmark. Quay nhanh kết quả màn hình test thực tế: Audio 30 giây -> Trích xuất chính xác 5 task -> Phân công đúng Tú, Minh.
* **Lời thuyết trình (Voice-over):**
  > "Kết quả thực nghiệm trên tập kiểm định độc lập khẳng định sự vượt trội của Meetly:
  > * **Độ chính xác trích xuất nhiệm vụ tổng thể (Overall Task F1)** tăng từ **68.3% lên 89.4%**, trong đó độ chính xác nhận diện người nhận việc đạt **88.5%**.
  > * **Tỷ lệ lỗi từ ASR (WER)** trên các câu chêm xen tiếng Anh giảm mạnh từ **24.8% xuống chỉ còn 7.5%**.
  > * Thời gian trích xuất trung bình cho một cuộc họp chỉ mất **2.1 giây**.
  > Trong thử nghiệm thực tế với cuộc họp test của nhóm, hệ thống đã phân tách chính xác câu nói phức hợp, tự động tạo 5 công việc và gán chuẩn xác cho cả hai thành viên Tú và Minh."

---

### PHẦN 9: Kiến trúc hệ thống & Phương án triển khai (04:35 – 05:00 | 25s)
* **Hình ảnh trên video:** Sơ đồ tổng thể kiến trúc: Next.js 14 -> FastAPI Modular Monolith (PostgreSQL, Dishka DI) -> GPU Server Tesla V100. Hiện lời kết và thông tin liên hệ.
* **Lời thuyết trình (Voice-over):**
  > "Về mặt kỹ thuật phần mềm, Meetly được thiết kế theo kiến trúc **Modular Monolith** chuẩn Clean Architecture: Backend FastAPI với Dishka Dependency Injection, Frontend Next.js 14 App Router, cơ sở dữ liệu PostgreSQL và cụm microservice suy luận AI trên GPU Server Tesla V100.
  > Giải pháp sẵn sàng triển khai tại chỗ (*On-Premise*) cho các doanh nghiệp có yêu cầu bảo mật cao, hoặc triển khai Cloud SaaS linh hoạt.
  > **Meetly — Biến mọi cuộc họp thành hành động thực tế.** Xin trân trọng cảm ơn Ban giám khảo!"

---

## MẸO QUAY VIDEO & DEMO ĐẠT ĐIỂM TỐI ĐA (PRO TIPS)

1. **Chuẩn bị màn hình Demo chia đôi (Split screen):**
   * Nửa trái màn hình: File ghi âm đang phát và sóng âm chạy trên giao diện Meetly.
   * Nửa phải màn hình: Bảng Việc phòng ban (Kanban) tự động cập nhật thẻ công việc mới tinh tế theo thời gian thực.
2. **Âm thanh giọng đọc:**
   * Giọng nói rõ ràng, dứt khoát, tự tin; bật nhạc nền nhẹ (lo-fi corporate tech) ở mức âm lượng 10-15%.
3. **Điểm nhấn cần nhấn giọng:**
   * *"Ủy quyền Whisper Large-v3 trên GPU"*, *"Centroid Voicebank"*, *"GRPO không cần Critic"*, *"Tỷ lệ lỗi từ giảm xuống 7.5%"*.

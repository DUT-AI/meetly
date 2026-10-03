# Meetly Demo Video Script
**Kịch Bản Demo & Hướng Dẫn Sử Dụng Tính Năng Hệ Thống Meetly**  
*Thời lượng: 3 – 4 phút | Định dạng: Screencast quay màn hình thực tế | Nhân vật cuộc họp mẫu: Quế Đình Anh Tú & Trường Bùi Diễn*

---

## 1. Dòng Chảy Trải Nghiệm Sản Phẩm (Demo Flow)

```
[Phần 1: Mở đầu tại Bảng điều khiển Dashboard]
        │ Giới thiệu tổng quan dự án & không gian làm việc của phòng ban
        ▼
[Phần 2: Khám phá Tab Cuộc họp & Hướng dẫn Tạo cuộc họp mới]
        │ Giới thiệu các tính năng quản lý cuộc họp ➔ Hướng dẫn tạo cuộc họp (Tú & Diễn)
        ▼
[Phần 3: Không gian chi tiết & Soạn thảo cuộc họp]
        │ Giới thiệu không gian làm việc ➔ Demo 2 phương thức: Tải tệp ghi âm & Streaming trực tiếp
        ▼
[Phần 4: Hội thoại chi tiết & Tự động định danh người nói]
        │ Xem danh sách câu nói gắn tên Tú & Diễn ➔ Bấm nghe câu nói đồng bộ sóng âm
        ▼
[Phần 5: Biên bản cuộc họp & Tự động phân chia Task]
        │ Trình soạn thảo văn bản thông minh ➔ Tóm tắt, Quyết định, Phân chia việc (Tú, Diễn)
        ▼
[Phần 6: 1-Click Đồng bộ việc sang Bảng Phòng Ban (Kanban Board)]
        │ Bấm "Đồng bộ Việc phòng ban" ➔ Xem thẻ việc tự động xuất hiện trên bảng Kanban
        ▼
[Phần 7: Kiểm chứng ngược câu nói gốc (Reverse Context)]
        │ Bấm mốc thời gian trên thẻ việc ➔ Tua lại đúng câu nói giao việc ban đầu
        ▼
[Phần 8: Tổng kết & Lời cảm ơn Quý Thầy Cô]
```

---

## 2. Kịch Bản Chi Tiết Từng Phần (Thao Tác Màn Hình & Lời Thuyết Minh)

---

### Phần 1 — Mở Đầu: Giới Thiệu Tại Giao Diện Dashboard
* **Thời lượng:** 25 giây.
* **Màn hình:** Màn hình Bảng điều khiển Meetly (`/workspaces/{workspaceId}/dashboard`).
* **Thao tác người quay:**
  1. Giữ chuột mượt mà trên giao diện Dashboard, rê nhẹ qua tên Không gian làm việc của phòng ban ở góc trái.
  2. Lướt chuột qua các thẻ thống kê tổng quan: Tổng số cuộc họp trong tuần, khối lượng công việc đang xử lý, và danh sách các thành viên trong nhóm.
  3. Cuộn nhẹ xuống khu vực lịch họp sắp tới để thầy cô thấy được bố cục khoa học, hiện đại.
* **Lời thuyết minh (Voice-over):**
  > *"Kính chào quý thầy cô! Hôm nay, em xin đại diện nhóm Meetly giới thiệu và demo các tính năng chính của hệ thống — nền tảng quản trị cuộc họp thông minh giúp chuyển hóa toàn diện nội dung trao đổi thành công việc cụ thể và có thể kiểm chứng.  
  > Hiện tại, chúng ta đang ở giao diện Bảng điều khiển trung tâm (Dashboard). Đây là nơi cung cấp cái nhìn tổng quan nhất cho cả nhóm: từ số lượng cuộc họp đã diễn ra, lịch trình sắp tới, cho đến tiến độ thực hiện các công việc của từng thành viên."*

---

### Phần 2 — Khám Phá Tab Cuộc Họp & Hướng Dẫn Tạo Cuộc Họp Mới
* **Thời lượng:** 40 giây.
* **Màn hình:** 
  1. Trang danh sách cuộc họp (`/workspaces/{workspaceId}/meetings`).
  2. Cửa sổ tạo cuộc họp mới (`CreateMeetingModal`).
* **Thao tác người quay:**
  1. Nhấp chuột vào mục **"Cuộc họp"** trên thanh điều hướng bên trái (Sidebar).
  2. Di chuột giới thiệu các tính năng trên trang danh sách:
     * Bộ lọc trạng thái cuộc họp (Đang diễn ra, Đã lên lịch, Đã hoàn thành).
     * Danh sách các cuộc họp với thông tin thời gian, người chủ trì và trạng thái biên bản.
  3. Bấm vào nút màu xanh **"Tạo cuộc họp"** ở góc trên bên phải màn hình.
  4. Cửa sổ thiết lập cuộc họp hiện lên, người quay lần lượt điền thông tin:
     * Nhập tiêu đề cuộc họp: *"Sprint Sync: Rà soát release phiên bản mới"*.
     * Chọn thời gian bắt đầu và kết thúc (ví dụ: sáng nay từ 09:00 đến 09:30).
     * Chọn thành viên tham gia: bấm chọn **Quế Đình Anh Tú** và **Trường Bùi Diễn**.
  5. Bấm nút xác nhận **"Tạo cuộc họp"** $\rightarrow$ Hệ thống khởi tạo thành công và tự động chuyển hướng màn hình vào thẳng không gian làm việc chi tiết của cuộc họp vừa tạo.
* **Lời thuyết minh (Voice-over):**
  > *"Tiếp theo, chúng ta sẽ chuyển sang tab 'Cuộc họp'.  
  > Đây là trung tâm quản lý toàn bộ các phiên họp của nhóm. Tại đây, thầy cô có thể theo dõi danh sách các cuộc họp đã hoàn thành, kiểm tra trạng thái biên bản tóm tắt, hoặc tìm kiếm lại nội dung cuộc họp cũ bất cứ lúc nào.  
  > Để khởi tạo một phiên họp mới, chúng ta chỉ cần bấm vào nút 'Tạo cuộc họp'. Sau đó, nhập tiêu đề cuộc họp, chọn thời gian bắt đầu, và thêm các thành viên tham dự — ở đây em thêm bạn Tú và bạn Diễn.  
  > Ngay khi bấm xác nhận, hệ thống sẽ tự động đưa chúng ta vào thẳng không gian làm việc và soạn thảo chi tiết của cuộc họp."*

---

### Phần 3 — Không Gian Chi Tiết Cuộc Họp & Các Cách Tiếp Nhận Âm Thanh
* **Thời lượng:** 40 giây.
* **Màn hình:** Giao diện chi tiết cuộc họp vừa tạo, hiển thị các khu vực làm việc và cửa sổ tải âm thanh (`OfflineAudioModal`).
* **Thao tác người quay:**
  1. Giới thiệu tổng quan bố cục không gian cuộc họp: Thanh phát âm thanh Timeline ở trên, các tab nội dung chính gồm **Hội thoại (Transcript)**, **Biên bản cuộc họp (Report)** và **Thành viên**.
  2. Chỉ chuột vào nút **"Họp trực tiếp / Streaming"** để giới thiệu phương thức thứ nhất: Tiếp nhận âm thanh trực tiếp khi cuộc họp đang diễn ra online.
  3. Bấm vào nút **"Họp Offline / Ghi Âm"** để demo phương thức thứ hai:
     * Cửa sổ tải tệp hiện lên, kéo thả tệp âm thanh ghi âm sẵn `meetly_sprint_sync.mp3` vào khung tải lên.
     * Bấm nút **"Bắt đầu xử lý"** $\rightarrow$ Thanh tiến trình hiển thị quá trình phân tích và chuyển đổi tự động.
* **Lời thuyết minh (Voice-over):**
  > *"Bước vào không gian chi tiết của cuộc họp, thầy cô có thể thấy một giao diện làm việc rất rõ ràng và hiện đại.  
  > Để bắt đầu xử lý nội dung, Meetly hỗ trợ người dùng hai phương thức tiếp nhận âm thanh vô cùng linh hoạt:  
  > Thứ nhất là tính năng Streaming trực tiếp, rất phù hợp khi nhóm đang họp trực tuyến, hệ thống sẽ thu âm và hiển thị lời nói thành văn bản ngay tức thì theo thời gian thực.  
  > Và thứ hai là tính năng Tải tệp ghi âm lên dành cho các cuộc họp offline hay các buổi họp đã được ghi âm từ trước. Em chỉ cần chọn tệp âm thanh của buổi họp, bấm 'Bắt đầu xử lý' và hệ thống sẽ tự động phân tích toàn diện cuộc trò chuyện."*

---

### Phần 4 — Xem Lời Thoại Hội Thoại & Tự Động Định Danh Người Nói
* **Thời lượng:** 40 giây.
* **Màn hình:** Tab **"Hội thoại"** (`transcript`) và thanh phát âm thanh Timeline.
* **Thao tác người quay:**
  1. Nhấp vào tab **"Hội thoại"**.
  2. Cuộn chuột mượt mà qua danh sách các lượt trao đổi luân phiên giữa **Quế Đình Anh Tú** và **Trường Bùi Diễn**.
  3. Di chuột highlight vào avatar và tên người nói hiển thị tương ứng trên từng câu thoại.
  4. Nhấp nút Play tại câu nói của bạn Tú lúc `00:31` $\rightarrow$ Thanh phát âm thanh bên trên tự động phát tiếng và sóng âm chuyển động đồng bộ.
* **Lời thuyết minh (Voice-over):**
  > *"Sau khi xử lý xong, toàn bộ nội dung trao đổi sẽ được hiển thị đầy đủ tại tab 'Hội thoại'.  
  > Điểm đặc biệt là hệ thống tự động nhận diện và gán đúng tên của từng người phát biểu — ở đây là bạn Tú và bạn Diễn — kèm theo avatar trực quan thay vì chỉ hiển thị các nhãn người nói vô danh.  
  > Bất cứ khi nào cần kiểm tra lại, người dùng chỉ cần nhấp vào một câu thoại bất kỳ, trình phát âm thanh bên trên sẽ tự động phát lại chính xác đoạn âm thanh tương ứng cùng sóng âm đồng bộ."*

---

### Phần 5 — Biên Bản Cuộc Họp & Tự Động Phân Chia Task
* **Thời lượng:** 45 giây.
* **Màn hình:** Tab **"Biên bản cuộc họp"** (`report`) trong khung soạn thảo chuẩn văn bản giấy.
* **Thao tác người quay:**
  1. Chuyển sang tab **"Biên bản cuộc họp"**.
  2. Cuộn chuột qua 3 mục lớn được hệ thống tự động tổng hợp:
     * **Tóm tắt cuộc họp:** Bức tranh chung về nội dung rà soát phiên bản mới.
     * **Quyết định quan trọng:** Thống nhất giữ nguyên API contract hiện tại.
     * **Danh sách việc cần làm (Action Items):**
       * Việc 1: *"Kiểm thử toàn diện refresh token và deploy lên staging"* $\rightarrow$ Người thực hiện: **Quế Đình Anh Tú** $\rightarrow$ Hạn chót: **Trước 17h thứ Năm**.
       * Việc 2: *"Tích hợp API mới và xử lý error handling"* $\rightarrow$ Người thực hiện: **Trường Bùi Diễn** $\rightarrow$ Hạn chót: **Trước thứ Sáu**.
  3. Thao tác trực tiếp trên trình soạn thảo: Nhấp thử vào checkbox của một đầu việc và gõ thêm một dòng ghi chú ngắn để thể hiện tính linh hoạt của khung soạn thảo.
* **Lời thuyết minh (Voice-over):**
  > *"Tiếp theo, chuyển sang tab 'Biên bản cuộc họp'. Tại đây, hệ thống đã tự động soạn thảo sẵn một tài liệu hoàn chỉnh gồm ba phần trọng tâm: Tóm tắt nội dung chính, Các quyết định đã thống nhất, và Danh sách việc cần làm.  
  > Điều tuyệt vời nhất là hệ thống tự động bóc tách và phân chia công việc rất cụ thể: bạn Tú phụ trách kiểm thử refresh token trước thứ Năm, còn bạn Diễn chịu trách nhiệm tích hợp API và giao diện trước thứ Sáu.  
  > Người dùng có thể chỉnh sửa, bổ sung nội dung hoặc đánh dấu hoàn thành trực tiếp trên trình soạn thảo này như một tài liệu số trước khi lưu trữ."*

---

### Phần 6 — 1-Click Đồng Bộ Thẻ Việc Sang Bảng Phòng Ban
* **Thời lượng:** 35 giây.
* **Màn hình:** Nút đồng bộ trên thanh công cụ và Bảng Việc phòng ban (`/workspaces/{workspaceId}/tasks`).
* **Thao tác người quay:**
  1. Nhấp nút **"Đồng bộ Việc phòng ban"** ở góc trên bên phải $\rightarrow$ Thông báo thành công hiển thị: *"Đã đồng bộ 2 công việc vào Việc phòng ban!"*.
  2. Bấm vào menu **"Việc phòng ban"** trên thanh điều hướng bên trái.
  3. Di chuột qua bảng Kanban: Chỉ vào 2 thẻ công việc mới xuất hiện tại cột **"Cần làm" (Todo)** với nhãn nhận diện màu tím `Cuộc họp AI`.
  4. Mở xem chi tiết thẻ việc của bạn Diễn: hiển thị rõ tên việc, người phụ trách là Diễn và hạn chót là thứ Sáu.
* **Lời thuyết minh (Voice-over):**
  > *"Sau khi hoàn tất biên bản, chúng ta chỉ cần bấm một nút 'Đồng bộ Việc phòng ban'.  
  > Ngay lập tức, toàn bộ các đầu việc trong cuộc họp sẽ được tự động chuyển thành các thẻ công việc trên bảng quản lý chung của nhóm.  
  > Khi chuyển sang trang Việc phòng ban, thầy cô có thể thấy hai thẻ việc mới đã xuất hiện ngay ngắn tại cột Cần làm: đúng người phụ trách, đúng thời hạn cam kết và có nhãn cuộc họp, giúp cả nhóm quản lý tiến độ dễ dàng mà không tốn công nhập liệu thủ công."*

---

### Phần 7 — Kiểm Chứng Ngược Âm Thanh Gốc (Reverse Context)
* **Thời lượng:** 40 giây.
* **Màn hình:** Chi tiết thẻ công việc $\rightarrow$ Trình phát âm thanh trên trang cuộc họp.
* **Thao tác người quay:**
  1. Trong bảng chi tiết thẻ việc của bạn Diễn, nhấp vào biểu tượng mốc thời gian **`01:53`**.
  2. Màn hình tự động điều hướng quay trở lại trang cuộc họp, thanh phát âm thanh lập tức tua về giây thứ `01:53` và phát câu nói phân công:
     * *(Audio phát tiếng):* Tú nói: *"Sau khi anh deploy lên staging vào chiều thứ Năm, Diễn cập nhật login flow và xử lý error handling trước thứ Sáu giúp anh nhé."*
* **Lời thuyết minh (Voice-over):**
  > *"Một tính năng vô cùng độc đáo của Meetly là khả năng Kiểm chứng ngược.  
  > Trên bất kỳ thẻ công việc nào, người dùng chỉ cần nhấp vào mốc thời gian đính kèm, hệ thống sẽ tự động đưa chúng ta quay lại cuộc họp và phát đúng câu nói gốc lúc công việc đó được giao.  
  > Nhờ vậy, các thành viên luôn có thể nghe lại chính xác ngữ cảnh và yêu cầu ban đầu, xóa bỏ hoàn toàn tình trạng hiểu lầm hay trôi việc sau khi họp."*

---

### Phần 8 — Kết Thúc Demo
* **Thời lượng:** 15 giây.
* **Màn hình:** Màn hình kết thúc với Logo Meetly và lời cảm ơn Quý Thầy Cô.
* **Thao tác người quay:**
  1. Màn hình hiển thị logo Meetly với slogan: *"Chuyển hóa hội thoại thành hành động"*.
* **Lời thuyết minh (Voice-over):**
  > *"Như vậy, Meetly đã mang đến một giải pháp toàn diện và khép kín: từ tổ chức cuộc họp, tiếp nhận âm thanh thông minh, soạn thảo biên bản tự động cho đến đồng bộ và kiểm chứng công việc.  
  > Em xin chân thành cảm ơn quý thầy cô đã dành thời gian theo dõi phần demo sản phẩm của nhóm Meetly!"*

---

## 3. Nội Dung Hội Thoại Cuộc Họp Mẫu (Tú & Diễn)

*Dùng để thu âm tệp audio mẫu dài khoảng 1.5 – 2 phút:*

```text
[00:00 - 00:16]
Quế Đình Anh Tú:
"Chào Diễn. Hôm nay hai anh em mình sync nhanh khoảng 15 phút để rà soát tiến độ và chuẩn bị release phiên bản mới của Meetly nhé."

[00:17 - 00:30]
Trường Bùi Diễn:
"Chào anh Tú. Bên frontend em đã dựng xong toàn bộ UI mới cho login flow và dashboard rồi. Em đang chờ API mới từ backend để tích hợp vào hệ thống."

[00:31 - 00:52]
Quế Đình Anh Tú:
"Về phía backend, module authentication cơ bản đã hoàn thiện luồng login flow và cấp JWT token. Tuy nhiên, cơ chế refresh token đang cần test kỹ lại các edge case khi token hết hạn giữa chừng lúc người dùng đang thao tác."

[00:53 - 01:10]
Trường Bùi Diễn:
"Đúng rồi anh Tú. Bên frontend em cũng cần danh sách các mã lỗi chuẩn của API để hoàn thiện phần error handling, tránh trường hợp người dùng bị văng màn hình đột ngột khi token hết hạn."

[01:11 - 01:25]
Quế Đình Anh Tú:
"Rất chuẩn xác. Về kiến trúc, hai anh em mình thống nhất quyết định giữ nguyên API contract hiện tại để không làm gián đoạn các module khác và đảm bảo đúng tiến độ release."

[01:26 - 01:42]
Quế Đình Anh Tú - [Giao & Nhận Task 1]:
"Vậy phân công công việc cụ thể như sau: Anh sẽ chịu trách nhiệm test toàn diện cơ chế refresh token và deploy bản backend mới này lên môi trường staging trước 17h thứ Năm nhé."

[01:43 - 01:52]
Trường Bùi Diễn:
"Dạ nhất trí anh, có bản staging sớm thì em test tích hợp sẽ rất thuận lợi."

[01:53 - 02:08]
Quế Đình Anh Tú - [Giao Task 2]:
"Sau khi anh deploy lên staging vào chiều thứ Năm, Diễn cập nhật login flow và xử lý dứt điểm phần error handling theo API mới giúp anh nhé. Em chốt xong trước thứ Sáu được không?"

[02:09 - 02:22]
Trường Bùi Diễn - [Nhận Task 2]:
"Dạ vâng anh Tú, ngay khi anh đẩy lên staging thì em sẽ tích hợp API mới, xử lý error handling và hoàn thành phần login flow trước thứ Sáu tuần này ạ."

[02:23 - 02:35]
Quế Đình Anh Tú - [Chốt cuộc họp]:
"Tuyệt vời. Anh em mình chốt 2 đầu việc như vậy nhé. Cảm ơn Diễn, chúc em một ngày làm việc hiệu quả!"

[02:36 - 02:40]
Trường Bùi Diễn:
"Dạ em cảm ơn anh Tú, chào anh ạ!"
```

---

## 4. Dữ Liệu Mẫu Hiển Thị Trên Giao Diện

### A. Dữ liệu khi tạo cuộc họp mới
* **Tiêu đề cuộc họp:** *Sprint Sync: Rà soát release phiên bản mới*
* **Thời gian:** Ngày hôm nay (`09:00 - 09:30`)
* **Thành viên tham gia:** Quế Đình Anh Tú, Trường Bùi Diễn

### B. Danh sách việc cần làm (Trên Biên bản cuộc họp)
* **Việc 1:** *Kiểm thử toàn diện refresh token và deploy backend lên môi trường staging* — **Người nhận:** Quế Đình Anh Tú — **Hạn chót:** Trước 17h thứ Năm — **Mốc thời gian:** `01:26`.
* **Việc 2:** *Tích hợp API mới và xử lý dứt điểm error handling trên login flow* — **Người nhận:** Trường Bùi Diễn — **Hạn chót:** Trước thứ Sáu — **Mốc thời gian:** `01:53`.

### C. Thẻ việc trên Bảng Việc phòng ban (Kanban Board)
* **Thẻ 1 (Tú):** *Kiểm thử toàn diện refresh token và deploy backend lên môi trường staging* | Cột: `Cần làm` | Người thực hiện: Tú | Hạn: Thứ Năm (17:00) | Nhãn: `Cuộc họp AI`.
* **Thẻ 2 (Diễn):** *Tích hợp API mới và xử lý dứt điểm error handling trên login flow* | Cột: `Cần làm` | Người thực hiện: Diễn | Hạn: Thứ Sáu (23:59) | Nhãn: `Cuộc họp AI`.

---

## 5. Quick Checklist Khi Quay Màn Hình

- [ ] **Phần 1 — Dashboard (25s):** Quay màn hình Dashboard, mở đầu tự nhiên chào thầy cô, lướt chuột qua thẻ thống kê tổng quan và lịch họp nhóm.
- [ ] **Phần 2 — Tab Cuộc họp & Tạo cuộc họp (40s):** Chuyển sang tab *Cuộc họp* $\rightarrow$ Giới thiệu các tính năng quản lý danh sách cuộc họp $\rightarrow$ Bấm *Tạo cuộc họp* $\rightarrow$ Điền tiêu đề, thời gian, chọn Tú & Diễn $\rightarrow$ Bấm tạo và chuyển vào trang chi tiết.
- [ ] **Phần 3 — Tiếp nhận âm thanh (40s):** Giới thiệu không gian làm việc chi tiết $\rightarrow$ Giới thiệu tính năng Streaming trực tiếp $\rightarrow$ Bấm nút *Họp Offline / Ghi Âm*, tải file `meetly_sprint_sync.mp3` $\rightarrow$ Bấm xử lý.
- [ ] **Phần 4 — Hội thoại (40s):** Mở tab *Hội thoại* $\rightarrow$ Cuộn xem thoại phân vai Tú và Diễn $\rightarrow$ Bấm Play nghe câu nói lúc `00:31` đồng bộ sóng âm.
- [ ] **Phần 5 — Biên bản & Phân chia Task (45s):** Mở tab *Biên bản cuộc họp* $\rightarrow$ Xem Tóm tắt, Quyết định, 2 việc cần làm của Tú và Diễn $\rightarrow$ Click thử checkbox hoặc gõ ghi chú trên trình soạn thảo.
- [ ] **Phần 6 — Đồng bộ việc sang Kanban (35s):** Bấm nút *"Đồng bộ Việc phòng ban"* $\rightarrow$ Sang trang Việc phòng ban xem 2 thẻ việc mới ở cột *Cần làm*.
- [ ] **Phần 7 — Kiểm chứng ngược (40s):** Tại thẻ việc của Diễn, bấm mốc `01:53` $\rightarrow$ Trình phát tua lại đúng câu nói giao việc ban đầu.
- [ ] **Phần 8 — Kết thúc (15s):** Hiển thị logo Meetly và gửi lời cảm ơn Quý Thầy Cô.

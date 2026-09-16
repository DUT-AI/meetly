# Meetly - Google Meet Audio Recorder Extension

Chrome Extension (Manifest V3) chuyên dụng để ghi âm cuộc họp Google Meet 2 chiều (âm thanh từ các thành viên trong cuộc họp + âm thanh Micro của chính bạn), tự động đóng gói file `.webm` chất lượng cao và đồng bộ với hệ thống Meetly.

---

## 📂 Cấu trúc thư mục

```text
extension/
├── manifest.json              # File khai báo quyền và cấu hình Extension (Manifest V3)
├── icons/                     # Bộ icon ứng dụng (16px, 48px, 128px)
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── background/
│   └── service-worker.js      # Bộ não trung tâm điều phối trạng thái, lưu trữ & tải file
├── content/
│   └── content.js             # Nhúng giao diện điều khiển (Floating Widget) vào Google Meet
├── offscreen/
│   ├── offscreen.html         # Trang DOM ngầm (Offscreen Document)
│   └── offscreen.js           # Bộ máy Web Audio API & MediaRecorder trộn 2 luồng âm thanh
└── popup/
    ├── popup.html             # Giao diện khi bấm vào icon Extension trên thanh công cụ
    ├── popup.css              # Giao diện Dark theme Meetly
    └── popup.js               # Logic điều khiển nhanh từ toolbar
```

---

## ⚡ Tính năng nổi bật

1. **Ghi âm kép 2 chiều (Dual-Stream Mixing)**:
   - Thu được trọn vẹn giọng nói của người khác trên Google Meet.
   - Thu được giọng nói của chính bạn qua Microphone.
   - Tự động định tuyến luồng âm thanh tab ra loa máy tính để **bạn vẫn nghe thấy bạn bè nói chuyện bình thường** (không bị mute như các extension thông thường).
2. **Giao diện nổi hiện đại (Floating Widget)**:
   - Tự động xuất hiện ngay trong giao diện Google Meet (`meet.google.com`).
   - Sử dụng **Shadow DOM** cách ly hoàn toàn, không sợ xung đột CSS với Google Meet.
   - Hỗ trợ kéo thả (drag & drop) di chuyển khắp màn hình.
   - Hỗ trợ thu gọn thành một thanh nhỏ (Pill) hiển thị đếm giờ để không che tầm nhìn.
3. **Chuẩn Manifest V3 hiện đại nhất**:
   - Sử dụng **Offscreen Documents API** (`chrome.offscreen`) theo chuẩn mới nhất của Google Chrome, không bị ngắt quãng do timeout của Service Worker.
4. **Tự động lưu và xuất file**:
   - Xuất file `.webm` chuẩn Opus bit-rate cao, đặt tên thông minh theo mã phòng họp và thời gian thực: `Meetly_[MaPhong]_[NgayGio].webm`.

---

## 🚀 Hướng dẫn cài đặt & Chạy thử (Dành cho người mới)

### Bước 1: Mở trang quản lý tiện ích Chrome
1. Mở trình duyệt Google Chrome.
2. Nhập vào thanh địa chỉ: `chrome://extensions` và nhấn **Enter**.
3. Bật công tắc **Chế độ dành cho nhà phát triển (Developer mode)** ở góc trên cùng bên phải.

### Bước 2: Tải Extension vào Chrome
1. Nhấn vào nút **Tải tiện ích đã giải nén (Load unpacked)** ở góc trên bên trái.
2. Tìm và chọn thư mục `extension` trong dự án `meetly` (`/Users/nguyenhoangminh/Documents/meetly/extension`).
3. Bạn sẽ thấy tiện ích **Meetly - Google Meet Audio Recorder** xuất hiện trong danh sách.

### Bước 3: Kiểm tra trên Google Meet
1. Mở tab mới và truy cập vào một cuộc họp Google Meet bất kỳ: [https://meet.google.com](https://meet.google.com).
2. Khi vào phòng họp, bạn sẽ thấy một Widget nổi của **Meetly Recorder** ở góc trên bên phải màn hình:
   - Nhấn **"Ghi âm cuộc họp"**: Widget chuyển sang trạng thái nhấp nháy đỏ với bộ đếm giờ chạy.
   - Bạn có thể nhấn **Tạm dừng** hoặc **Kéo thả** widget đến vị trí tùy thích.
   - Nhấn **"⏹ Lưu & Tải về"**: Quá trình ghi âm dừng lại, file `.webm` sẽ lập tức được tự động tải về thư mục `Downloads` của máy tính.
3. Mở file `.webm` vừa tải về nghe lại để kiểm tra âm thanh cả 2 chiều!

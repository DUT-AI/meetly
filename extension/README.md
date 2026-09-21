# Meetly - Audio Recorder for Google Meet

Chrome Extension (Manifest V3) chuyên dụng để ghi âm cuộc họp Google Meet 2 chiều (âm thanh từ các thành viên trong cuộc họp + âm thanh Micro của chính bạn), tự động đóng gói file `.webm` chất lượng cao theo múi giờ Việt Nam và đồng bộ với hệ thống Meetly.

---

## 📂 Cấu trúc thư mục

```text
extension/
├── manifest.json              # File khai báo quyền tối ưu cho Chrome Web Store (Manifest V3)
├── icons/                     # Bộ icon ứng dụng (16px, 48px, 128px và ảnh gốc image.png)
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── image.png
├── background/
│   └── service-worker.js      # Điều phối trạng thái, lưu trữ cài đặt & thông báo
├── content/
│   └── content.js             # Bộ máy Dual-Stream Recording & Floating Widget Shadow DOM
└── popup/
    ├── popup.html             # Giao diện khi bấm vào icon Extension trên thanh công cụ
    ├── popup.css              # Giao diện Dark theme Meetly
    └── popup.js               # Logic popup và liên kết đến Google Meet
```

---

## ⚡ Tính năng nổi bật

1. **Ghi âm kép 2 chiều trực tiếp (Dual-Stream Mixing)**:
   - Thu được trọn vẹn giọng nói của người khác trên Google Meet qua `getDisplayMedia`.
   - Thu được giọng nói của chính bạn qua Microphone (`getUserMedia`).
   - Tự động hòa trộn âm thanh bằng Web Audio API mà **không làm mất tiếng ra loa/tai nghe**.
2. **Giao diện nổi hiện đại (Floating Widget)**:
   - Tự động xuất hiện ngay trong giao diện Google Meet (`meet.google.com`).
   - Sử dụng **Shadow DOM** cách ly hoàn toàn, không sợ xung đột CSS với Google Meet.
   - Hỗ trợ kéo thả (drag & drop) di chuyển khắp màn hình và thu gọn thành thanh nhỏ (Pill).
3. **Chuẩn Manifest V3 tối ưu cho Chrome Web Store**:
   - Tuân thủ nguyên tắc **Least Privilege (Quyền hạn tối thiểu)**: Không xin các quyền nhạy cảm thừa (`localhost`, `tabCapture`, `offscreen`).
   - Giúp việc kiểm duyệt trên Chrome Web Store nhanh chóng, tránh bị Google từ chối.
4. **Định dạng file thông minh theo giờ Việt Nam**:
   - Tự động xuất file `.webm` (Opus) với tên: `Meetly_[MaPhong]_[YYYY-MM-DD]_[HH-mm-ss].webm` chuẩn múi giờ Việt Nam (GMT+7).

---

## 🚀 Hướng dẫn đóng gói để tải lên Chrome Web Store

Chạy lệnh sau tại thư mục gốc dự án:
```bash
cd extension
zip -r ../meetly-extension.zip . -x ".*" -x "__MACOSX*" -x "*/__MACOSX*" -x "README.md" -x "screenshots/*" -x "icons/image.png"
```
Sau đó truy cập [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) và tải file `meetly-extension.zip` lên.

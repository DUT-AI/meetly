# Privacy Policy for Meetly - Audio Recorder for Google Meet

**Last updated:** September 19, 2026

Meetly ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how our Chrome Extension **"Meetly - Audio Recorder for Google Meet"** handles information when you use our services.

---

## 1. Single Purpose
The single purpose of **Meetly - Audio Recorder for Google Meet** is to record two-way audio (meeting audio and user microphone) during Google Meet sessions and download the audio file directly to the user's local computer for meeting transcription, notes, and task management.

---

## 2. Information We Handle
- **Audio Streams (Google Meet & Microphone):** The extension temporarily accesses tab audio and your microphone only when you explicitly click "Ghi âm cuộc họp" (Start Recording).
- **Local Settings:** User preferences (such as microphone toggle and auto-download preference) are saved locally on your device via `chrome.storage.local`.
- **No Personal Data Collection:** We **do not** collect, store, transmit, or sell any personal identifiable information (PII), names, email addresses, passwords, browsing history, financial data, or health data.

---

## 3. How Data is Processed (100% Local Processing)
- **Local Audio Mixing & Encoding:** All audio capture, mixing via Web Audio API, and Opus compression into `.webm` format happens **entirely on your local machine** within your browser session.
- **Direct Download:** When you click "Lưu & Tải về" (Stop & Save), the resulting `.webm` audio file is saved directly to your local `Downloads` folder using standard browser download APIs.
- **No Remote Transmission:** Audio files are never sent to third-party servers, tracking platforms, or advertising networks.

---

## 4. Permissions Justification
- `storage`: Required to store your recording preferences locally on your browser.
- `downloads`: Required to save the generated `.webm` recording file to your computer.
- `activeTab`: Required to interact with your active Google Meet tab.
- `https://meet.google.com/*`: Required to inject the in-meeting recorder floating widget and capture meeting audio streams upon user request.

---

## 5. Compliance with Chrome Web Store Policies
- We strictly adhere to the [Chrome Web Store Developer Program Policies](https://developer.chrome.com/docs/webstore/program_policies/), including the User Data Policy.
- We do not sell or transfer user data to third parties.
- We do not use or transfer user data for purposes unrelated to the extension's core single purpose.
- We do not use or transfer user data for creditworthiness or lending purposes.

---

## 6. User Rights & Data Deletion
Since all recordings are saved locally on your device, you have full ownership and control over your data. You can view, rename, or permanently delete the downloaded `.webm` files from your computer at any time.

---

## 7. Contact Us
If you have any questions or suggestions regarding this Privacy Policy, please contact us:
- **Website:** [https://meetly.dutai.io.vn/](https://meetly.dutai.io.vn/)
- **Organization:** DUT-AI / Meetly Team
- **Repository:** [https://github.com/DUT-AI/meetly](https://github.com/DUT-AI/meetly)

# Meetly Mobile App 📱

Ứng dụng di động Meetly phát triển bằng **Flutter**, kết nối trực tiếp với Meetly Backend qua REST API với kiến trúc **Feature-first (Feature-driven Architecture)**.

---

## 🏗️ Kiến trúc & Công nghệ Sử dụng

- **State Management & DI**: [Flutter Riverpod](https://riverpod.dev) (`StateNotifierProvider`, `FutureProvider`, `ProviderScope`).
- **Networking**: [Dio](https://pub.dev/packages/dio) với Custom Interceptors (`AuthInterceptor` tự động gắn `Authorization: Bearer <token>`, `LoggingInterceptor`).
- **Bảo mật & Quản lý Token**: [Flutter Secure Storage](https://pub.dev/packages/flutter_secure_storage) (Mã hóa KeyStore trên Android, Keychain trên iOS).
- **Điều hướng (Routing)**: [GoRouter](https://pub.dev/packages/go_router).
- **Audio & Cuộc họp**: [just_audio](https://pub.dev/packages/just_audio) + [audio_video_progress_bar](https://pub.dev/packages/audio_video_progress_bar).
- **Theme**: Hỗ trợ Light & Dark theme đồng bộ với hệ thống Meetly Web.

---

## 📁 Cấu trúc Thư mục (Feature-first)

```text
mobile/
├── lib/
│   ├── main.dart
│   ├── app.dart
│   ├── core/                        # Nền tảng dùng chung
│   │   ├── constants/               # API endpoints, storage keys
│   │   ├── network/                 # Dio client, AuthInterceptor, Exceptions
│   │   ├── router/                  # GoRouter configuration & routes
│   │   ├── storage/                 # SecureStorageService, LocalStorageService
│   │   ├── theme/                   # Colors, Typography, AppTheme
│   │   ├── utils/                   # DateFormatter, duration parser
│   │   └── widgets/                 # Button, TextField, Loading, ErrorView
│   └── features/                    # Các tính năng độc lập
│       ├── auth/                    # Login, Auto-login check, Logout
│       ├── workspace/               # Workspace switcher & list
│       ├── project/                 # Projects by workspace
│       ├── task/                    # My Tasks global filter, Task Detail & Status
│       └── audio_player/            # Meeting Audio Player modal & scrubber
└── test/
    └── model_serialization_test.dart
```

---

## 🚀 Hướng dẫn Cài đặt & Chạy

### 1. Cài đặt Dependencies
```bash
cd mobile
flutter pub get
```

### 2. Chạy Ứng dụng
- **Android Emulator**:
  ```bash
  flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000
  ```
- **iOS Simulator**:
  ```bash
  flutter run --dart-define=API_BASE_URL=http://127.0.0.1:8000
  ```
- **Thiết bị thật / Server từ xa**:
  ```bash
  flutter run --dart-define=API_BASE_URL=https://your-api-domain.com
  ```

---

## 🧪 Chạy Tests
```bash
flutter test
```

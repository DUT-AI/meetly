import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../storage/secure_storage_service.dart';

final authInterceptorProvider = Provider<AuthInterceptor>((ref) {
  final storage = ref.watch(secureStorageServiceProvider);
  return AuthInterceptor(storage: storage);
});

/// Dio Interceptor tự động gắn Header `Authorization: Bearer <token>`
/// và xử lý dọn dẹp token khi gặp lỗi 401 Unauthorized.
class AuthInterceptor extends QueuedInterceptor {
  final SecureStorageService _storage;

  AuthInterceptor({
    required SecureStorageService storage,
  }) : _storage = storage;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // Cho phép bỏ qua auth header nếu cờ 'requiresAuth' = false
    final requiresAuth = options.extra['requiresAuth'] ?? true;

    if (requiresAuth) {
      final token = await _storage.getAccessToken();
      if (token != null && token.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer $token';
      }
    }

    return handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    // Khi nhận mã lỗi 401 (Unauthorized), dọn dẹp token khỏi Secure Storage
    if (err.response?.statusCode == 401) {
      await _storage.clearAll();
    }

    return handler.next(err);
  }
}

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meetly_mobile/core/storage/secure_storage_service.dart';
import 'package:meetly_mobile/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:meetly_mobile/features/auth/data/models/login_request_dto.dart';
import 'package:meetly_mobile/features/auth/domain/entities/user_entity.dart';
import 'package:meetly_mobile/features/auth/domain/repositories/auth_repository.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final remoteDataSource = ref.watch(authRemoteDataSourceProvider);
  final storageService = ref.watch(secureStorageServiceProvider);
  return AuthRepositoryImpl(
    remoteDataSource: remoteDataSource,
    storageService: storageService,
  );
});

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource _remoteDataSource;
  final SecureStorageService _storageService;

  AuthRepositoryImpl({
    required AuthRemoteDataSource remoteDataSource,
    required SecureStorageService storageService,
  })  : _remoteDataSource = remoteDataSource,
        _storageService = storageService;

  @override
  Future<UserEntity> login(String email, String password) async {
    final request = LoginRequestDto(email: email, password: password);
    final response = await _remoteDataSource.login(request);
    await _storageService.saveTokens(
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    );
    final user = await _remoteDataSource.getMe();
    return user;
  }

  @override
  Future<UserEntity?> getCurrentUser() async {
    final token = await _storageService.getAccessToken();
    if (token == null || token.isEmpty) return null;
    try {
      return await _remoteDataSource.getMe();
    } catch (_) {
      await _storageService.clearAll();
      return null;
    }
  }

  @override
  Future<void> logout() async {
    try {
      await _remoteDataSource.logout();
    } finally {
      await _storageService.clearAll();
    }
  }

  @override
  Future<bool> isAuthenticated() async {
    final token = await _storageService.getAccessToken();
    return token != null && token.isNotEmpty;
  }
}

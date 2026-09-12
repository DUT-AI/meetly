import 'package:flutter_test/flutter_test.dart';
import 'package:meetly_mobile/core/storage/secure_storage_service.dart';
import 'package:meetly_mobile/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:meetly_mobile/features/auth/data/models/auth_response_model.dart';
import 'package:meetly_mobile/features/auth/data/models/login_request_dto.dart';
import 'package:meetly_mobile/features/auth/data/repositories/auth_repository_impl.dart';

class FakeSecureStorageService implements SecureStorageService {
  final Map<String, String> _storage = {};

  @override
  Future<void> saveTokens({
    required String accessToken,
    String? refreshToken,
  }) async {
    _storage['token'] = accessToken;
    if (refreshToken != null) {
      _storage['refresh_token'] = refreshToken;
    }
  }

  @override
  Future<String?> getAccessToken() async => _storage['token'];

  @override
  Future<String?> getRefreshToken() async => _storage['refresh_token'];

  @override
  Future<void> clearAll() async => _storage.clear();
}

class FakeAuthRemoteDataSource implements AuthRemoteDataSource {
  LoginRequestDto? lastRequest;
  bool shouldFailLogin = false;

  @override
  Future<LoginResponseModel> login(LoginRequestDto request) async {
    lastRequest = request;
    if (shouldFailLogin) {
      throw Exception('Tài khoản hoặc mật khẩu không chính xác');
    }
    return LoginResponseModel(
      accessToken: 'fake_jwt_token_123',
      refreshToken: 'fake_refresh_token_456',
    );
  }

  @override
  Future<UserModel> getMe() async {
    return const UserModel(
      id: 1,
      email: 'admin@meetly.local',
      name: 'Admin Meetly',
      roleNames: ['ADMIN'],
      status: 'ACTIVE',
    );
  }

  @override
  Future<void> logout() async {}
}

void main() {
  group('Auth Model & DTO Tests', () {
    test('LoginRequestDto encodes to json correctly with trimmed email', () {
      const dto = LoginRequestDto(
        email: '  test@meetly.local  ',
        password: 'password123',
      );
      final json = dto.toJson();
      expect(json['email'], 'test@meetly.local');
      expect(json['password'], 'password123');
    });

    test('LoginResponseModel parses direct and wrapped responses', () {
      final directJson = {
        'access_token': 'token_abc',
        'refresh_token': 'refresh_xyz',
        'token_type': 'bearer',
      };
      final model1 = LoginResponseModel.fromJson(directJson);
      expect(model1.accessToken, 'token_abc');
      expect(model1.refreshToken, 'refresh_xyz');

      final wrappedJson = {
        'is_success': true,
        'data': {
          'access_token': 'token_wrapped',
          'token_type': 'bearer',
        },
      };
      final model2 = LoginResponseModel.fromJson(wrappedJson);
      expect(model2.accessToken, 'token_wrapped');
    });

    test('UserModel parses direct and wrapped responses with role list', () {
      final wrappedJson = {
        'data': {
          'id': 99,
          'email': 'developer@meetly.local',
          'name': 'Dev User',
          'role_names': ['DEVELOPER', 'MEMBER'],
          'avatar_url': 'https://meetly.local/avatar.png',
          'status': 'ACTIVE',
        },
      };
      final user = UserModel.fromJson(wrappedJson);
      expect(user.id, 99);
      expect(user.email, 'developer@meetly.local');
      expect(user.name, 'Dev User');
      expect(user.roleNames, contains('DEVELOPER'));
    });
  });

  group('AuthRepositoryImpl Tests', () {
    late FakeAuthRemoteDataSource remoteDataSource;
    late FakeSecureStorageService storageService;
    late AuthRepositoryImpl repository;

  setUp(() {
    remoteDataSource = FakeAuthRemoteDataSource();
    storageService = FakeSecureStorageService();
    repository = AuthRepositoryImpl(
      remoteDataSource: remoteDataSource,
      storageService: storageService,
    );
  });

  test('login saves tokens to SecureStorage and fetches user profile', () async {
    final user = await repository.login('admin@meetly.local', 'Admin123!@#');

    expect(remoteDataSource.lastRequest?.email, 'admin@meetly.local');
    expect(remoteDataSource.lastRequest?.password, 'Admin123!@#');
    expect(await storageService.getAccessToken(), 'fake_jwt_token_123');
    expect(await storageService.getRefreshToken(), 'fake_refresh_token_456');
    expect(user.id, 1);
    expect(user.email, 'admin@meetly.local');
    expect(await repository.isAuthenticated(), isTrue);
  });

  test('logout clears secure storage', () async {
    await storageService.saveTokens(accessToken: 'token');
    expect(await repository.isAuthenticated(), isTrue);

    await repository.logout();
    expect(await storageService.getAccessToken(), isNull);
    expect(await repository.isAuthenticated(), isFalse);
  });
  });
}

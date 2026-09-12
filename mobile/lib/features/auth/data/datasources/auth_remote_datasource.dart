import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meetly_mobile/core/constants/api_endpoints.dart';
import 'package:meetly_mobile/core/network/api_client.dart';
import 'package:meetly_mobile/core/network/api_exception.dart';
import 'package:meetly_mobile/features/auth/data/models/auth_response_model.dart';
import 'package:meetly_mobile/features/auth/data/models/login_request_dto.dart';

final authRemoteDataSourceProvider = Provider<AuthRemoteDataSource>((ref) {
  final dio = ref.watch(apiClientProvider);
  return AuthRemoteDataSourceImpl(dio);
});

abstract class AuthRemoteDataSource {
  Future<LoginResponseModel> login(LoginRequestDto request);
  Future<UserModel> getMe();
  Future<void> logout();
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final Dio _dio;

  AuthRemoteDataSourceImpl(this._dio);

  @override
  Future<LoginResponseModel> login(LoginRequestDto request) async {
    try {
      final response = await _dio.post(
        ApiEndpoints.login,
        data: request.toJson(),
        options: Options(extra: {'requiresAuth': false}),
      );
      return LoginResponseModel.fromJson(response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  @override
  Future<UserModel> getMe() async {
    try {
      final response = await _dio.get(ApiEndpoints.me);
      return UserModel.fromJson(response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  @override
  Future<void> logout() async {
    try {
      await _dio.post(ApiEndpoints.logout);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}

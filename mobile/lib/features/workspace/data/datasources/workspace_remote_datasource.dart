import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meetly_mobile/core/constants/api_endpoints.dart';
import 'package:meetly_mobile/core/network/api_client.dart';
import 'package:meetly_mobile/core/network/api_exception.dart';
import 'package:meetly_mobile/features/workspace/data/models/workspace_model.dart';

final workspaceRemoteDataSourceProvider =
    Provider<WorkspaceRemoteDataSource>((ref) {
  final dio = ref.watch(apiClientProvider);
  return WorkspaceRemoteDataSourceImpl(dio);
});

abstract class WorkspaceRemoteDataSource {
  Future<List<WorkspaceModel>> getWorkspaces();
  Future<WorkspaceModel> getWorkspace(String id);
}

class WorkspaceRemoteDataSourceImpl implements WorkspaceRemoteDataSource {
  final Dio _dio;

  WorkspaceRemoteDataSourceImpl(this._dio);

  @override
  Future<List<WorkspaceModel>> getWorkspaces() async {
    try {
      final response = await _dio.get(ApiEndpoints.workspaces);
      final rawData = response.data['data'];
      List items = [];
      if (rawData is List) {
        items = rawData;
      } else if (rawData is Map && rawData['documents'] is List) {
        items = rawData['documents'] as List;
      }
      return items
          .whereType<Map>()
          .map((json) =>
              WorkspaceModel.fromJson(Map<String, dynamic>.from(json)))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  @override
  Future<WorkspaceModel> getWorkspace(String id) async {
    try {
      final response = await _dio.get(ApiEndpoints.workspaceDetail(id));
      return WorkspaceModel.fromJson(response.data['data']);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}

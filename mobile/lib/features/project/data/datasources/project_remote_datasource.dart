import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meetly_mobile/core/constants/api_endpoints.dart';
import 'package:meetly_mobile/core/network/api_client.dart';
import 'package:meetly_mobile/core/network/api_exception.dart';
import 'package:meetly_mobile/features/project/data/models/project_model.dart';

final projectRemoteDataSourceProvider =
    Provider<ProjectRemoteDataSource>((ref) {
  final dio = ref.watch(apiClientProvider);
  return ProjectRemoteDataSourceImpl(dio);
});

abstract class ProjectRemoteDataSource {
  Future<List<ProjectModel>> getProjects(String workspaceId);
  Future<ProjectModel> getProject(String projectId);
}

class ProjectRemoteDataSourceImpl implements ProjectRemoteDataSource {
  final Dio _dio;

  ProjectRemoteDataSourceImpl(this._dio);

  @override
  Future<List<ProjectModel>> getProjects(String workspaceId) async {
    try {
      final response = await _dio.get(
        ApiEndpoints.projects,
        queryParameters: {'workspaceId': workspaceId},
      );
      final data = response.data['data'] as List? ?? [];
      return data.map((json) => ProjectModel.fromJson(json)).toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  @override
  Future<ProjectModel> getProject(String projectId) async {
    try {
      final response = await _dio.get(ApiEndpoints.projectDetail(projectId));
      return ProjectModel.fromJson(response.data['data']);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}

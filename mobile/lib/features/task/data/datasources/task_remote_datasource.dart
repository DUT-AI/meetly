import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meetly_mobile/core/constants/api_endpoints.dart';
import 'package:meetly_mobile/core/network/api_client.dart';
import 'package:meetly_mobile/core/network/api_exception.dart';
import 'package:meetly_mobile/features/task/data/models/task_model.dart';
import 'package:meetly_mobile/features/task/domain/entities/task_entity.dart';

final taskRemoteDataSourceProvider = Provider<TaskRemoteDataSource>((ref) {
  final dio = ref.watch(apiClientProvider);
  return TaskRemoteDataSourceImpl(dio);
});

abstract class TaskRemoteDataSource {
  Future<List<TaskModel>> getMyGlobalTasks({
    TaskStatus? status,
    String? search,
    DateTime? dueDate,
  });
  Future<TaskModel> getTask(String taskId);
  Future<TaskModel> updateTaskStatus(String taskId, TaskStatus status);
}

class TaskRemoteDataSourceImpl implements TaskRemoteDataSource {
  final Dio _dio;

  TaskRemoteDataSourceImpl(this._dio);

  @override
  Future<List<TaskModel>> getMyGlobalTasks({
    TaskStatus? status,
    String? search,
    DateTime? dueDate,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (status != null) {
        queryParams['status'] = status.value;
      }
      if (search != null && search.isNotEmpty) {
        queryParams['search'] = search;
      }
      if (dueDate != null) {
        queryParams['dueDate'] = dueDate.toIso8601String();
      }

      final response = await _dio.get(
        ApiEndpoints.myTasks,
        queryParameters: queryParams,
      );

      final responseData = response.data['data'];
      List items = [];
      if (responseData is Map && responseData['documents'] is List) {
        items = responseData['documents'];
      } else if (responseData is List) {
        items = responseData;
      }

      return items.map((json) => TaskModel.fromJson(json)).toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  @override
  Future<TaskModel> getTask(String taskId) async {
    try {
      final response = await _dio.get(ApiEndpoints.taskDetail(taskId));
      return TaskModel.fromJson(response.data['data']);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  @override
  Future<TaskModel> updateTaskStatus(String taskId, TaskStatus status) async {
    try {
      final response = await _dio.patch(
        ApiEndpoints.taskDetail(taskId),
        data: {'status': status.value},
      );
      return TaskModel.fromJson(response.data['data']);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}

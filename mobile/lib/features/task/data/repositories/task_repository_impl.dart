import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/entities/task_entity.dart';
import '../../domain/repositories/task_repository.dart';
import '../datasources/task_remote_datasource.dart';

final taskRepositoryProvider = Provider<TaskRepository>((ref) {
  final remote = ref.watch(taskRemoteDataSourceProvider);
  return TaskRepositoryImpl(remote);
});

class TaskRepositoryImpl implements TaskRepository {
  final TaskRemoteDataSource _remoteDataSource;

  TaskRepositoryImpl(this._remoteDataSource);

  @override
  Future<List<TaskEntity>> getMyGlobalTasks({
    TaskStatus? status,
    String? search,
    DateTime? dueDate,
  }) {
    return _remoteDataSource.getMyGlobalTasks(
      status: status,
      search: search,
      dueDate: dueDate,
    );
  }

  @override
  Future<TaskEntity> getTask(String taskId) {
    return _remoteDataSource.getTask(taskId);
  }

  @override
  Future<TaskEntity> updateTaskStatus(String taskId, TaskStatus status) {
    return _remoteDataSource.updateTaskStatus(taskId, status);
  }
}

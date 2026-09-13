import '../entities/task_entity.dart';

abstract class TaskRepository {
  Future<List<TaskEntity>> getMyGlobalTasks({
    TaskStatus? status,
    String? search,
    DateTime? dueDate,
  });
  Future<TaskEntity> getTask(String taskId);
  Future<TaskEntity> updateTaskStatus(String taskId, TaskStatus status);
}

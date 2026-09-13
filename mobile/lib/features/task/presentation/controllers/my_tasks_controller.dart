import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meetly_mobile/features/task/data/repositories/task_repository_impl.dart';
import 'package:meetly_mobile/features/task/domain/entities/task_entity.dart';
import 'package:meetly_mobile/features/task/domain/repositories/task_repository.dart';

enum TaskBucket {
  overdue('Quá hạn'),
  today('Hôm nay'),
  thisWeek('Tuần này'),
  upcoming('Sắp tới');

  final String label;
  const TaskBucket(this.label);
}

class TaskDateClassifier {
  static TaskBucket classify(TaskEntity task, {DateTime? now}) {
    final current = now ?? DateTime.now();
    final todayStart = DateTime(current.year, current.month, current.day);
    final todayEnd = DateTime(
      current.year,
      current.month,
      current.day,
      23,
      59,
      59,
      999,
    );
    final daysUntilSunday = 7 - current.weekday;
    final endOfWeek = DateTime(
      current.year,
      current.month,
      current.day + daysUntilSunday,
      23,
      59,
      59,
      999,
    );

    if (task.dueDate == null) {
      return TaskBucket.upcoming;
    }

    final due = task.dueDate!;
    if (due.isBefore(todayStart) && task.status != TaskStatus.done) {
      return TaskBucket.overdue;
    }
    if (!due.isBefore(todayStart) && !due.isAfter(todayEnd)) {
      return TaskBucket.today;
    }
    if (due.isAfter(todayEnd) && !due.isAfter(endOfWeek)) {
      return TaskBucket.thisWeek;
    }
    return TaskBucket.upcoming;
  }
}

class TaskFilterState {
  final TaskStatus? status;
  final String search;
  final DateTime? dueDate;

  const TaskFilterState({
    this.status,
    this.search = '',
    this.dueDate,
  });

  TaskFilterState copyWith({
    TaskStatus? Function()? status,
    String? search,
    DateTime? Function()? dueDate,
  }) {
    return TaskFilterState(
      status: status != null ? status() : this.status,
      search: search ?? this.search,
      dueDate: dueDate != null ? dueDate() : this.dueDate,
    );
  }
}

final taskFilterProvider =
    StateNotifierProvider<TaskFilterNotifier, TaskFilterState>((ref) {
  return TaskFilterNotifier();
});

class TaskFilterNotifier extends StateNotifier<TaskFilterState> {
  TaskFilterNotifier() : super(const TaskFilterState());

  void setStatus(TaskStatus? status) {
    state = state.copyWith(status: () => status);
  }

  void setSearch(String query) {
    state = state.copyWith(search: query);
  }

  void setDueDate(DateTime? date) {
    state = state.copyWith(dueDate: () => date);
  }

  void reset() {
    state = const TaskFilterState();
  }
}

final taskSearchQueryProvider = StateProvider<String>((ref) => '');

class MyTasksNotifier extends StateNotifier<AsyncValue<List<TaskEntity>>> {
  final TaskRepository _repository;

  MyTasksNotifier(this._repository) : super(const AsyncValue.loading()) {
    fetchTasks();
  }

  Future<void> fetchTasks({bool isRefresh = false}) async {
    if (!isRefresh && state is! AsyncData) {
      state = const AsyncValue.loading();
    }
    try {
      final tasks = await _repository.getMyGlobalTasks();
      state = AsyncValue.data(tasks);
    } catch (e, st) {
      if (state is! AsyncData) {
        state = AsyncValue.error(e, st);
      }
    }
  }

  Future<bool> toggleTaskStatus(TaskEntity task) async {
    final currentTasks = state.valueOrNull ?? [];
    final newStatus =
        task.status == TaskStatus.done ? TaskStatus.todo : TaskStatus.done;
    final updatedTask = task.copyWith(status: newStatus);

    // 1. Optimistic local update
    state = AsyncValue.data(
      currentTasks.map((t) => t.id == task.id ? updatedTask : t).toList(),
    );

    try {
      await _repository.updateTaskStatus(task.id, newStatus);
      return true;
    } catch (e) {
      // Revert upon failure
      state = AsyncValue.data(
        currentTasks.map((t) => t.id == task.id ? task : t).toList(),
      );
      return false;
    }
  }
}

final myTasksProvider =
    StateNotifierProvider<MyTasksNotifier, AsyncValue<List<TaskEntity>>>((ref) {
  final repository = ref.watch(taskRepositoryProvider);
  return MyTasksNotifier(repository);
});

final categorizedTasksProvider =
    Provider<Map<TaskBucket, List<TaskEntity>>>((ref) {
  final tasksAsync = ref.watch(myTasksProvider);
  final search = ref.watch(taskSearchQueryProvider).trim().toLowerCase();

  final tasks = tasksAsync.valueOrNull ?? [];
  final filtered = search.isEmpty
      ? tasks
      : tasks.where((t) {
          final nameMatch = t.name.toLowerCase().contains(search);
          final descMatch =
              t.description?.toLowerCase().contains(search) ?? false;
          final projectMatch =
              t.projectName?.toLowerCase().contains(search) ?? false;
          return nameMatch || descMatch || projectMatch;
        }).toList();

  final map = <TaskBucket, List<TaskEntity>>{
    TaskBucket.overdue: [],
    TaskBucket.today: [],
    TaskBucket.thisWeek: [],
    TaskBucket.upcoming: [],
  };

  for (final task in filtered) {
    final bucket = TaskDateClassifier.classify(task);
    map[bucket]!.add(task);
  }

  return map;
});

final taskDetailProvider =
    FutureProvider.family<TaskEntity, String>((ref, taskId) async {
  final repository = ref.watch(taskRepositoryProvider);
  return repository.getTask(taskId);
});

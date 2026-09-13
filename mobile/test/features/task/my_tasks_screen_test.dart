import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:meetly_mobile/core/storage/local_storage_service.dart';
import 'package:meetly_mobile/core/theme/app_theme.dart';
import 'package:meetly_mobile/features/auth/domain/entities/user_entity.dart';
import 'package:meetly_mobile/features/auth/domain/repositories/auth_repository.dart';
import 'package:meetly_mobile/features/auth/presentation/controllers/auth_controller.dart';
import 'package:meetly_mobile/features/task/domain/entities/task_entity.dart';
import 'package:meetly_mobile/features/task/domain/repositories/task_repository.dart';
import 'package:meetly_mobile/features/task/presentation/controllers/my_tasks_controller.dart';
import 'package:meetly_mobile/features/task/presentation/screens/my_tasks_screen.dart';
import 'package:meetly_mobile/features/task/presentation/widgets/task_card_item.dart';
import 'package:meetly_mobile/features/task/presentation/widgets/task_card_skeleton.dart';
import 'package:meetly_mobile/features/workspace/domain/entities/workspace_entity.dart';
import 'package:meetly_mobile/features/workspace/presentation/controllers/workspace_controller.dart';

class FakeTaskRepository implements TaskRepository {
  List<TaskEntity> tasks = [];
  bool shouldThrow = false;
  String? lastUpdatedTaskId;
  TaskStatus? lastUpdatedStatus;

  @override
  Future<List<TaskEntity>> getMyGlobalTasks({
    TaskStatus? status,
    String? search,
    DateTime? dueDate,
  }) async {
    if (shouldThrow) {
      throw Exception('Lỗi kết nối máy chủ');
    }
    return tasks;
  }

  @override
  Future<TaskEntity> getTask(String taskId) async {
    return tasks.firstWhere((t) => t.id == taskId);
  }

  @override
  Future<TaskEntity> updateTaskStatus(String taskId, TaskStatus status) async {
    lastUpdatedTaskId = taskId;
    lastUpdatedStatus = status;
    final index = tasks.indexWhere((t) => t.id == taskId);
    if (index != -1) {
      final updated = tasks[index].copyWith(status: status);
      tasks[index] = updated;
      return updated;
    }
    throw Exception('Không tìm thấy task');
  }
}

class FakeAuthRepository implements AuthRepository {
  @override
  Future<bool> isAuthenticated() async => true;

  @override
  Future<UserEntity?> getCurrentUser() async => const UserEntity(
        id: 'u-1',
        email: 'test@meetly.local',
        name: 'Test User',
      );

  @override
  Future<UserEntity> login(String email, String password) async =>
      const UserEntity(
        id: 'u-1',
        email: 'test@meetly.local',
        name: 'Test User',
      );

  @override
  Future<void> logout() async {}
}

class FakeLocalStorageService implements LocalStorageService {
  String? _wsId;

  @override
  Future<void> setSelectedWorkspaceId(String workspaceId) async {
    _wsId = workspaceId;
  }

  @override
  String? getSelectedWorkspaceId() => _wsId;

  @override
  Future<void> clearWorkspaceId() async {
    _wsId = null;
  }
}

class MockAuthController extends AuthController {
  MockAuthController() : super(FakeAuthRepository()) {
    state = const AsyncValue.data(
      UserEntity(
        id: 'u-1',
        email: 'test@meetly.local',
        name: 'Test User',
      ),
    );
  }

  @override
  Future<void> checkAuthStatus() async {
    state = const AsyncValue.data(
      UserEntity(
        id: 'u-1',
        email: 'test@meetly.local',
        name: 'Test User',
      ),
    );
  }
}

class MockSelectedWorkspaceNotifier extends SelectedWorkspaceNotifier {
  MockSelectedWorkspaceNotifier() : super(FakeLocalStorageService()) {
    state = const WorkspaceEntity(
      id: 'ws-1',
      name: 'Meetly Workspace',
      userId: 'u-1',
    );
  }
}

void main() {
  group('TaskCardItem Widget Tests', () {
    testWidgets('renders task title, priority, due date, and checkbox',
        (tester) async {
      bool toggled = false;
      final task = TaskEntity(
        id: 't-1',
        name: 'Hoàn thiện tài liệu kiến trúc',
        status: TaskStatus.todo,
        priority: TaskPriority.high,
        workspaceId: 'ws-1',
        projectId: 'p-1',
        projectName: 'Mobile App',
        dueDate: DateTime(2026, 9, 20),
        createdAt: DateTime(2026, 9, 1),
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.lightTheme,
          home: Scaffold(
            body: TaskCardItem(
              task: task,
              onToggleStatus: (val) {
                toggled = val;
              },
            ),
          ),
        ),
      );

      expect(find.text('Hoàn thiện tài liệu kiến trúc'), findsOneWidget);
      expect(find.text('Mobile App'), findsOneWidget);
      expect(find.text('Cao'), findsOneWidget); // High priority label

      // Tap Checkbox
      await tester.tap(find.byType(InkWell).first);
      await tester.pumpAndSettle();

      expect(toggled, isTrue);
    });

    testWidgets('renders source meeting button when source meeting exists',
        (tester) async {
      final task = TaskEntity(
        id: 't-2',
        name: 'Kiểm thử tính năng Auth',
        status: TaskStatus.inProgress,
        priority: TaskPriority.urgent,
        workspaceId: 'ws-1',
        projectId: 'p-1',
        sourceMeetingId: 'meet-123',
        sourceMeetingTitle: 'Họp Kickoff Sprint 14',
        createdAt: DateTime(2026, 9, 1),
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.lightTheme,
          home: Scaffold(
            body: TaskCardItem(task: task),
          ),
        ),
      );

      expect(find.text('Họp Kickoff Sprint 14'), findsOneWidget);
      expect(find.byIcon(Icons.graphic_eq_rounded), findsOneWidget);
    });
  });

  group('MyTasksScreen Widget Tests', () {
    late FakeTaskRepository fakeRepository;

    setUp(() {
      fakeRepository = FakeTaskRepository();
    });

    testWidgets('renders 4 tabs: Quá hạn, Hôm nay, Tuần này, Sắp tới',
        (tester) async {
      final now = DateTime.now();
      fakeRepository.tasks = [
        TaskEntity(
          id: 't-overdue',
          name: 'Task đã trễ',
          status: TaskStatus.todo,
          priority: TaskPriority.high,
          workspaceId: 'ws-1',
          projectId: 'p-1',
          dueDate: now.subtract(const Duration(days: 2)),
          createdAt: now,
        ),
        TaskEntity(
          id: 't-today',
          name: 'Task cần làm hôm nay',
          status: TaskStatus.inProgress,
          priority: TaskPriority.medium,
          workspaceId: 'ws-1',
          projectId: 'p-1',
          dueDate: now,
          createdAt: now,
        ),
      ];

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            myTasksProvider.overrideWith(
              (ref) => MyTasksNotifier(fakeRepository),
            ),
            authControllerProvider.overrideWith(
              (ref) => MockAuthController(),
            ),
            selectedWorkspaceProvider.overrideWith(
              (ref) => MockSelectedWorkspaceNotifier(),
            ),
          ],
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: const MyTasksScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Check 4 tabs exist
      expect(find.text('Quá hạn'), findsOneWidget);
      expect(find.text('Hôm nay'), findsOneWidget);
      expect(find.text('Tuần này'), findsOneWidget);
      expect(find.text('Sắp tới'), findsOneWidget);

      // First tab (Quá hạn) shows the overdue task
      expect(find.text('Task đã trễ'), findsOneWidget);

      // Switch to tab 2 (Hôm nay)
      await tester.tap(find.text('Hôm nay'));
      await tester.pumpAndSettle();

      expect(find.text('Task cần làm hôm nay'), findsOneWidget);
    });

    testWidgets('shows skeleton list when in loading state', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.lightTheme,
          home: const Scaffold(
            body: MyTasksSkeletonList(itemCount: 4),
          ),
        ),
      );

      expect(find.byType(TaskCardSkeleton), findsNWidgets(4));
    });
  });
}

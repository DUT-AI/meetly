import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:meetly_mobile/core/router/route_names.dart';
import 'package:meetly_mobile/features/auth/presentation/screens/login_screen.dart';
import 'package:meetly_mobile/features/auth/presentation/screens/splash_screen.dart';
import 'package:meetly_mobile/features/project/presentation/screens/project_list_screen.dart';
import 'package:meetly_mobile/features/task/presentation/screens/my_tasks_screen.dart';
import 'package:meetly_mobile/features/task/presentation/screens/task_detail_screen.dart';
import 'package:meetly_mobile/features/workspace/presentation/screens/workspace_list_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: RouteNames.splash,
    debugLogDiagnostics: true,
    routes: [
      GoRoute(
        path: RouteNames.splash,
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: RouteNames.login,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: RouteNames.myTasks,
        builder: (context, state) => const MyTasksScreen(),
      ),
      GoRoute(
        path: RouteNames.taskDetail,
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return TaskDetailScreen(taskId: id);
        },
      ),
      GoRoute(
        path: RouteNames.workspaces,
        builder: (context, state) => const WorkspaceListScreen(),
      ),
      GoRoute(
        path: RouteNames.projects,
        builder: (context, state) => const ProjectListScreen(),
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Text('Không tìm thấy trang: ${state.error}'),
      ),
    ),
  );
});

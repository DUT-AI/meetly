import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:meetly_mobile/core/network/api_exception.dart';
import 'package:meetly_mobile/core/router/route_names.dart';
import 'package:meetly_mobile/core/widgets/app_button.dart';
import 'package:meetly_mobile/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:meetly_mobile/features/auth/domain/entities/user_entity.dart';
import 'package:meetly_mobile/features/auth/domain/repositories/auth_repository.dart';
import 'package:meetly_mobile/features/auth/presentation/screens/login_screen.dart';

class MockAuthRepository implements AuthRepository {
  bool shouldThrow = false;
  String errorMessage = 'Lỗi kết nối máy chủ';
  bool wasLoginCalled = false;

  @override
  Future<UserEntity> login(String email, String password) async {
    wasLoginCalled = true;
    if (shouldThrow) {
      throw ApiException(message: errorMessage);
    }
    return const UserEntity(
      id: 1,
      email: 'test@meetly.local',
      name: 'Test User',
    );
  }

  @override
  Future<UserEntity?> getCurrentUser() async => null;

  @override
  Future<void> logout() async {}

  @override
  Future<bool> isAuthenticated() async => false;
}

void main() {
  late MockAuthRepository mockAuthRepository;

  setUp(() {
    mockAuthRepository = MockAuthRepository();
  });

  Widget buildTestWidget({GoRouter? router}) {
    final testRouter = router ??
        GoRouter(
          initialLocation: RouteNames.login,
          routes: [
            GoRoute(
              path: RouteNames.login,
              builder: (context, state) => const LoginScreen(),
            ),
            GoRoute(
              path: RouteNames.workspaces,
              builder: (context, state) =>
                  const Scaffold(body: Text('Workspace Screen')),
            ),
          ],
        );

    return ProviderScope(
      overrides: [
        authRepositoryProvider.overrideWithValue(mockAuthRepository),
      ],
      child: MaterialApp.router(
        routerConfig: testRouter,
      ),
    );
  }

  group('LoginScreen Form Validation Tests', () {
    testWidgets('shows validation errors when fields are empty',
        (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      // Clear the default text
      final textFields = find.byType(TextFormField);
      expect(textFields, findsNWidgets(2));

      await tester.enterText(textFields.first, '');
      await tester.enterText(textFields.last, '');

      // Tap login button
      await tester.tap(find.byType(AppButton));
      await tester.pumpAndSettle();

      expect(find.text('Vui lòng nhập email'), findsOneWidget);
      expect(find.text('Vui lòng nhập mật khẩu'), findsOneWidget);
    });

    testWidgets('shows validation error when email is invalid',
        (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      final textFields = find.byType(TextFormField);
      await tester.enterText(textFields.first, 'invalid-email-format');
      await tester.enterText(textFields.last, 'ValidPassword123');

      await tester.tap(find.byType(AppButton));
      await tester.pumpAndSettle();

      expect(find.text('Email không đúng định dạng'), findsOneWidget);
    });

    testWidgets('shows validation error when password is less than 6 characters',
        (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      final textFields = find.byType(TextFormField);
      await tester.enterText(textFields.first, 'valid@meetly.local');
      await tester.enterText(textFields.last, '12345');

      await tester.tap(find.byType(AppButton));
      await tester.pumpAndSettle();

      expect(find.text('Mật khẩu phải có ít nhất 6 ký tự'), findsOneWidget);
    });
  });

  group('LoginScreen Network Error and Navigation Tests', () {
    testWidgets('displays SnackBar on network/auth error', (tester) async {
      mockAuthRepository.shouldThrow = true;
      mockAuthRepository.errorMessage = 'Sai mật khẩu hoặc email không tồn tại';

      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      await tester.tap(find.byType(AppButton));
      await tester.pumpAndSettle();

      expect(find.byType(SnackBar), findsOneWidget);
      expect(find.text('Sai mật khẩu hoặc email không tồn tại'), findsOneWidget);
    });

    testWidgets('navigates to workspaces on successful login', (tester) async {
      mockAuthRepository.shouldThrow = false;

      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      await tester.tap(find.byType(AppButton));
      await tester.pumpAndSettle();

      expect(mockAuthRepository.wasLoginCalled, isTrue);
      expect(find.text('Workspace Screen'), findsOneWidget);
    });
  });
}

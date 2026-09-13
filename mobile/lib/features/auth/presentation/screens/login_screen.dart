import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:meetly_mobile/core/network/api_exception.dart';
import 'package:meetly_mobile/core/router/route_names.dart';
import 'package:meetly_mobile/core/theme/app_colors.dart';
import 'package:meetly_mobile/core/theme/app_spacing.dart';
import 'package:meetly_mobile/core/theme/text_styles.dart';
import 'package:meetly_mobile/core/widgets/app_button.dart';
import 'package:meetly_mobile/core/widgets/app_text_field.dart';
import 'package:meetly_mobile/features/auth/presentation/controllers/auth_controller.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController(text: 'vuongngochau2004@gmail.com');
  final _passwordController = TextEditingController(text: '0393453221');
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    final success = await ref.read(authControllerProvider.notifier).login(
          _emailController.text.trim(),
          _passwordController.text,
        );

    if (success && mounted) {
      context.go(RouteNames.workspaces);
    }
  }

  String _getErrorMessage(Object error) {
    if (error is ApiException) {
      return error.message;
    }
    final errStr = error.toString();
    if (errStr.startsWith('Exception: ')) {
      return errStr.substring(11);
    }
    return errStr;
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final authState = ref.watch(authControllerProvider);
    final isLoading = authState.isLoading;

    ref.listen(authControllerProvider, (previous, next) {
      if (next.hasError && !next.isLoading) {
        final message = _getErrorMessage(next.error!);
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error_outline_rounded, color: Colors.white, size: 20),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Text(
                    message,
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                  ),
                ),
              ],
            ),
            backgroundColor: colors.error,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: AppSpacing.roundedMd,
            ),
            duration: const Duration(seconds: 4),
          ),
        );
      }
    });

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: colors.primary.withValues(alpha: 0.1),
                        borderRadius: AppSpacing.roundedLg,
                      ),
                      child: Icon(
                        Icons.hub_rounded,
                        size: 48,
                        color: colors.primary,
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  const Text(
                    'Đăng nhập vào Meetly',
                    textAlign: TextAlign.center,
                    style: TextStyles.h1,
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    'Chào mừng bạn trở lại! Nhập thông tin để tiếp tục.',
                    textAlign: TextAlign.center,
                    style: TextStyles.caption.copyWith(color: colors.onMuted),
                  ),
                  const SizedBox(height: AppSpacing.xxl),
                  AppTextField(
                    controller: _emailController,
                    labelText: 'Email',
                    hintText: 'user@meetly.local',
                    enabled: !isLoading,
                    keyboardType: TextInputType.emailAddress,
                    prefixIcon: const Icon(Icons.email_outlined, size: 20),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Vui lòng nhập email';
                      }
                      final emailRegex =
                          RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,}$');
                      if (!emailRegex.hasMatch(value.trim())) {
                        return 'Email không đúng định dạng';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: AppSpacing.md),
                  AppTextField(
                    controller: _passwordController,
                    labelText: 'Mật khẩu',
                    hintText: '••••••••',
                    enabled: !isLoading,
                    obscureText: _obscurePassword,
                    prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20),
                    suffixIcon: MinTouchTarget(
                      child: IconButton(
                        icon: Icon(
                          _obscurePassword
                              ? Icons.visibility_off_outlined
                              : Icons.visibility_outlined,
                          size: 20,
                        ),
                        onPressed: () {
                          setState(() {
                            _obscurePassword = !_obscurePassword;
                          });
                        },
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Vui lòng nhập mật khẩu';
                      }
                      if (value.length < 6) {
                        return 'Mật khẩu phải có ít nhất 6 ký tự';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  AppButton(
                    text: 'Đăng nhập',
                    isLoading: isLoading,
                    onPressed: _handleLogin,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    'Meetly Mobile v1.0.0 • Protected by SecureStorage',
                    textAlign: TextAlign.center,
                    style: TextStyles.caption.copyWith(
                      fontSize: 11,
                      color: colors.onMuted,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

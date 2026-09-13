import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../theme/text_styles.dart';

enum AppButtonVariant {
  primary,
  secondary,
  outlined,
  destructive,
  ghost,
}

enum AppButtonSize {
  small(38, 14, 12),
  medium(48, 18, 14), // Default touch target >= 48dp
  large(54, 24, 16);

  final double height;
  final double horizontalPadding;
  final double fontSize;

  const AppButtonSize(this.height, this.horizontalPadding, this.fontSize);
}

/// Component Button chuẩn hóa theo UI/UX Pro Max:
/// - Đảm bảo Touch target >= 48dp (với size medium/large hoặc MinTouchTarget)
/// - Visual Feedback: Material ink ripple + Micro-animation scale nhấn (0.98)
/// - Haptic Feedback: Rung nhẹ khi tương tác thành công
/// - Xử lý mượt mà trạng thái Loading và Disabled
class AppButton extends StatefulWidget {
  final String text;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final AppButtonSize size;
  final bool isLoading;
  final bool isFullWidth;
  final Widget? icon;
  final Widget? trailingIcon;
  final bool enableHaptic;

  const AppButton({
    super.key,
    required this.text,
    this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.size = AppButtonSize.medium,
    this.isLoading = false,
    this.isFullWidth = true,
    this.icon,
    this.trailingIcon,
    this.enableHaptic = true,
  });

  const AppButton.outlined({
    super.key,
    required this.text,
    this.onPressed,
    this.size = AppButtonSize.medium,
    this.isLoading = false,
    this.isFullWidth = true,
    this.icon,
    this.trailingIcon,
    this.enableHaptic = true,
  }) : variant = AppButtonVariant.outlined;

  const AppButton.secondary({
    super.key,
    required this.text,
    this.onPressed,
    this.size = AppButtonSize.medium,
    this.isLoading = false,
    this.isFullWidth = true,
    this.icon,
    this.trailingIcon,
    this.enableHaptic = true,
  }) : variant = AppButtonVariant.secondary;

  const AppButton.destructive({
    super.key,
    required this.text,
    this.onPressed,
    this.size = AppButtonSize.medium,
    this.isLoading = false,
    this.isFullWidth = true,
    this.icon,
    this.trailingIcon,
    this.enableHaptic = true,
  }) : variant = AppButtonVariant.destructive;

  const AppButton.ghost({
    super.key,
    required this.text,
    this.onPressed,
    this.size = AppButtonSize.medium,
    this.isLoading = false,
    this.isFullWidth = false,
    this.icon,
    this.trailingIcon,
    this.enableHaptic = true,
  }) : variant = AppButtonVariant.ghost;

  @override
  State<AppButton> createState() => _AppButtonState();
}

class _AppButtonState extends State<AppButton> with SingleTickerProviderStateMixin {
  late AnimationController _pressAnimController;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _pressAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 100),
      reverseDuration: const Duration(milliseconds: 150),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.975).animate(
      CurvedAnimation(parent: _pressAnimController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pressAnimController.dispose();
    super.dispose();
  }

  void _handleTapDown(TapDownDetails _) {
    if (widget.onPressed != null && !widget.isLoading) {
      _pressAnimController.forward();
    }
  }

  void _handleTapUp(TapUpDetails _) {
    if (widget.onPressed != null && !widget.isLoading) {
      _pressAnimController.reverse();
    }
  }

  void _handleTapCancel() {
    _pressAnimController.reverse();
  }

  void _handleTap() {
    if (widget.onPressed == null || widget.isLoading) return;
    if (widget.enableHaptic) {
      HapticFeedback.lightImpact();
    }
    widget.onPressed!();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final isEnabled = widget.onPressed != null && !widget.isLoading;

    Color backgroundColor;
    Color textColor;
    BorderSide borderSide = BorderSide.none;

    switch (widget.variant) {
      case AppButtonVariant.primary:
        backgroundColor = colors.primary;
        textColor = colors.onPrimary;
        break;
      case AppButtonVariant.secondary:
        backgroundColor = colors.surfaceVariant;
        textColor = colors.onSurface;
        break;
      case AppButtonVariant.outlined:
        backgroundColor = Colors.transparent;
        textColor = colors.onSurface;
        borderSide = BorderSide(color: colors.border, width: 1.2);
        break;
      case AppButtonVariant.destructive:
        backgroundColor = colors.error;
        textColor = colors.onError;
        break;
      case AppButtonVariant.ghost:
        backgroundColor = Colors.transparent;
        textColor = colors.primary;
        break;
    }

    final effectiveHeight = widget.size.height;
    // Bọc tối thiểu 48dp cho touch target nếu kích thước hiển thị nhỏ hơn 48dp
    final needsTouchTargetExpansion = effectiveHeight < AppSpacing.minTouchTarget;

    Widget buttonContent = AnimatedBuilder(
      animation: _scaleAnimation,
      builder: (context, child) => Transform.scale(
        scale: _scaleAnimation.value,
        child: child,
      ),
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 150),
        opacity: isEnabled ? 1.0 : 0.48,
        child: Material(
          color: backgroundColor,
          shape: RoundedRectangleBorder(
            borderRadius: AppSpacing.roundedMd,
            side: borderSide,
          ),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTapDown: isEnabled ? _handleTapDown : null,
            onTapUp: isEnabled ? _handleTapUp : null,
            onTapCancel: isEnabled ? _handleTapCancel : null,
            onTap: isEnabled ? _handleTap : null,
            splashColor: colors.splashColor,
            highlightColor: colors.highlightColor,
            child: Container(
              height: effectiveHeight,
              padding: EdgeInsets.symmetric(
                horizontal: widget.size.horizontalPadding,
              ),
              alignment: Alignment.center,
              child: widget.isLoading
                  ? SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.2,
                        valueColor: AlwaysStoppedAnimation<Color>(textColor),
                      ),
                    )
                  : Row(
                      mainAxisSize: widget.isFullWidth ? MainAxisSize.max : MainAxisSize.min,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        if (widget.icon != null) ...[
                          IconTheme(
                            data: IconThemeData(color: textColor, size: 18),
                            child: widget.icon!,
                          ),
                          const SizedBox(width: AppSpacing.xs),
                        ],
                        Text(
                          widget.text,
                          style: TextStyles.labelLarge.copyWith(
                            color: textColor,
                            fontSize: widget.size.fontSize,
                          ),
                        ),
                        if (widget.trailingIcon != null) ...[
                          const SizedBox(width: AppSpacing.xs),
                          IconTheme(
                            data: IconThemeData(color: textColor, size: 18),
                            child: widget.trailingIcon!,
                          ),
                        ],
                      ],
                    ),
            ),
          ),
        ),
      ),
    );

    if (widget.isFullWidth) {
      buttonContent = SizedBox(width: double.infinity, child: buttonContent);
    }

    if (needsTouchTargetExpansion) {
      return MinTouchTarget(child: buttonContent);
    }

    return buttonContent;
  }
}

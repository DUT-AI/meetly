import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';

enum AppCardVariant {
  flat,      // Border only, elevation 0 (chuẩn Web shadcn)
  elevated,  // Đổ bóng nhẹ phân tách layer
  tinted,    // Nền nhuộm nhẹ màu surfaceVariant
}

/// Component Card tái sử dụng theo chuẩn UI/UX Pro Max:
/// - Visual Feedback: Material Ink ripple + Subtle Scale nhấn (0.988)
/// - Haptic Feedback: Rung nhẹ khi chạm tương tác
/// - Tự động thích ứng màu sắc viền và nền giữa Light & Dark Mode
class AppCard extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final EdgeInsetsGeometry padding;
  final BorderRadius? borderRadius;
  final AppCardVariant variant;
  final Color? backgroundColor;
  final BorderSide? borderSide;
  final bool enableHaptic;

  const AppCard({
    super.key,
    required this.child,
    this.onTap,
    this.onLongPress,
    this.padding = AppSpacing.cardPadding,
    this.borderRadius,
    this.variant = AppCardVariant.flat,
    this.backgroundColor,
    this.borderSide,
    this.enableHaptic = true,
  });

  const AppCard.elevated({
    super.key,
    required this.child,
    this.onTap,
    this.onLongPress,
    this.padding = AppSpacing.cardPadding,
    this.borderRadius,
    this.backgroundColor,
    this.borderSide,
    this.enableHaptic = true,
  }) : variant = AppCardVariant.elevated;

  const AppCard.tinted({
    super.key,
    required this.child,
    this.onTap,
    this.onLongPress,
    this.padding = AppSpacing.cardPadding,
    this.borderRadius,
    this.backgroundColor,
    this.borderSide,
    this.enableHaptic = true,
  }) : variant = AppCardVariant.tinted;

  @override
  State<AppCard> createState() => _AppCardState();
}

class _AppCardState extends State<AppCard> with SingleTickerProviderStateMixin {
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
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.988).animate(
      CurvedAnimation(parent: _pressAnimController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pressAnimController.dispose();
    super.dispose();
  }

  void _handleTapDown(TapDownDetails _) {
    if (widget.onTap != null) {
      _pressAnimController.forward();
    }
  }

  void _handleTapUp(TapUpDetails _) {
    if (widget.onTap != null) {
      _pressAnimController.reverse();
    }
  }

  void _handleTapCancel() {
    _pressAnimController.reverse();
  }

  void _handleTap() {
    if (widget.onTap == null) return;
    if (widget.enableHaptic) {
      HapticFeedback.selectionClick();
    }
    widget.onTap!();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final effectiveRadius = widget.borderRadius ?? AppSpacing.roundedMd;
    final isInteractive = widget.onTap != null || widget.onLongPress != null;

    Color cardBg;
    switch (widget.variant) {
      case AppCardVariant.flat:
      case AppCardVariant.elevated:
        cardBg = widget.backgroundColor ?? colors.card;
        break;
      case AppCardVariant.tinted:
        cardBg = widget.backgroundColor ?? colors.surfaceVariant;
        break;
    }

    final effectiveBorder = widget.borderSide ??
        BorderSide(
          color: colors.border,
          width: 1.0,
        );

    final boxShadow = widget.variant == AppCardVariant.elevated
        ? [
            BoxShadow(
              color: Colors.black.withOpacity(context.isDarkMode ? 0.3 : 0.05),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ]
        : null;

    Widget cardWidget = Container(
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: effectiveRadius,
        border: Border.fromBorderSide(effectiveBorder),
        boxShadow: boxShadow,
      ),
      child: Material(
        color: Colors.transparent,
        clipBehavior: Clip.antiAlias,
        borderRadius: effectiveRadius,
        child: isInteractive
            ? InkWell(
                onTapDown: _handleTapDown,
                onTapUp: _handleTapUp,
                onTapCancel: _handleTapCancel,
                onTap: _handleTap,
                onLongPress: widget.onLongPress != null
                    ? () {
                        if (widget.enableHaptic) {
                          HapticFeedback.mediumImpact();
                        }
                        widget.onLongPress!();
                      }
                    : null,
                splashColor: colors.splashColor,
                highlightColor: colors.highlightColor,
                child: Padding(
                  padding: widget.padding,
                  child: widget.child,
                ),
              )
            : Padding(
                padding: widget.padding,
                child: widget.child,
              ),
      ),
    );

    if (isInteractive) {
      return AnimatedBuilder(
        animation: _scaleAnimation,
        builder: (context, child) => Transform.scale(
          scale: _scaleAnimation.value,
          child: child,
        ),
        child: cardWidget,
      );
    }

    return cardWidget;
  }
}

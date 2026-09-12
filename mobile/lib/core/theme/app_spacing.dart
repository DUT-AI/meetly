import 'package:flutter/material.dart';

/// Chuẩn hóa hệ thống Spacing (4/8dp rhythm), Radius, Touch Target và Safe Area
class AppSpacing {
  AppSpacing._();

  // ==========================================
  // TOUCH TARGET STANDARD (>= 48dp theo WCAG & Material)
  // ==========================================
  static const double minTouchTarget = 48.0;

  // ==========================================
  // SPACING SCALE (4/8dp rhythm)
  // ==========================================
  static const double xxs = 4.0;
  static const double xs = 8.0;
  static const double sm = 12.0;
  static const double md = 16.0;
  static const double lg = 20.0;
  static const double xl = 24.0;
  static const double xxl = 32.0;
  static const double xxxl = 40.0;
  static const double huge = 48.0;

  // ==========================================
  // BORDER RADIUS SCALE
  // ==========================================
  static const double radiusXs = 4.0;
  static const double radiusSm = 8.0;
  static const double radiusMd = 12.0;
  static const double radiusLg = 16.0;
  static const double radiusXl = 24.0;
  static const double radiusFull = 9999.0;

  static BorderRadius get roundedXs => BorderRadius.circular(radiusXs);
  static BorderRadius get roundedSm => BorderRadius.circular(radiusSm);
  static BorderRadius get roundedMd => BorderRadius.circular(radiusMd);
  static BorderRadius get roundedLg => BorderRadius.circular(radiusLg);
  static BorderRadius get roundedXl => BorderRadius.circular(radiusXl);
  static BorderRadius get roundedFull => BorderRadius.circular(radiusFull);

  // ==========================================
  // COMMON PADDING INSETS
  // ==========================================
  static const EdgeInsets pagePadding = EdgeInsets.symmetric(horizontal: md, vertical: sm);
  static const EdgeInsets cardPadding = EdgeInsets.all(md);
  static const EdgeInsets buttonPadding = EdgeInsets.symmetric(horizontal: xl, vertical: sm);
  static const EdgeInsets dialogPadding = EdgeInsets.all(xl);
}

/// Extension hỗ trợ tính toán Safe Area padding và touch target
extension BuildContextSpacingExtension on BuildContext {
  EdgeInsets get mediaQueryPadding => MediaQuery.of(this).padding;
  EdgeInsets get mediaQueryViewInsets => MediaQuery.of(this).viewInsets;

  double get safeTop => MediaQuery.of(this).padding.top;
  double get safeBottom => MediaQuery.of(this).padding.bottom;
  double get safeLeft => MediaQuery.of(this).padding.left;
  double get safeRight => MediaQuery.of(this).padding.right;

  /// Đảm bảo khoảng cách đệm đáy tối thiểu 16dp hoặc cộng thêm safe bottom
  EdgeInsets get bottomBarPadding => EdgeInsets.only(
        left: AppSpacing.md,
        right: AppSpacing.md,
        top: AppSpacing.sm,
        bottom: safeBottom > 0 ? safeBottom : AppSpacing.md,
      );
}

/// Widget bọc để đảm bảo touch target luôn đạt tối thiểu 48x48dp mà không làm vỡ layout
class MinTouchTarget extends StatelessWidget {
  final Widget child;
  final double minWidth;
  final double minHeight;

  const MinTouchTarget({
    super.key,
    required this.child,
    this.minWidth = AppSpacing.minTouchTarget,
    this.minHeight = AppSpacing.minTouchTarget,
  });

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: BoxConstraints(
        minWidth: minWidth,
        minHeight: minHeight,
      ),
      child: Center(
        widthFactor: 1.0,
        heightFactor: 1.0,
        child: child,
      ),
    );
  }
}

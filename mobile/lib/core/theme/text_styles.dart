import 'package:flutter/material.dart';
import 'app_colors.dart';

/// Typography Scale tuân thủ WCAG và chuẩn mobile của ui-ux-pro-max
/// (Base body 16px, line-height 1.4-1.5, hỗ trợ Dynamic Type)
class TextStyles {
  TextStyles._();

  // ==========================================
  // HEADLINES & DISPLAY
  // ==========================================
  static const TextStyle display = TextStyle(
    fontSize: 32,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.75,
    height: 1.25,
  );

  static const TextStyle h1 = TextStyle(
    fontSize: 26,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.5,
    height: 1.3,
  );

  static const TextStyle h2 = TextStyle(
    fontSize: 22,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.3,
    height: 1.35,
  );

  static const TextStyle h3 = TextStyle(
    fontSize: 18,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.2,
    height: 1.4,
  );

  // ==========================================
  // TITLES
  // ==========================================
  static const TextStyle titleLarge = TextStyle(
    fontSize: 18,
    fontWeight: FontWeight.w600,
    height: 1.35,
  );

  static const TextStyle titleMedium = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    height: 1.4,
  );

  static const TextStyle titleSmall = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    height: 1.4,
  );

  // ==========================================
  // BODY (Tối thiểu 16px cho body chính để tránh zoom iOS)
  // ==========================================
  static const TextStyle bodyLarge = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w400,
    height: 1.5,
  );

  static const TextStyle body = TextStyle(
    fontSize: 15,
    fontWeight: FontWeight.w400,
    height: 1.45,
  );

  static const TextStyle bodyMedium = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    height: 1.45,
  );

  static const TextStyle bodyBold = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    height: 1.45,
  );

  // ==========================================
  // LABELS & CAPTION
  // ==========================================
  static const TextStyle labelLarge = TextStyle(
    fontSize: 15,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.1,
    height: 1.3,
  );

  static const TextStyle labelMedium = TextStyle(
    fontSize: 13,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.1,
    height: 1.3,
  );

  static const TextStyle labelSmall = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.4,
    height: 1.3,
  );

  static const TextStyle caption = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    color: AppColors.slate500,
    height: 1.4,
  );

  static const TextStyle code = TextStyle(
    fontFamily: 'monospace',
    fontSize: 13,
    height: 1.4,
  );

  /// Tạo Material TextTheme hoàn chỉnh cho ThemeData
  static TextTheme createTextTheme(Color defaultTextColor) {
    return TextTheme(
      displayLarge: display.copyWith(color: defaultTextColor),
      headlineLarge: h1.copyWith(color: defaultTextColor),
      headlineMedium: h2.copyWith(color: defaultTextColor),
      headlineSmall: h3.copyWith(color: defaultTextColor),
      titleLarge: titleLarge.copyWith(color: defaultTextColor),
      titleMedium: titleMedium.copyWith(color: defaultTextColor),
      titleSmall: titleSmall.copyWith(color: defaultTextColor),
      bodyLarge: bodyLarge.copyWith(color: defaultTextColor),
      bodyMedium: bodyMedium.copyWith(color: defaultTextColor),
      bodySmall: caption.copyWith(color: defaultTextColor.withOpacity(0.7)),
      labelLarge: labelLarge.copyWith(color: defaultTextColor),
      labelMedium: labelMedium.copyWith(color: defaultTextColor),
      labelSmall: labelSmall.copyWith(color: defaultTextColor.withOpacity(0.6)),
    );
  }
}

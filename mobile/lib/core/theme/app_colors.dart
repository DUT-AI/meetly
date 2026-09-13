import 'package:flutter/material.dart';

/// Hệ màu Meetly Mobile đồng bộ theo bảng màu Slate / Zinc / Indigo của Web
class AppColors {
  AppColors._();

  // ==========================================
  // BRAND ACCENT - INDIGO PALETTE
  // ==========================================
  static const Color indigo50 = Color(0xFFEEF2FF);
  static const Color indigo100 = Color(0xFFE0E7FF);
  static const Color indigo200 = Color(0xFFC7D2FE);
  static const Color indigo400 = Color(0xFF818CF8);
  static const Color indigo500 = Color(0xFF6366F1); // Primary Light / Dark mode primary
  static const Color indigo600 = Color(0xFF4F46E5); // Primary Brand
  static const Color indigo700 = Color(0xFF4338CA); // Primary Dark / Pressed
  static const Color indigo900 = Color(0xFF312E81);
  static const Color indigo950 = Color(0xFF1E1B4B);

  // ==========================================
  // NEUTRALS - SLATE & ZINC PALETTES
  // ==========================================
  static const Color slate50 = Color(0xFFF8FAFC);
  static const Color slate100 = Color(0xFFF1F5F9);
  static const Color slate200 = Color(0xFFE2E8F0);
  static const Color slate300 = Color(0xFFCBD5E1);
  static const Color slate400 = Color(0xFF94A3B8);
  static const Color slate500 = Color(0xFF64748B);
  static const Color slate600 = Color(0xFF475569);
  static const Color slate700 = Color(0xFF334155);
  static const Color slate800 = Color(0xFF1E293B);
  static const Color slate900 = Color(0xFF0F172A);

  static const Color zinc50 = Color(0xFFFAFAFA);
  static const Color zinc100 = Color(0xFFF4F4F5);
  static const Color zinc200 = Color(0xFFE4E4E7);
  static const Color zinc700 = Color(0xFF3F3F46);
  static const Color zinc800 = Color(0xFF27272A);
  static const Color zinc900 = Color(0xFF18181B);
  static const Color zinc950 = Color(0xFF09090B);

  // ==========================================
  // FEEDBACK & STATUS TOKENS
  // ==========================================
  static const Color success = Color(0xFF10B981); // Emerald 500
  static const Color successBg = Color(0xFFECFDF5);
  static const Color successBgDark = Color(0xFF064E3B);

  static const Color warning = Color(0xFFF59E0B); // Amber 500
  static const Color warningBg = Color(0xFFFFFBEB);
  static const Color warningBgDark = Color(0xFF78350F);

  static const Color error = Color(0xFFEF4444); // Red 500
  static const Color errorBg = Color(0xFFFEF2F2);
  static const Color errorBgDark = Color(0xFF7F1D1D);

  static const Color info = Color(0xFF3B82F6); // Blue 500
  static const Color audioWaveform = Color(0xFFF59E0B); // Amber 500
  static const Color audioAccent = Color(0xFFFBBF24);

  // Task Status Colors
  static const Color statusBacklog = slate400;
  static const Color statusTodo = Color(0xFF3B82F6);
  static const Color statusInProgress = Color(0xFFF59E0B);
  static const Color statusInReview = Color(0xFF8B5CF6);
  static const Color statusDone = Color(0xFF10B981);

  // Task Priority Colors
  static const Color priorityLow = slate500;
  static const Color priorityMedium = Color(0xFF3B82F6);
  static const Color priorityHigh = Color(0xFFF97316);
  static const Color priorityUrgent = Color(0xFFEF4444);

  // Legacy aliases for backward compatibility
  static const Color primary = indigo600;
  static const Color primaryLight = indigo500;
  static const Color primaryDark = indigo700;
  static const Color backgroundLight = slate50;
  static const Color surfaceLight = Colors.white;
  static const Color cardLight = Colors.white;
  static const Color backgroundDark = zinc950;
  static const Color surfaceDark = zinc900;
  static const Color cardDark = zinc900;
  static const Color border = slate200;
  static const Color borderDark = zinc800;
  static const Color textPrimary = slate900;
  static const Color textSecondary = slate600;
  static const Color textMuted = slate400;
}

/// ThemeExtension cung cấp Semantic Color Tokens theo ngữ cảnh Light/Dark Mode
@immutable
class AppColorTokens extends ThemeExtension<AppColorTokens> {
  // Brand
  final Color primary;
  final Color onPrimary;
  final Color primaryContainer;
  final Color onPrimaryContainer;

  // Background & Surfaces
  final Color background;
  final Color onBackground;
  final Color surface;
  final Color onSurface;
  final Color surfaceVariant;
  final Color onSurfaceVariant;
  final Color card;
  final Color onCard;

  // Borders & Dividers
  final Color border;
  final Color borderSubtle;

  // Muted & Subtle
  final Color muted;
  final Color onMuted;

  // Semantic Feedback
  final Color error;
  final Color onError;
  final Color errorContainer;
  final Color success;
  final Color onSuccess;
  final Color warning;
  final Color onWarning;

  // Interactive states
  final Color splashColor;
  final Color highlightColor;

  const AppColorTokens({
    required this.primary,
    required this.onPrimary,
    required this.primaryContainer,
    required this.onPrimaryContainer,
    required this.background,
    required this.onBackground,
    required this.surface,
    required this.onSurface,
    required this.surfaceVariant,
    required this.onSurfaceVariant,
    required this.card,
    required this.onCard,
    required this.border,
    required this.borderSubtle,
    required this.muted,
    required this.onMuted,
    required this.error,
    required this.onError,
    required this.errorContainer,
    required this.success,
    required this.onSuccess,
    required this.warning,
    required this.onWarning,
    required this.splashColor,
    required this.highlightColor,
  });

  /// Light Mode Palette (Zinc/Slate + Indigo 600)
  factory AppColorTokens.light() {
    return const AppColorTokens(
      primary: AppColors.indigo600,
      onPrimary: Colors.white,
      primaryContainer: AppColors.indigo50,
      onPrimaryContainer: AppColors.indigo900,
      background: AppColors.slate50,
      onBackground: AppColors.slate900,
      surface: Colors.white,
      onSurface: AppColors.slate900,
      surfaceVariant: AppColors.slate100,
      onSurfaceVariant: AppColors.slate600,
      card: Colors.white,
      onCard: AppColors.slate900,
      border: AppColors.slate200,
      borderSubtle: AppColors.slate100,
      muted: AppColors.slate100,
      onMuted: AppColors.slate500,
      error: AppColors.error,
      onError: Colors.white,
      errorContainer: AppColors.errorBg,
      success: AppColors.success,
      onSuccess: Colors.white,
      warning: AppColors.warning,
      onWarning: Colors.white,
      splashColor: Color(0x1F4F46E5), // Indigo 600 at ~12% opacity
      highlightColor: Color(0x0A4F46E5),
    );
  }

  /// Dark Mode Palette (Zinc 950 + Indigo 500)
  factory AppColorTokens.dark() {
    return const AppColorTokens(
      primary: AppColors.indigo500,
      onPrimary: Colors.white,
      primaryContainer: AppColors.indigo950,
      onPrimaryContainer: AppColors.indigo200,
      background: AppColors.zinc950,
      onBackground: AppColors.slate50,
      surface: AppColors.zinc900,
      onSurface: AppColors.slate50,
      surfaceVariant: AppColors.zinc800,
      onSurfaceVariant: AppColors.slate400,
      card: AppColors.zinc900,
      onCard: AppColors.slate50,
      border: AppColors.zinc800,
      borderSubtle: Color(0xFF1E1E24),
      muted: AppColors.zinc800,
      onMuted: AppColors.slate400,
      error: AppColors.error,
      onError: Colors.white,
      errorContainer: AppColors.errorBgDark,
      success: AppColors.success,
      onSuccess: Colors.white,
      warning: AppColors.warning,
      onWarning: Colors.white,
      splashColor: Color(0x2E6366F1), // Indigo 500 at ~18% opacity
      highlightColor: Color(0x146366F1),
    );
  }

  @override
  AppColorTokens copyWith({
    Color? primary,
    Color? onPrimary,
    Color? primaryContainer,
    Color? onPrimaryContainer,
    Color? background,
    Color? onBackground,
    Color? surface,
    Color? onSurface,
    Color? surfaceVariant,
    Color? onSurfaceVariant,
    Color? card,
    Color? onCard,
    Color? border,
    Color? borderSubtle,
    Color? muted,
    Color? onMuted,
    Color? error,
    Color? onError,
    Color? errorContainer,
    Color? success,
    Color? onSuccess,
    Color? warning,
    Color? onWarning,
    Color? splashColor,
    Color? highlightColor,
  }) {
    return AppColorTokens(
      primary: primary ?? this.primary,
      onPrimary: onPrimary ?? this.onPrimary,
      primaryContainer: primaryContainer ?? this.primaryContainer,
      onPrimaryContainer: onPrimaryContainer ?? this.onPrimaryContainer,
      background: background ?? this.background,
      onBackground: onBackground ?? this.onBackground,
      surface: surface ?? this.surface,
      onSurface: onSurface ?? this.onSurface,
      surfaceVariant: surfaceVariant ?? this.surfaceVariant,
      onSurfaceVariant: onSurfaceVariant ?? this.onSurfaceVariant,
      card: card ?? this.card,
      onCard: onCard ?? this.onCard,
      border: border ?? this.border,
      borderSubtle: borderSubtle ?? this.borderSubtle,
      muted: muted ?? this.muted,
      onMuted: onMuted ?? this.onMuted,
      error: error ?? this.error,
      onError: onError ?? this.onError,
      errorContainer: errorContainer ?? this.errorContainer,
      success: success ?? this.success,
      onSuccess: onSuccess ?? this.onSuccess,
      warning: warning ?? this.warning,
      onWarning: onWarning ?? this.onWarning,
      splashColor: splashColor ?? this.splashColor,
      highlightColor: highlightColor ?? this.highlightColor,
    );
  }

  @override
  AppColorTokens lerp(ThemeExtension<AppColorTokens>? other, double t) {
    if (other is! AppColorTokens) return this;
    return AppColorTokens(
      primary: Color.lerp(primary, other.primary, t)!,
      onPrimary: Color.lerp(onPrimary, other.onPrimary, t)!,
      primaryContainer: Color.lerp(primaryContainer, other.primaryContainer, t)!,
      onPrimaryContainer: Color.lerp(onPrimaryContainer, other.onPrimaryContainer, t)!,
      background: Color.lerp(background, other.background, t)!,
      onBackground: Color.lerp(onBackground, other.onBackground, t)!,
      surface: Color.lerp(surface, other.surface, t)!,
      onSurface: Color.lerp(onSurface, other.onSurface, t)!,
      surfaceVariant: Color.lerp(surfaceVariant, other.surfaceVariant, t)!,
      onSurfaceVariant: Color.lerp(onSurfaceVariant, other.onSurfaceVariant, t)!,
      card: Color.lerp(card, other.card, t)!,
      onCard: Color.lerp(onCard, other.onCard, t)!,
      border: Color.lerp(border, other.border, t)!,
      borderSubtle: Color.lerp(borderSubtle, other.borderSubtle, t)!,
      muted: Color.lerp(muted, other.muted, t)!,
      onMuted: Color.lerp(onMuted, other.onMuted, t)!,
      error: Color.lerp(error, other.error, t)!,
      onError: Color.lerp(onError, other.onError, t)!,
      errorContainer: Color.lerp(errorContainer, other.errorContainer, t)!,
      success: Color.lerp(success, other.success, t)!,
      onSuccess: Color.lerp(onSuccess, other.onSuccess, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      onWarning: Color.lerp(onWarning, other.onWarning, t)!,
      splashColor: Color.lerp(splashColor, other.splashColor, t)!,
      highlightColor: Color.lerp(highlightColor, other.highlightColor, t)!,
    );
  }
}

/// Extension tiện ích trên BuildContext để truy cập nhanh colors và theme
extension BuildContextThemeExtension on BuildContext {
  AppColorTokens get colors =>
      Theme.of(this).extension<AppColorTokens>() ??
      (Theme.of(this).brightness == Brightness.dark
          ? AppColorTokens.dark()
          : AppColorTokens.light());

  bool get isDarkMode => Theme.of(this).brightness == Brightness.dark;
}

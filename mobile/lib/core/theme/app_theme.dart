import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'app_spacing.dart';
import 'text_styles.dart';

class AppTheme {
  AppTheme._();

  // ==========================================
  // LIGHT THEME (Slate / Zinc / Indigo 600)
  // ==========================================
  static ThemeData get lightTheme {
    final colorTokens = AppColorTokens.light();
    final textTheme = TextStyles.createTextTheme(colorTokens.onBackground);

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      primaryColor: colorTokens.primary,
      scaffoldBackgroundColor: colorTokens.background,
      extensions: [colorTokens],
      colorScheme: ColorScheme.light(
        primary: colorTokens.primary,
        onPrimary: colorTokens.onPrimary,
        primaryContainer: colorTokens.primaryContainer,
        onPrimaryContainer: colorTokens.onPrimaryContainer,
        surface: colorTokens.surface,
        onSurface: colorTokens.onSurface,
        surfaceContainerHighest: colorTokens.surfaceVariant,
        onSurfaceVariant: colorTokens.onSurfaceVariant,
        error: colorTokens.error,
        onError: colorTokens.onError,
        outline: colorTokens.border,
      ),
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: colorTokens.surface,
        foregroundColor: colorTokens.onSurface,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        centerTitle: false,
        titleTextStyle: textTheme.titleLarge?.copyWith(
          fontWeight: FontWeight.w700,
          color: colorTokens.onSurface,
        ),
        iconTheme: IconThemeData(
          color: colorTokens.onSurface,
          size: 22,
        ),
      ),
      cardTheme: CardThemeData(
        color: colorTokens.card,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: AppSpacing.roundedMd,
          side: BorderSide(color: colorTokens.border, width: 1),
        ),
      ),
      // Đảm bảo toàn bộ touch targets của button >= 48dp
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: colorTokens.primary,
          foregroundColor: colorTokens.onPrimary,
          minimumSize: const Size(AppSpacing.minTouchTarget, AppSpacing.minTouchTarget),
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: AppSpacing.roundedMd,
          ),
          textStyle: TextStyles.labelLarge,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: colorTokens.primary,
          minimumSize: const Size(AppSpacing.minTouchTarget, AppSpacing.minTouchTarget),
          side: BorderSide(color: colorTokens.border, width: 1.2),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: AppSpacing.roundedMd,
          ),
          textStyle: TextStyles.labelLarge,
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: colorTokens.primary,
          minimumSize: const Size(AppSpacing.minTouchTarget, AppSpacing.minTouchTarget),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: AppSpacing.roundedMd,
          ),
          textStyle: TextStyles.labelLarge,
        ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(
          minimumSize: const Size(AppSpacing.minTouchTarget, AppSpacing.minTouchTarget),
          padding: const EdgeInsets.all(12),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colorTokens.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        constraints: const BoxConstraints(minHeight: AppSpacing.minTouchTarget),
        border: OutlineInputBorder(
          borderRadius: AppSpacing.roundedMd,
          borderSide: BorderSide(color: colorTokens.border, width: 1),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: AppSpacing.roundedMd,
          borderSide: BorderSide(color: colorTokens.border, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: AppSpacing.roundedMd,
          borderSide: BorderSide(color: colorTokens.primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: AppSpacing.roundedMd,
          borderSide: BorderSide(color: colorTokens.error, width: 1),
        ),
        labelStyle: TextStyles.bodyMedium.copyWith(color: colorTokens.onMuted),
        hintStyle: TextStyles.bodyMedium.copyWith(color: AppColors.slate400),
      ),
      dividerTheme: DividerThemeData(
        color: colorTokens.border,
        thickness: 1,
        space: 1,
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: colorTokens.surface,
        modalBackgroundColor: colorTokens.surface,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
      ),
    );
  }

  // ==========================================
  // DARK THEME (Zinc 950 / Zinc 900 / Indigo 500)
  // ==========================================
  static ThemeData get darkTheme {
    final colorTokens = AppColorTokens.dark();
    final textTheme = TextStyles.createTextTheme(colorTokens.onBackground);

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      primaryColor: colorTokens.primary,
      scaffoldBackgroundColor: colorTokens.background,
      extensions: [colorTokens],
      colorScheme: ColorScheme.dark(
        primary: colorTokens.primary,
        onPrimary: colorTokens.onPrimary,
        primaryContainer: colorTokens.primaryContainer,
        onPrimaryContainer: colorTokens.onPrimaryContainer,
        surface: colorTokens.surface,
        onSurface: colorTokens.onSurface,
        surfaceContainerHighest: colorTokens.surfaceVariant,
        onSurfaceVariant: colorTokens.onSurfaceVariant,
        error: colorTokens.error,
        onError: colorTokens.onError,
        outline: colorTokens.border,
      ),
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: colorTokens.surface,
        foregroundColor: colorTokens.onSurface,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        centerTitle: false,
        titleTextStyle: textTheme.titleLarge?.copyWith(
          fontWeight: FontWeight.w700,
          color: colorTokens.onSurface,
        ),
        iconTheme: IconThemeData(
          color: colorTokens.onSurface,
          size: 22,
        ),
      ),
      cardTheme: CardThemeData(
        color: colorTokens.card,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: AppSpacing.roundedMd,
          side: BorderSide(color: colorTokens.border, width: 1),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: colorTokens.primary,
          foregroundColor: colorTokens.onPrimary,
          minimumSize: const Size(AppSpacing.minTouchTarget, AppSpacing.minTouchTarget),
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: AppSpacing.roundedMd,
          ),
          textStyle: TextStyles.labelLarge,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: colorTokens.primary,
          minimumSize: const Size(AppSpacing.minTouchTarget, AppSpacing.minTouchTarget),
          side: BorderSide(color: colorTokens.border, width: 1.2),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: AppSpacing.roundedMd,
          ),
          textStyle: TextStyles.labelLarge,
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: colorTokens.primary,
          minimumSize: const Size(AppSpacing.minTouchTarget, AppSpacing.minTouchTarget),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: AppSpacing.roundedMd,
          ),
          textStyle: TextStyles.labelLarge,
        ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(
          minimumSize: const Size(AppSpacing.minTouchTarget, AppSpacing.minTouchTarget),
          padding: const EdgeInsets.all(12),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colorTokens.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        constraints: const BoxConstraints(minHeight: AppSpacing.minTouchTarget),
        border: OutlineInputBorder(
          borderRadius: AppSpacing.roundedMd,
          borderSide: BorderSide(color: colorTokens.border, width: 1),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: AppSpacing.roundedMd,
          borderSide: BorderSide(color: colorTokens.border, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: AppSpacing.roundedMd,
          borderSide: BorderSide(color: colorTokens.primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: AppSpacing.roundedMd,
          borderSide: BorderSide(color: colorTokens.error, width: 1),
        ),
        labelStyle: TextStyles.bodyMedium.copyWith(color: colorTokens.onMuted),
        hintStyle: TextStyles.bodyMedium.copyWith(color: AppColors.slate500),
      ),
      dividerTheme: DividerThemeData(
        color: colorTokens.border,
        thickness: 1,
        space: 1,
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: colorTokens.surface,
        modalBackgroundColor: colorTokens.surface,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
      ),
    );
  }
}

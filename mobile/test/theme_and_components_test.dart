import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:meetly_mobile/core/theme/app_colors.dart';
import 'package:meetly_mobile/core/theme/app_spacing.dart';
import 'package:meetly_mobile/core/theme/app_theme.dart';
import 'package:meetly_mobile/core/theme/text_styles.dart';
import 'package:meetly_mobile/core/widgets/app_button.dart';
import 'package:meetly_mobile/core/widgets/app_card.dart';

void main() {
  group('Theme System Tests', () {
    test('Light and Dark Color Tokens exist and have high contrast', () {
      final light = AppColorTokens.light();
      final dark = AppColorTokens.dark();

      // Brand Indigo
      expect(light.primary, AppColors.indigo600);
      expect(dark.primary, AppColors.indigo500);

      // Backgrounds (Slate 50 vs Zinc 950 matching web)
      expect(light.background, AppColors.slate50);
      expect(dark.background, AppColors.zinc950);

      // Surfaces
      expect(light.surface, Colors.white);
      expect(dark.surface, AppColors.zinc900);
    });

    test('Touch Target Standard is >= 48dp', () {
      expect(AppSpacing.minTouchTarget, greaterThanOrEqualTo(48.0));
      expect(AppButtonSize.medium.height, greaterThanOrEqualTo(48.0));
    });

    test('Typography Scale has Base Body >= 16px', () {
      expect(TextStyles.bodyLarge.fontSize, greaterThanOrEqualTo(16.0));
      expect(TextStyles.bodyLarge.height, inInclusiveRange(1.4, 1.6));
    });
  });

  group('Widget Component Tests', () {
    testWidgets('AppButton renders text and enforces minimum touch target',
        (WidgetTester tester) async {
      bool tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.lightTheme,
          home: Scaffold(
            body: AppButton(
              text: 'Xác nhận',
              onPressed: () {
                tapped = true;
              },
            ),
          ),
        ),
      );

      expect(find.text('Xác nhận'), findsOneWidget);

      final buttonFinder = find.byType(AppButton);
      final size = tester.getSize(buttonFinder);
      expect(size.height, greaterThanOrEqualTo(48.0));

      // Test tap
      await tester.tap(buttonFinder);
      await tester.pumpAndSettle();
      expect(tapped, isTrue);
    });

    testWidgets('AppCard renders child and triggers tap feedback',
        (WidgetTester tester) async {
      bool tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.lightTheme,
          home: Scaffold(
            body: AppCard(
              onTap: () {
                tapped = true;
              },
              child: const Text('Nội dung Card'),
            ),
          ),
        ),
      );

      expect(find.text('Nội dung Card'), findsOneWidget);

      await tester.tap(find.byType(AppCard));
      await tester.pumpAndSettle();
      expect(tapped, isTrue);
    });
  });
}

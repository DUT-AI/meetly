import 'package:flutter/material.dart';
import 'package:meetly_mobile/core/theme/app_colors.dart';
import 'package:meetly_mobile/core/theme/app_spacing.dart';
import 'package:meetly_mobile/core/widgets/app_card.dart';

/// Hiệu ứng Shimmer quét ánh sáng mượt mà không phụ thuộc thư viện bên ngoài
class AppShimmer extends StatefulWidget {
  final Widget child;

  const AppShimmer({super.key, required this.child});

  @override
  State<AppShimmer> createState() => _AppShimmerState();
}

class _AppShimmerState extends State<AppShimmer>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final baseColor = isDark ? const Color(0xFF27272A) : const Color(0xFFE2E8F0);
    final highlightColor =
        isDark ? const Color(0xFF3F3F46) : const Color(0xFFF1F5F9);

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return ShaderMask(
          blendMode: BlendMode.srcATop,
          shaderCallback: (bounds) {
            return LinearGradient(
              begin: const Alignment(-1.0, -0.3),
              end: const Alignment(1.0, 0.3),
              stops: [
                _controller.value - 0.3,
                _controller.value,
                _controller.value + 0.3,
              ].map((s) => s.clamp(0.0, 1.0)).toList(),
              colors: [baseColor, highlightColor, baseColor],
            ).createShader(bounds);
          },
          child: child,
        );
      },
      child: widget.child,
    );
  }
}

/// Khung placeholder bo tròn dùng cho Skeleton
class SkeletonBox extends StatelessWidget {
  final double width;
  final double height;
  final double borderRadius;

  const SkeletonBox({
    super.key,
    required this.width,
    required this.height,
    this.borderRadius = 6.0,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: colors.surfaceVariant,
        borderRadius: BorderRadius.circular(borderRadius),
      ),
    );
  }
}

/// Skeleton cho một thẻ Task
class TaskCardSkeleton extends StatelessWidget {
  const TaskCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SkeletonBox(width: 22, height: 22, borderRadius: 6),
              const SizedBox(width: AppSpacing.sm),
              const Expanded(
                child: SkeletonBox(width: double.infinity, height: 16),
              ),
              const SizedBox(width: AppSpacing.md),
              const SkeletonBox(width: 72, height: 22, borderRadius: 12),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              const SizedBox(width: 30), // lùi bằng kích thước checkbox + gap
              const SkeletonBox(width: 70, height: 20, borderRadius: 4),
              const SizedBox(width: AppSpacing.xs),
              const SkeletonBox(width: 60, height: 20, borderRadius: 4),
              const Spacer(),
              const SkeletonBox(width: 65, height: 14, borderRadius: 4),
            ],
          ),
        ],
      ),
    );
  }
}

/// Danh sách Skeleton hiển thị khi đang load dữ liệu My Tasks
class MyTasksSkeletonList extends StatelessWidget {
  final int itemCount;

  const MyTasksSkeletonList({super.key, this.itemCount = 5});

  @override
  Widget build(BuildContext context) {
    return AppShimmer(
      child: ListView.separated(
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm,
        ),
        itemCount: itemCount,
        separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
        itemBuilder: (_, __) => const TaskCardSkeleton(),
      ),
    );
  }
}

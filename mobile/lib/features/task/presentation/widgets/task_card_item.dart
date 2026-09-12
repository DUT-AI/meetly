import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:meetly_mobile/core/theme/app_colors.dart';
import 'package:meetly_mobile/core/theme/app_spacing.dart';
import 'package:meetly_mobile/core/utils/date_formatter.dart';
import 'package:meetly_mobile/core/widgets/app_card.dart';
import 'package:meetly_mobile/features/audio_player/presentation/screens/meeting_player_modal.dart';
import 'package:meetly_mobile/features/task/domain/entities/task_entity.dart';
import 'package:meetly_mobile/features/task/presentation/widgets/task_status_badge.dart';

class TaskCardItem extends StatelessWidget {
  final TaskEntity task;
  final VoidCallback? onTap;
  final ValueChanged<bool>? onToggleStatus;

  const TaskCardItem({
    super.key,
    required this.task,
    this.onTap,
    this.onToggleStatus,
  });

  bool get _isDone => task.status == TaskStatus.done;

  bool get _isOverdue {
    if (task.dueDate == null || _isDone) return false;
    final now = DateTime.now();
    final todayStart = DateTime(now.year, now.month, now.day);
    return task.dueDate!.isBefore(todayStart);
  }

  void _handleSourceMeeting(BuildContext context) {
    HapticFeedback.lightImpact();
    if (task.sourceMeetingAudioUrl != null &&
        task.sourceMeetingAudioUrl!.isNotEmpty) {
      MeetingPlayerModal.show(
        context,
        title: task.sourceMeetingTitle ?? 'Cuộc họp nguồn',
        audioUrl: task.sourceMeetingAudioUrl!,
        workspaceId: task.workspaceId,
      );
    } else {
      showModalBottomSheet(
        context: context,
        backgroundColor: Colors.transparent,
        builder: (ctx) {
          final colors = ctx.colors;
          return Container(
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(
              color: colors.card,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(AppSpacing.radiusXl),
              ),
            ),
            child: SafeArea(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: colors.primary.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(
                          Icons.graphic_eq_rounded,
                          color: colors.primary,
                          size: 24,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Cuộc họp nguồn',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: Colors.grey,
                              ),
                            ),
                            Text(
                              task.sourceMeetingTitle ?? 'Cuộc họp liên kết',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    'Công việc này được tạo tự động từ nội dung thảo luận trong cuộc họp. '
                    'Bạn có thể xem chi tiết bản ghi hoặc nghe lại audio.',
                    style: TextStyle(
                      fontSize: 13,
                      color: colors.onMuted,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: colors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      icon: const Icon(Icons.check_rounded),
                      label: const Text('Đã hiểu'),
                      onPressed: () => Navigator.of(ctx).pop(),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return AppCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Row 1: Checkbox + Title + Status Badge
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Interactive Checkbox with Touch target >= 44x44
              Semantics(
                label: _isDone
                    ? 'Đánh dấu chưa hoàn thành'
                    : 'Đánh dấu hoàn thành',
                button: true,
                child: InkWell(
                  onTap: () {
                    HapticFeedback.selectionClick();
                    onToggleStatus?.call(!_isDone);
                  },
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    width: 38,
                    height: 38,
                    alignment: Alignment.center,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      curve: Curves.easeInOut,
                      width: 22,
                      height: 22,
                      decoration: BoxDecoration(
                        color: _isDone
                            ? AppColors.statusDone
                            : colors.surfaceVariant,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: _isDone
                              ? AppColors.statusDone
                              : colors.border.withOpacity(0.8),
                          width: 1.6,
                        ),
                      ),
                      child: _isDone
                          ? const Icon(
                              Icons.check_rounded,
                              size: 16,
                              color: Colors.white,
                            )
                          : null,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.xs),

              // Title
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    task.name,
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                      height: 1.3,
                      decoration: _isDone
                          ? TextDecoration.lineThrough
                          : TextDecoration.none,
                      color: _isDone
                          ? colors.onMuted.withOpacity(0.7)
                          : colors.onSurface,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),

              // Status Badge
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: TaskStatusBadge(status: task.status),
              ),
            ],
          ),

          const SizedBox(height: AppSpacing.sm),

          // Row 2: Metadata (Project tag, Priority, Due Date)
          Padding(
            padding: const EdgeInsets.only(left: 38 + AppSpacing.xs),
            child: Wrap(
              spacing: AppSpacing.xs,
              runSpacing: AppSpacing.xs,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                if (task.projectName != null &&
                    task.projectName!.isNotEmpty) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: colors.primary.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      task.projectName!,
                      style: TextStyle(
                        color: colors.primary,
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
                TaskPriorityBadge(priority: task.priority),
                if (task.dueDate != null) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: _isOverdue
                          ? AppColors.error.withOpacity(0.1)
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.calendar_today_rounded,
                          size: 12,
                          color: _isOverdue ? AppColors.error : colors.onMuted,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          DateFormatter.formatDate(task.dueDate),
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: _isOverdue
                                ? FontWeight.w600
                                : FontWeight.normal,
                            color: _isOverdue ? AppColors.error : colors.onMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),

          // Row 3: Source Meeting button (if present)
          if (task.sourceMeetingId != null ||
              task.sourceMeetingTitle != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Padding(
              padding: const EdgeInsets.only(left: 38 + AppSpacing.xs),
              child: Semantics(
                button: true,
                label: 'Mở cuộc họp nguồn',
                child: InkWell(
                  onTap: () => _handleSourceMeeting(context),
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 5,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.indigo500.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: AppColors.indigo500.withOpacity(0.25),
                        width: 0.8,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.graphic_eq_rounded,
                          size: 15,
                          color: AppColors.indigo600,
                        ),
                        const SizedBox(width: 5),
                        Flexible(
                          child: Text(
                            task.sourceMeetingTitle ?? 'Cuộc họp nguồn',
                            style: const TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w600,
                              color: AppColors.indigo600,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 3),
                        const Icon(
                          Icons.arrow_forward_ios_rounded,
                          size: 10,
                          color: AppColors.indigo600,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

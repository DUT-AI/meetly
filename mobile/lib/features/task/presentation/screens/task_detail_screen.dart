import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meetly_mobile/core/theme/app_colors.dart';
import 'package:meetly_mobile/core/theme/app_spacing.dart';
import 'package:meetly_mobile/core/theme/text_styles.dart';
import 'package:meetly_mobile/core/utils/date_formatter.dart';
import 'package:meetly_mobile/core/widgets/app_card.dart';
import 'package:meetly_mobile/core/widgets/error_view.dart';
import 'package:meetly_mobile/core/widgets/loading_indicator.dart';
import 'package:meetly_mobile/features/audio_player/presentation/screens/meeting_player_modal.dart';
import 'package:meetly_mobile/features/task/data/repositories/task_repository_impl.dart';
import 'package:meetly_mobile/features/task/domain/entities/task_entity.dart';
import 'package:meetly_mobile/features/task/presentation/controllers/my_tasks_controller.dart';
import 'package:meetly_mobile/features/task/presentation/widgets/task_status_badge.dart';

class TaskDetailScreen extends ConsumerWidget {
  final String taskId;

  const TaskDetailScreen({super.key, required this.taskId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = context.colors;
    final taskAsync = ref.watch(taskDetailProvider(taskId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Chi tiết công việc'),
        actions: [
          IconButton(
            icon: const Icon(Icons.headphones_rounded, color: AppColors.audioWaveform),
            tooltip: 'Nghe ghi âm cuộc họp đính kèm',
            onPressed: () {
              MeetingPlayerModal.show(
                context,
                title: 'Thảo luận công việc #$taskId',
                workspaceId: 'ws-demo',
                audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        bottom: true,
        child: taskAsync.when(
          loading: () => const AppLoadingIndicator(message: 'Đang tải chi tiết công việc...'),
          error: (error, _) => AppErrorView(
            message: error.toString(),
            onRetry: () => ref.refresh(taskDetailProvider(taskId)),
          ),
          data: (task) {
            return SingleChildScrollView(
              padding: EdgeInsets.only(
                left: AppSpacing.md,
                right: AppSpacing.md,
                top: AppSpacing.md,
                bottom: AppSpacing.xxl + context.safeBottom,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title
                  Text(task.name, style: TextStyles.h2),
                  const SizedBox(height: AppSpacing.md),

                  // Status & Priority Card
                  AppCard(
                    child: Column(
                      children: [
                        _buildRow(
                          label: 'Trạng thái',
                          valueWidget: DropdownButton<TaskStatus>(
                            value: task.status,
                            underline: const SizedBox(),
                            isDense: true,
                            items: TaskStatus.values.map((s) {
                              return DropdownMenuItem(
                                value: s,
                                child: TaskStatusBadge(status: s),
                              );
                            }).toList(),
                            onChanged: (newStatus) async {
                              if (newStatus != null && newStatus != task.status) {
                                await ref
                                    .read(taskRepositoryProvider)
                                    .updateTaskStatus(task.id, newStatus);
                                ref.invalidate(taskDetailProvider(taskId));
                                ref.invalidate(myTasksProvider);
                              }
                            },
                          ),
                        ),
                        const Divider(height: AppSpacing.xl),
                        _buildRow(
                          label: 'Độ ưu tiên',
                          valueWidget: TaskPriorityBadge(priority: task.priority),
                        ),
                        const Divider(height: AppSpacing.xl),
                        _buildRow(
                          label: 'Hạn hoàn thành',
                          valueText: task.dueDate != null
                              ? DateFormatter.formatDate(task.dueDate)
                              : 'Chưa đặt',
                        ),
                        if (task.projectName != null) ...[
                          const Divider(height: AppSpacing.xl),
                          _buildRow(
                            label: 'Dự án',
                            valueText: task.projectName!,
                          ),
                        ],
                        if (task.assigneeName != null) ...[
                          const Divider(height: AppSpacing.xl),
                          _buildRow(
                            label: 'Người phụ trách',
                            valueText: task.assigneeName!,
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),

                  // Description
                  const Text('Mô tả công việc', style: TextStyles.h3),
                  const SizedBox(height: AppSpacing.xs),
                  AppCard(
                    child: Container(
                      width: double.infinity,
                      alignment: Alignment.topLeft,
                      child: Text(
                        task.description?.isNotEmpty == true
                            ? task.description!
                            : 'Không có mô tả chi tiết cho công việc này.',
                        style: TextStyles.body.copyWith(
                          color: task.description?.isNotEmpty == true
                              ? colors.onSurface
                              : colors.onMuted,
                          height: 1.5,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),

                  // Audio Meeting Attachment Card (Interactive with Ripple and Haptic)
                  AppCard(
                    onTap: () {
                      MeetingPlayerModal.show(
                        context,
                        title: 'Ghi âm cuộc họp đính kèm',
                        workspaceId: task.workspaceId,
                        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                      );
                    },
                    backgroundColor: AppColors.audioWaveform.withOpacity(0.08),
                    borderSide: BorderSide(
                      color: AppColors.audioWaveform.withOpacity(0.35),
                      width: 1.2,
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: AppColors.audioWaveform.withOpacity(0.15),
                            borderRadius: AppSpacing.roundedSm,
                          ),
                          child: const Icon(
                            Icons.mic_external_on_rounded,
                            color: AppColors.audioWaveform,
                            size: 28,
                          ),
                        ),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Audio Ghi âm & Tóm tắt Cuộc họp',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 14,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Bấm để mở trình phát âm thanh cuộc họp',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: colors.onMuted,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Icon(
                          Icons.play_circle_fill_rounded,
                          color: AppColors.audioWaveform,
                          size: 32,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildRow({
    required String label,
    String? valueText,
    Widget? valueWidget,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: AppColors.textSecondary,
            fontSize: 14,
          ),
        ),
        if (valueWidget != null)
          valueWidget
        else
          Text(
            valueText ?? '',
            style: const TextStyle(
              fontWeight: FontWeight.w500,
              fontSize: 14,
            ),
          ),
      ],
    );
  }
}

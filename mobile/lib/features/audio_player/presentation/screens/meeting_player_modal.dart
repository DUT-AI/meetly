import 'package:audio_video_progress_bar/audio_video_progress_bar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meetly_mobile/core/theme/app_colors.dart';
import 'package:meetly_mobile/core/theme/app_spacing.dart';
import 'package:meetly_mobile/core/theme/text_styles.dart';
import 'package:meetly_mobile/features/audio_player/presentation/controllers/audio_player_controller.dart';

class MeetingPlayerModal extends ConsumerStatefulWidget {
  final String title;
  final String audioUrl;
  final String workspaceId;

  const MeetingPlayerModal({
    super.key,
    required this.title,
    required this.audioUrl,
    required this.workspaceId,
  });

  static Future<void> show(
    BuildContext context, {
    required String title,
    required String audioUrl,
    required String workspaceId,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => MeetingPlayerModal(
        title: title,
        audioUrl: audioUrl,
        workspaceId: workspaceId,
      ),
    );
  }

  @override
  ConsumerState<MeetingPlayerModal> createState() => _MeetingPlayerModalState();
}

class _MeetingPlayerModalState extends ConsumerState<MeetingPlayerModal> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(audioPlayerControllerProvider.notifier).loadAudio(
            url: widget.audioUrl,
            title: widget.title,
          );
    });
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final audioState = ref.watch(audioPlayerControllerProvider);
    final controller = ref.read(audioPlayerControllerProvider.notifier);

    return Container(
      padding: EdgeInsets.only(
        left: AppSpacing.xl,
        right: AppSpacing.xl,
        top: AppSpacing.lg,
        bottom: AppSpacing.md + context.safeBottom,
      ),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Drag handle
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: colors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            // Meeting Header Icon & Title
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  decoration: BoxDecoration(
                    color: AppColors.audioWaveform.withOpacity(0.12),
                    borderRadius: AppSpacing.roundedMd,
                  ),
                  child: const Icon(
                    Icons.graphic_eq_rounded,
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
                        'AUDIO CUỘC HỌP',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: AppColors.audioWaveform,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        audioState.title.isNotEmpty
                            ? audioState.title
                            : widget.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyles.h3,
                      ),
                    ],
                  ),
                ),
                MinTouchTarget(
                  child: IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.pop(context),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xxl),

            // Audio Progress Bar Scrubber
            ProgressBar(
              progress: audioState.position,
              buffered: audioState.bufferedPosition,
              total: audioState.totalDuration,
              onSeek: controller.seek,
              progressBarColor: AppColors.audioWaveform,
              baseBarColor: colors.border,
              bufferedBarColor: colors.border.withOpacity(0.5),
              thumbColor: AppColors.audioWaveform,
              thumbRadius: 7,
              timeLabelTextStyle: TextStyle(
                fontSize: 12,
                color: colors.onMuted,
              ),
            ),
            const SizedBox(height: AppSpacing.md),

            // Controls (Speed, Backward, Play/Pause, Forward)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                // Speed Selector (>= 48dp touch target)
                MinTouchTarget(
                  child: PopupMenuButton<double>(
                    initialValue: audioState.speed,
                    tooltip: 'Tốc độ phát',
                    onSelected: controller.setSpeed,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: colors.surfaceVariant,
                        borderRadius: AppSpacing.roundedSm,
                      ),
                      child: Text(
                        '${audioState.speed}x',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: colors.onSurface,
                        ),
                      ),
                    ),
                    itemBuilder: (context) => [
                      0.75,
                      1.0,
                      1.25,
                      1.5,
                      2.0,
                    ].map((s) {
                      return PopupMenuItem<double>(
                        value: s,
                        child: Text('${s}x'),
                      );
                    }).toList(),
                  ),
                ),

                // Skip -10s
                MinTouchTarget(
                  child: IconButton(
                    icon: const Icon(Icons.replay_10_rounded, size: 30),
                    onPressed: controller.skipBackward10,
                  ),
                ),

                // Play / Pause Toggle (Touch target 64x64)
                Container(
                  width: 64,
                  height: 64,
                  decoration: const BoxDecoration(
                    color: AppColors.audioWaveform,
                    shape: BoxShape.circle,
                  ),
                  child: audioState.isLoading
                      ? const Center(
                          child: SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                              valueColor:
                                  AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          ),
                        )
                      : IconButton(
                          icon: Icon(
                            audioState.isPlaying
                                ? Icons.pause_rounded
                                : Icons.play_arrow_rounded,
                            size: 34,
                            color: Colors.white,
                          ),
                          onPressed: controller.togglePlayPause,
                        ),
                ),

                // Skip +10s
                MinTouchTarget(
                  child: IconButton(
                    icon: const Icon(Icons.forward_10_rounded, size: 30),
                    onPressed: controller.skipForward10,
                  ),
                ),

                // Transcript Placeholder
                MinTouchTarget(
                  child: IconButton(
                    icon: const Icon(Icons.subtitles_outlined, size: 24),
                    tooltip: 'Transcript',
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Tính năng xem Transcript Gemini AI đang tải...'),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
          ],
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meetly_mobile/core/theme/app_colors.dart';
import 'package:meetly_mobile/core/theme/app_spacing.dart';
import 'package:meetly_mobile/core/widgets/app_card.dart';
import 'package:meetly_mobile/core/widgets/error_view.dart';
import 'package:meetly_mobile/core/widgets/loading_indicator.dart';
import 'package:meetly_mobile/features/project/presentation/controllers/project_controller.dart';
import 'package:meetly_mobile/features/workspace/presentation/controllers/workspace_controller.dart';

class ProjectListScreen extends ConsumerWidget {
  const ProjectListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = context.colors;
    final currentWorkspace = ref.watch(selectedWorkspaceProvider);

    if (currentWorkspace == null) {
      return const Scaffold(
        body: Center(
          child: Text('Vui lòng chọn một workspace trước.'),
        ),
      );
    }

    final projectsAsync =
        ref.watch(projectsByWorkspaceProvider(currentWorkspace.id));

    return Scaffold(
      appBar: AppBar(
        title: Text('Dự án (${currentWorkspace.name})'),
      ),
      body: SafeArea(
        top: false,
        bottom: true,
        child: projectsAsync.when(
          loading: () => const AppLoadingIndicator(message: 'Đang tải dự án...'),
          error: (error, _) => AppErrorView(
            message: error.toString(),
            onRetry: () =>
                ref.refresh(projectsByWorkspaceProvider(currentWorkspace.id)),
          ),
          data: (projects) {
            if (projects.isEmpty) {
              return const Center(
                child: Text('Chưa có dự án nào trong workspace này.'),
              );
            }

            return ListView.separated(
              padding: EdgeInsets.only(
                left: AppSpacing.md,
                right: AppSpacing.md,
                top: AppSpacing.md,
                bottom: AppSpacing.xl + context.safeBottom,
              ),
              itemCount: projects.length,
              separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
              itemBuilder: (context, index) {
                final project = projects[index];

                return AppCard(
                  onTap: () {
                    // Navigate to project detail / task filter
                  },
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: colors.primary.withOpacity(0.1),
                          borderRadius: AppSpacing.roundedSm,
                        ),
                        child: Icon(
                          Icons.folder_outlined,
                          color: colors.primary,
                          size: 22,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              project.name,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 15,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Mã: ${project.id}',
                              style: TextStyle(
                                color: colors.onMuted,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Icon(
                        Icons.chevron_right_rounded,
                        color: colors.onMuted,
                        size: 20,
                      ),
                    ],
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}

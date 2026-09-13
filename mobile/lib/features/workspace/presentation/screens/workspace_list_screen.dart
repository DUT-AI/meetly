import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:meetly_mobile/core/router/route_names.dart';
import 'package:meetly_mobile/core/theme/app_colors.dart';
import 'package:meetly_mobile/core/theme/app_spacing.dart';
import 'package:meetly_mobile/core/widgets/app_card.dart';
import 'package:meetly_mobile/core/widgets/error_view.dart';
import 'package:meetly_mobile/core/widgets/loading_indicator.dart';
import 'package:meetly_mobile/features/workspace/presentation/controllers/workspace_controller.dart';

class WorkspaceListScreen extends ConsumerWidget {
  const WorkspaceListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = context.colors;
    final workspacesAsync = ref.watch(workspacesListProvider);
    final selectedWorkspace = ref.watch(selectedWorkspaceProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Chọn Không gian làm việc'),
      ),
      body: SafeArea(
        top: false,
        bottom: true,
        child: workspacesAsync.when(
          loading: () => const AppLoadingIndicator(message: 'Đang tải Workspaces...'),
          error: (error, _) => AppErrorView(
            message: error.toString(),
            onRetry: () => ref.refresh(workspacesListProvider),
          ),
          data: (workspaces) {
            if (workspaces.isEmpty) {
              return const Center(
                child: Text('Bạn chưa thuộc không gian làm việc nào.'),
              );
            }

            return ListView.separated(
              padding: EdgeInsets.only(
                left: AppSpacing.md,
                right: AppSpacing.md,
                top: AppSpacing.md,
                bottom: AppSpacing.xl + context.safeBottom,
              ),
              itemCount: workspaces.length,
              separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
              itemBuilder: (context, index) {
                final ws = workspaces[index];
                final isSelected = selectedWorkspace?.id == ws.id;

                return AppCard(
                  onTap: () {
                    ref.read(selectedWorkspaceProvider.notifier).select(ws);
                    if (context.canPop()) {
                      context.pop();
                    } else {
                      context.go(RouteNames.myTasks);
                    }
                  },
                  borderSide: BorderSide(
                    color: isSelected ? colors.primary : colors.border,
                    width: isSelected ? 2.0 : 1.0,
                  ),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 20,
                        backgroundColor: colors.primary.withValues(alpha: 0.12),
                        child: Text(
                          ws.name.isNotEmpty ? ws.name[0].toUpperCase() : 'W',
                          style: TextStyle(
                            color: colors.primary,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              ws.name,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 15,
                              ),
                            ),
                            if (ws.note != null && ws.note!.isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Text(
                                ws.note!,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: colors.onMuted,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      if (isSelected)
                        Icon(
                          Icons.check_circle_rounded,
                          color: colors.primary,
                          size: 22,
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

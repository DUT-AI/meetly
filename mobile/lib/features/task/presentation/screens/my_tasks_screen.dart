import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:meetly_mobile/core/router/route_names.dart';
import 'package:meetly_mobile/core/theme/app_colors.dart';
import 'package:meetly_mobile/core/theme/app_spacing.dart';
import 'package:meetly_mobile/core/widgets/error_view.dart';
import 'package:meetly_mobile/features/auth/presentation/controllers/auth_controller.dart';
import 'package:meetly_mobile/features/task/domain/entities/task_entity.dart';
import 'package:meetly_mobile/features/task/presentation/controllers/my_tasks_controller.dart';
import 'package:meetly_mobile/features/task/presentation/widgets/task_card_item.dart';
import 'package:meetly_mobile/features/task/presentation/widgets/task_card_skeleton.dart';
import 'package:meetly_mobile/features/workspace/presentation/controllers/workspace_controller.dart';

class MyTasksScreen extends ConsumerStatefulWidget {
  const MyTasksScreen({super.key});

  @override
  ConsumerState<MyTasksScreen> createState() => _MyTasksScreenState();
}

class _MyTasksScreenState extends ConsumerState<MyTasksScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final _searchController = TextEditingController();

  static const List<TaskBucket> _buckets = [
    TaskBucket.overdue,
    TaskBucket.today,
    TaskBucket.thisWeek,
    TaskBucket.upcoming,
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _buckets.length, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _handleRefresh() async {
    await ref.read(myTasksProvider.notifier).fetchTasks(isRefresh: true);
  }

  Future<void> _handleToggleStatus(TaskEntity task) async {
    final success =
        await ref.read(myTasksProvider.notifier).toggleTaskStatus(task);
    if (!success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Không thể cập nhật trạng thái công việc'),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      );
    }
  }

  Widget _buildTabBadge({
    required int count,
    required bool isOverdue,
    required bool isSelected,
  }) {
    final colors = context.colors;

    Color badgeBg;
    Color badgeText;

    if (isOverdue && count > 0) {
      badgeBg = AppColors.error.withOpacity(0.15);
      badgeText = AppColors.error;
    } else if (isSelected) {
      badgeBg = colors.primary.withOpacity(0.15);
      badgeText = colors.primary;
    } else {
      badgeBg = colors.surfaceVariant;
      badgeText = colors.onMuted;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: badgeBg,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        '$count',
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: badgeText,
        ),
      ),
    );
  }

  Widget _buildEmptyState(TaskBucket bucket, bool isSearching) {
    final colors = context.colors;

    IconData icon;
    String title;
    String subtitle;

    if (isSearching) {
      icon = Icons.search_off_rounded;
      title = 'Không tìm thấy kết quả';
      subtitle = 'Không có công việc nào khớp với từ khóa tìm kiếm.';
    } else {
      switch (bucket) {
        case TaskBucket.overdue:
          icon = Icons.check_circle_outline_rounded;
          title = 'Không có việc quá hạn';
          subtitle = 'Tuyệt vời! Bạn đang duy trì tiến độ công việc rất tốt.';
          break;
        case TaskBucket.today:
          icon = Icons.wb_sunny_outlined;
          title = 'Hôm nay thảnh thơi';
          subtitle = 'Bạn đã hoàn tất hết việc hôm nay hoặc chưa có lịch mới.';
          break;
        case TaskBucket.thisWeek:
          icon = Icons.date_range_outlined;
          title = 'Không có việc trong tuần';
          subtitle = 'Tuần này của bạn đang trống. Hãy lên kế hoạch công việc mới!';
          break;
        case TaskBucket.upcoming:
          icon = Icons.event_available_outlined;
          title = 'Chưa có việc sắp tới';
          subtitle = 'Các công việc trong tương lai sẽ xuất hiện tại đây.';
          break;
      }
    }

    return Center(
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                color: colors.primary.withOpacity(0.06),
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                size: 48,
                color: colors.primary.withOpacity(0.7),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              title,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: colors.onSurface,
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                color: colors.onMuted,
                height: 1.4,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTaskListForBucket(
    List<TaskEntity> tasks,
    TaskBucket bucket,
    bool isSearching,
  ) {
    if (tasks.isEmpty) {
      return RefreshIndicator(
        onRefresh: _handleRefresh,
        child: _buildEmptyState(bucket, isSearching),
      );
    }

    return RefreshIndicator(
      onRefresh: _handleRefresh,
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.only(
          left: AppSpacing.md,
          right: AppSpacing.md,
          top: AppSpacing.sm,
          bottom: AppSpacing.xl + context.safeBottom,
        ),
        itemCount: tasks.length,
        separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
        itemBuilder: (context, index) {
          final task = tasks[index];
          return TaskCardItem(
            task: task,
            onTap: () => context.push('/tasks/${task.id}'),
            onToggleStatus: (_) => _handleToggleStatus(task),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final myTasksAsync = ref.watch(myTasksProvider);
    final categorizedTasks = ref.watch(categorizedTasksProvider);
    final searchQuery = ref.watch(taskSearchQueryProvider);
    final selectedWorkspace = ref.watch(selectedWorkspaceProvider);
    final currentUser = ref.watch(authControllerProvider).value;

    return Scaffold(
      appBar: AppBar(
        title: GestureDetector(
          onTap: () => context.push(RouteNames.workspaces),
          child: Container(
            constraints:
                const BoxConstraints(minHeight: AppSpacing.minTouchTarget),
            alignment: Alignment.centerLeft,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Flexible(
                  child: Text(
                    selectedWorkspace?.name ?? 'Chọn Workspace',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 4),
                const Icon(Icons.keyboard_arrow_down_rounded, size: 20),
              ],
            ),
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.folder_outlined),
            tooltip: 'Dự án',
            onPressed: () => context.push(RouteNames.projects),
          ),
          PopupMenuButton(
            icon: CircleAvatar(
              radius: 16,
              backgroundColor: colors.primary.withOpacity(0.15),
              child: Text(
                currentUser?.name.isNotEmpty == true
                    ? currentUser!.name[0].toUpperCase()
                    : 'U',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: colors.primary,
                ),
              ),
            ),
            itemBuilder: (context) => [
              PopupMenuItem(
                child: Text('Tài khoản: ${currentUser?.email ?? ""}'),
                enabled: false,
              ),
              PopupMenuItem(
                child: const Row(
                  children: [
                    Icon(Icons.logout_rounded, color: AppColors.error, size: 18),
                    SizedBox(width: 8),
                    Text('Đăng xuất', style: TextStyle(color: AppColors.error)),
                  ],
                ),
                onTap: () {
                  ref.read(authControllerProvider.notifier).logout();
                  context.go(RouteNames.login);
                },
              ),
            ],
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        bottom: true,
        child: Column(
          children: [
            // Search Box
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.xs,
              ),
              child: TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'Tìm kiếm công việc...',
                  prefixIcon: const Icon(Icons.search_rounded, size: 20),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear_rounded, size: 18),
                          onPressed: () {
                            _searchController.clear();
                            ref.read(taskSearchQueryProvider.notifier).state =
                                '';
                          },
                        )
                      : null,
                ),
                onChanged: (val) {
                  ref.read(taskSearchQueryProvider.notifier).state = val;
                },
              ),
            ),

            // Tab Bar with real-time badges (Overdue, Today, This Week, Upcoming)
            Container(
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: colors.border.withOpacity(0.6),
                    width: 1,
                  ),
                ),
              ),
              child: AnimatedBuilder(
                animation: _tabController,
                builder: (context, _) {
                  final currentIndex = _tabController.index;
                  return TabBar(
                    controller: _tabController,
                    isScrollable: true,
                    tabAlignment: TabAlignment.start,
                    labelColor: colors.primary,
                    unselectedLabelColor: colors.onMuted,
                    indicatorColor: colors.primary,
                    indicatorWeight: 2.5,
                    indicatorSize: TabBarIndicatorSize.label,
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.xs,
                    ),
                    tabs: _buckets.map((bucket) {
                      final count =
                          categorizedTasks[bucket]?.length ?? 0;
                      final isOverdue = bucket == TaskBucket.overdue;
                      final isSelected =
                          _buckets.indexOf(bucket) == currentIndex;

                      return Tab(
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              bucket.label,
                              style: const TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(width: 6),
                            _buildTabBadge(
                              count: count,
                              isOverdue: isOverdue,
                              isSelected: isSelected,
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  );
                },
              ),
            ),

            // Content: TabBarView with Skeleton Loading / Error / Data
            Expanded(
              child: myTasksAsync.when(
                loading: () => const MyTasksSkeletonList(itemCount: 6),
                error: (err, _) => AppErrorView(
                  message: err.toString(),
                  onRetry: () =>
                      ref.read(myTasksProvider.notifier).fetchTasks(),
                ),
                data: (_) {
                  return TabBarView(
                    controller: _tabController,
                    children: _buckets.map((bucket) {
                      final tasks = categorizedTasks[bucket] ?? [];
                      return _buildTaskListForBucket(
                        tasks,
                        bucket,
                        searchQuery.isNotEmpty,
                      );
                    }).toList(),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

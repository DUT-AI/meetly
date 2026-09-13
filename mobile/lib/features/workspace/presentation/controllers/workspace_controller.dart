import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meetly_mobile/core/storage/local_storage_service.dart';
import 'package:meetly_mobile/features/workspace/data/repositories/workspace_repository_impl.dart';
import 'package:meetly_mobile/features/workspace/domain/entities/workspace_entity.dart';

final workspacesListProvider = FutureProvider<List<WorkspaceEntity>>((ref) async {
  final repository = ref.watch(workspaceRepositoryProvider);
  final workspaces = await repository.getWorkspaces();

  // Tự động gán workspace đầu tiên nếu chưa chọn
  final currentSelected = ref.read(selectedWorkspaceProvider);
  if (currentSelected == null && workspaces.isNotEmpty) {
    ref.read(selectedWorkspaceProvider.notifier).select(workspaces.first);
  }

  return workspaces;
});

final selectedWorkspaceProvider =
    StateNotifierProvider<SelectedWorkspaceNotifier, WorkspaceEntity?>((ref) {
  final storage = ref.watch(localStorageServiceProvider);
  return SelectedWorkspaceNotifier(storage);
});

class SelectedWorkspaceNotifier extends StateNotifier<WorkspaceEntity?> {
  final LocalStorageService _storage;

  SelectedWorkspaceNotifier(this._storage) : super(null);

  void select(WorkspaceEntity workspace) {
    state = workspace;
    _storage.setSelectedWorkspaceId(workspace.id);
  }

  void clear() {
    state = null;
    _storage.clearWorkspaceId();
  }
}

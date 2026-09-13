import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/entities/workspace_entity.dart';
import '../../domain/repositories/workspace_repository.dart';
import '../datasources/workspace_remote_datasource.dart';

final workspaceRepositoryProvider = Provider<WorkspaceRepository>((ref) {
  final remote = ref.watch(workspaceRemoteDataSourceProvider);
  return WorkspaceRepositoryImpl(remote);
});

class WorkspaceRepositoryImpl implements WorkspaceRepository {
  final WorkspaceRemoteDataSource _remoteDataSource;

  WorkspaceRepositoryImpl(this._remoteDataSource);

  @override
  Future<List<WorkspaceEntity>> getWorkspaces() {
    return _remoteDataSource.getWorkspaces();
  }

  @override
  Future<WorkspaceEntity> getWorkspace(String id) {
    return _remoteDataSource.getWorkspace(id);
  }
}

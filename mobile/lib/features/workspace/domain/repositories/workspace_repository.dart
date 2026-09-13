import '../entities/workspace_entity.dart';

abstract class WorkspaceRepository {
  Future<List<WorkspaceEntity>> getWorkspaces();
  Future<WorkspaceEntity> getWorkspace(String id);
}

import '../entities/project_entity.dart';

abstract class ProjectRepository {
  Future<List<ProjectEntity>> getProjects(String workspaceId);
  Future<ProjectEntity> getProject(String projectId);
}

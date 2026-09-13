import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/entities/project_entity.dart';
import '../../domain/repositories/project_repository.dart';
import '../datasources/project_remote_datasource.dart';

final projectRepositoryProvider = Provider<ProjectRepository>((ref) {
  final remote = ref.watch(projectRemoteDataSourceProvider);
  return ProjectRepositoryImpl(remote);
});

class ProjectRepositoryImpl implements ProjectRepository {
  final ProjectRemoteDataSource _remoteDataSource;

  ProjectRepositoryImpl(this._remoteDataSource);

  @override
  Future<List<ProjectEntity>> getProjects(String workspaceId) {
    return _remoteDataSource.getProjects(workspaceId);
  }

  @override
  Future<ProjectEntity> getProject(String projectId) {
    return _remoteDataSource.getProject(projectId);
  }
}

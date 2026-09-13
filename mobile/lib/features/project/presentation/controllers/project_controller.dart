import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meetly_mobile/features/project/data/repositories/project_repository_impl.dart';
import 'package:meetly_mobile/features/project/domain/entities/project_entity.dart';

final projectsByWorkspaceProvider =
    FutureProvider.family<List<ProjectEntity>, String>((ref, workspaceId) async {
  final repository = ref.watch(projectRepositoryProvider);
  return repository.getProjects(workspaceId);
});

final projectDetailProvider =
    FutureProvider.family<ProjectEntity, String>((ref, projectId) async {
  final repository = ref.watch(projectRepositoryProvider);
  return repository.getProject(projectId);
});

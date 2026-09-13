class ProjectEntity {
  final String id;
  final String name;
  final String? imageUrl;
  final String workspaceId;

  const ProjectEntity({
    required this.id,
    required this.name,
    this.imageUrl,
    required this.workspaceId,
  });
}

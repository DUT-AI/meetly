class WorkspaceEntity {
  final String id;
  final String name;
  final String? imageUrl;
  final String? inviteCode;
  final String? note;
  final String userId;

  const WorkspaceEntity({
    required this.id,
    required this.name,
    this.imageUrl,
    this.inviteCode,
    this.note,
    required this.userId,
  });
}

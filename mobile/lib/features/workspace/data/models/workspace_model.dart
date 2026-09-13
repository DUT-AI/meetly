import '../../domain/entities/workspace_entity.dart';

class WorkspaceModel extends WorkspaceEntity {
  const WorkspaceModel({
    required super.id,
    required super.name,
    super.imageUrl,
    super.inviteCode,
    super.note,
    required super.userId,
  });

  factory WorkspaceModel.fromJson(Map<String, dynamic> json) {
    return WorkspaceModel(
      id: json['id'] ?? json['\$id'] ?? '',
      name: json['name'] ?? '',
      imageUrl: json['image_url'] ?? json['imageUrl'],
      inviteCode: json['invite_code'] ?? json['inviteCode'],
      note: json['note'],
      userId: json['user_id'] ?? json['userId'] ?? json['owner_id'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'imageUrl': imageUrl,
      'inviteCode': inviteCode,
      'note': note,
      'userId': userId,
    };
  }
}

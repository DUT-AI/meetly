import '../../domain/entities/project_entity.dart';

class ProjectModel extends ProjectEntity {
  const ProjectModel({
    required super.id,
    required super.name,
    super.imageUrl,
    required super.workspaceId,
  });

  factory ProjectModel.fromJson(Map<String, dynamic> json) {
    return ProjectModel(
      id: json['id'] ?? json['\$id'] ?? '',
      name: json['name'] ?? '',
      imageUrl: json['image_url'] ?? json['imageUrl'],
      workspaceId: json['workspace_id'] ?? json['workspaceId'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'imageUrl': imageUrl,
      'workspaceId': workspaceId,
    };
  }
}

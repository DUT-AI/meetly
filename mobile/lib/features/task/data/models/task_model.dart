import '../../domain/entities/task_entity.dart';

class TaskModel extends TaskEntity {
  const TaskModel({
    required super.id,
    required super.name,
    required super.status,
    required super.priority,
    super.labels = const [],
    required super.workspaceId,
    required super.projectId,
    super.projectName,
    super.assigneeId,
    super.assigneeName,
    super.assigneeAvatar,
    super.sourceMeetingId,
    super.sourceMeetingTitle,
    super.sourceMeetingAudioUrl,
    super.dueDate,
    super.description,
    required super.createdAt,
  });

  factory TaskModel.fromJson(Map<String, dynamic> json) {
    String? pName;
    if (json['project'] is Map) {
      pName = json['project']['name'];
    }

    String? aName;
    String? aAvatar;
    if (json['assignee'] is Map) {
      aName = json['assignee']['name'];
      aAvatar = json['assignee']['avatar_url'] ?? json['assignee']['avatarUrl'];
    }

    DateTime? parsedDueDate;
    if (json['due_date'] != null || json['dueDate'] != null) {
      final rawDate = json['due_date'] ?? json['dueDate'];
      parsedDueDate = DateTime.tryParse(rawDate.toString());
    }

    DateTime parsedCreatedAt = DateTime.now();
    if (json['created_at'] != null || json['createdAt'] != null) {
      final rawCreated = json['created_at'] ?? json['createdAt'];
      parsedCreatedAt = DateTime.tryParse(rawCreated.toString()) ?? DateTime.now();
    }

    // Source meeting extraction
    String? smId = json['source_meeting_id'] ?? json['sourceMeetingId'];
    String? smTitle = json['source_meeting_title'] ?? json['sourceMeetingTitle'];
    String? smAudioUrl = json['source_meeting_audio_url'] ?? json['sourceMeetingAudioUrl'];
    if (json['source_meeting'] is Map) {
      final sm = json['source_meeting'] as Map;
      smId ??= sm['id']?.toString() ?? sm['\$id']?.toString();
      smTitle ??= sm['title']?.toString() ?? sm['name']?.toString();
      smAudioUrl ??= sm['audio_url']?.toString() ?? sm['audioUrl']?.toString();
    } else if (json['sourceMeeting'] is Map) {
      final sm = json['sourceMeeting'] as Map;
      smId ??= sm['id']?.toString() ?? sm['\$id']?.toString();
      smTitle ??= sm['title']?.toString() ?? sm['name']?.toString();
      smAudioUrl ??= sm['audio_url']?.toString() ?? sm['audioUrl']?.toString();
    }

    return TaskModel(
      id: json['id'] ?? json['\$id'] ?? '',
      name: json['name'] ?? '',
      status: TaskStatus.fromString(json['status']),
      priority: TaskPriority.fromString(json['priority']),
      labels: json['labels'] != null ? List<String>.from(json['labels']) : const [],
      workspaceId: json['workspace_id'] ?? json['workspaceId'] ?? '',
      projectId: json['project_id'] ?? json['projectId'] ?? '',
      projectName: pName,
      assigneeId: json['assignee_id'] ?? json['assigneeId'],
      assigneeName: aName,
      assigneeAvatar: aAvatar,
      sourceMeetingId: smId,
      sourceMeetingTitle: smTitle,
      sourceMeetingAudioUrl: smAudioUrl,
      dueDate: parsedDueDate,
      description: json['description'],
      createdAt: parsedCreatedAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'status': status.value,
      'priority': priority.value,
      'labels': labels,
      'workspaceId': workspaceId,
      'projectId': projectId,
      'assigneeId': assigneeId,
      'sourceMeetingId': sourceMeetingId,
      'sourceMeetingTitle': sourceMeetingTitle,
      'sourceMeetingAudioUrl': sourceMeetingAudioUrl,
      'dueDate': dueDate?.toIso8601String(),
      'description': description,
    };
  }
}

enum TaskStatus {
  backlog('BACKLOG', 'Backlog'),
  todo('TODO', 'Cần làm'),
  inProgress('IN_PROGRESS', 'Đang làm'),
  inReview('IN_REVIEW', 'Đang duyệt'),
  done('DONE', 'Hoàn thành');

  final String value;
  final String label;
  const TaskStatus(this.value, this.label);

  static TaskStatus fromString(String? val) {
    switch (val?.toUpperCase()) {
      case 'BACKLOG':
        return TaskStatus.backlog;
      case 'TODO':
        return TaskStatus.todo;
      case 'IN_PROGRESS':
        return TaskStatus.inProgress;
      case 'IN_REVIEW':
        return TaskStatus.inReview;
      case 'DONE':
        return TaskStatus.done;
      default:
        return TaskStatus.todo;
    }
  }
}

enum TaskPriority {
  low('LOW', 'Thấp'),
  medium('MEDIUM', 'Trung bình'),
  high('HIGH', 'Cao'),
  urgent('URGENT', 'Khẩn cấp');

  final String value;
  final String label;
  const TaskPriority(this.value, this.label);

  static TaskPriority fromString(String? val) {
    switch (val?.toUpperCase()) {
      case 'LOW':
        return TaskPriority.low;
      case 'MEDIUM':
        return TaskPriority.medium;
      case 'HIGH':
        return TaskPriority.high;
      case 'URGENT':
        return TaskPriority.urgent;
      default:
        return TaskPriority.medium;
    }
  }
}

class TaskEntity {
  final String id;
  final String name;
  final TaskStatus status;
  final TaskPriority priority;
  final List<String> labels;
  final String workspaceId;
  final String projectId;
  final String? projectName;
  final String? assigneeId;
  final String? assigneeName;
  final String? assigneeAvatar;
  final String? sourceMeetingId;
  final String? sourceMeetingTitle;
  final String? sourceMeetingAudioUrl;
  final DateTime? dueDate;
  final String? description;
  final DateTime createdAt;

  const TaskEntity({
    required this.id,
    required this.name,
    required this.status,
    required this.priority,
    this.labels = const [],
    required this.workspaceId,
    required this.projectId,
    this.projectName,
    this.assigneeId,
    this.assigneeName,
    this.assigneeAvatar,
    this.sourceMeetingId,
    this.sourceMeetingTitle,
    this.sourceMeetingAudioUrl,
    this.dueDate,
    this.description,
    required this.createdAt,
  });

  TaskEntity copyWith({
    String? id,
    String? name,
    TaskStatus? status,
    TaskPriority? priority,
    List<String>? labels,
    String? workspaceId,
    String? projectId,
    String? projectName,
    String? assigneeId,
    String? assigneeName,
    String? assigneeAvatar,
    String? sourceMeetingId,
    String? sourceMeetingTitle,
    String? sourceMeetingAudioUrl,
    DateTime? dueDate,
    String? description,
    DateTime? createdAt,
  }) {
    return TaskEntity(
      id: id ?? this.id,
      name: name ?? this.name,
      status: status ?? this.status,
      priority: priority ?? this.priority,
      labels: labels ?? this.labels,
      workspaceId: workspaceId ?? this.workspaceId,
      projectId: projectId ?? this.projectId,
      projectName: projectName ?? this.projectName,
      assigneeId: assigneeId ?? this.assigneeId,
      assigneeName: assigneeName ?? this.assigneeName,
      assigneeAvatar: assigneeAvatar ?? this.assigneeAvatar,
      sourceMeetingId: sourceMeetingId ?? this.sourceMeetingId,
      sourceMeetingTitle: sourceMeetingTitle ?? this.sourceMeetingTitle,
      sourceMeetingAudioUrl: sourceMeetingAudioUrl ?? this.sourceMeetingAudioUrl,
      dueDate: dueDate ?? this.dueDate,
      description: description ?? this.description,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

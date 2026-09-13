import 'package:flutter_test/flutter_test.dart';
import 'package:meetly_mobile/features/task/data/models/task_model.dart';
import 'package:meetly_mobile/features/task/domain/entities/task_entity.dart';
import 'package:meetly_mobile/features/task/presentation/controllers/my_tasks_controller.dart';

void main() {
  group('TaskDateClassifier Tests', () {
    final fixedNow = DateTime(2026, 9, 12, 10, 0, 0); // Saturday

    test('classifies past uncompleted task as overdue', () {
      final overdueTask = TaskEntity(
        id: 't-1',
        name: 'Overdue Task',
        status: TaskStatus.todo,
        priority: TaskPriority.high,
        workspaceId: 'ws-1',
        projectId: 'p-1',
        dueDate: DateTime(2026, 9, 10, 18, 0, 0),
        createdAt: DateTime(2026, 9, 1),
      );

      final bucket = TaskDateClassifier.classify(overdueTask, now: fixedNow);
      expect(bucket, equals(TaskBucket.overdue));
    });

    test('classifies past completed task as upcoming / not overdue', () {
      final doneTask = TaskEntity(
        id: 't-2',
        name: 'Done Past Task',
        status: TaskStatus.done,
        priority: TaskPriority.medium,
        workspaceId: 'ws-1',
        projectId: 'p-1',
        dueDate: DateTime(2026, 9, 10, 18, 0, 0),
        createdAt: DateTime(2026, 9, 1),
      );

      final bucket = TaskDateClassifier.classify(doneTask, now: fixedNow);
      expect(bucket, equals(TaskBucket.upcoming));
    });

    test('classifies task due today as today', () {
      final todayTask = TaskEntity(
        id: 't-3',
        name: 'Today Task',
        status: TaskStatus.inProgress,
        priority: TaskPriority.urgent,
        workspaceId: 'ws-1',
        projectId: 'p-1',
        dueDate: DateTime(2026, 9, 12, 17, 30, 0),
        createdAt: DateTime(2026, 9, 12),
      );

      final bucket = TaskDateClassifier.classify(todayTask, now: fixedNow);
      expect(bucket, equals(TaskBucket.today));
    });

    test('classifies task due later this week as thisWeek', () {
      // 2026-09-12 is Saturday (weekday 6), Sunday is 2026-09-13
      final thisWeekTask = TaskEntity(
        id: 't-4',
        name: 'Sunday Task',
        status: TaskStatus.todo,
        priority: TaskPriority.low,
        workspaceId: 'ws-1',
        projectId: 'p-1',
        dueDate: DateTime(2026, 9, 13, 20, 0, 0),
        createdAt: DateTime(2026, 9, 12),
      );

      final bucket = TaskDateClassifier.classify(thisWeekTask, now: fixedNow);
      expect(bucket, equals(TaskBucket.thisWeek));
    });

    test('classifies task due next week or with null due date as upcoming', () {
      final nextWeekTask = TaskEntity(
        id: 't-5',
        name: 'Next Week Task',
        status: TaskStatus.todo,
        priority: TaskPriority.medium,
        workspaceId: 'ws-1',
        projectId: 'p-1',
        dueDate: DateTime(2026, 9, 20, 10, 0, 0),
        createdAt: DateTime(2026, 9, 12),
      );

      final noDueDateTask = TaskEntity(
        id: 't-6',
        name: 'No Deadline Task',
        status: TaskStatus.backlog,
        priority: TaskPriority.low,
        workspaceId: 'ws-1',
        projectId: 'p-1',
        dueDate: null,
        createdAt: DateTime(2026, 9, 12),
      );

      expect(
        TaskDateClassifier.classify(nextWeekTask, now: fixedNow),
        equals(TaskBucket.upcoming),
      );
      expect(
        TaskDateClassifier.classify(noDueDateTask, now: fixedNow),
        equals(TaskBucket.upcoming),
      );
    });
  });

  group('TaskModel Source Meeting Serialization', () {
    test('parses source meeting fields correctly from nested object', () {
      final json = {
        'id': 'task-001',
        'name': 'Ghi biên bản họp Sprint',
        'status': 'TODO',
        'priority': 'HIGH',
        'workspace_id': 'ws-123',
        'project_id': 'p-456',
        'source_meeting': {
          'id': 'm-789',
          'title': 'Sprint Planning Meeting',
          'audio_url': 'https://storage.meetly.local/recordings/sp-1.mp3',
        },
        'due_date': '2026-09-15T15:00:00.000Z',
        'created_at': '2026-09-12T08:00:00.000Z',
      };

      final model = TaskModel.fromJson(json);

      expect(model.id, equals('task-001'));
      expect(model.sourceMeetingId, equals('m-789'));
      expect(model.sourceMeetingTitle, equals('Sprint Planning Meeting'));
      expect(
        model.sourceMeetingAudioUrl,
        equals('https://storage.meetly.local/recordings/sp-1.mp3'),
      );
    });

    test('parses flat source_meeting_id and source_meeting_title', () {
      final json = {
        'id': 'task-002',
        'name': 'Xem lại transcript',
        'status': 'DONE',
        'priority': 'MEDIUM',
        'workspace_id': 'ws-123',
        'project_id': 'p-456',
        'source_meeting_id': 'm-999',
        'source_meeting_title': 'Họp Retro Q3',
        'source_meeting_audio_url': 'https://storage.meetly.local/retro.mp3',
        'created_at': '2026-09-12T08:00:00.000Z',
      };

      final model = TaskModel.fromJson(json);

      expect(model.sourceMeetingId, equals('m-999'));
      expect(model.sourceMeetingTitle, equals('Họp Retro Q3'));
      expect(
        model.sourceMeetingAudioUrl,
        equals('https://storage.meetly.local/retro.mp3'),
      );

      final serialized = model.toJson();
      expect(serialized['sourceMeetingId'], equals('m-999'));
      expect(serialized['sourceMeetingTitle'], equals('Họp Retro Q3'));
      expect(
        serialized['sourceMeetingAudioUrl'],
        equals('https://storage.meetly.local/retro.mp3'),
      );
    });
  });
}

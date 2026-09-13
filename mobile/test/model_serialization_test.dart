import 'package:flutter_test/flutter_test.dart';
import 'package:meetly_mobile/features/auth/data/models/auth_response_model.dart';
import 'package:meetly_mobile/features/task/data/models/task_model.dart';
import 'package:meetly_mobile/features/task/domain/entities/task_entity.dart';
import 'package:meetly_mobile/features/workspace/data/models/workspace_model.dart';

void main() {
  group('Model Serialization Tests', () {
    test('UserModel.fromJson parses successfully', () {
      final json = {
        'id': 'user-123',
        'email': 'admin@meetly.local',
        'name': 'Meetly Admin',
        'avatar_url': 'https://example.com/avatar.png',
        'role_names': ['ADMIN', 'MEMBER'],
        'status': 'ACTIVE',
      };

      final user = UserModel.fromJson(json);
      expect(user.id, 'user-123');
      expect(user.email, 'admin@meetly.local');
      expect(user.name, 'Meetly Admin');
      expect(user.roleNames.length, 2);
    });

    test('WorkspaceModel.fromJson parses successfully', () {
      final json = {
        'id': 'ws-1',
        'name': 'Workspace Alpha',
        'invite_code': 'INV-123',
        'user_id': 'user-1',
      };

      final ws = WorkspaceModel.fromJson(json);
      expect(ws.id, 'ws-1');
      expect(ws.name, 'Workspace Alpha');
      expect(ws.inviteCode, 'INV-123');
    });

    test('TaskModel.fromJson parses successfully with enums', () {
      final json = {
        'id': 'task-1',
        'name': 'Thiết kế Flutter App',
        'status': 'IN_PROGRESS',
        'priority': 'URGENT',
        'workspace_id': 'ws-1',
        'project_id': 'proj-1',
        'labels': ['mobile', 'flutter'],
        'project': {'name': 'Mobile Meetly'},
        'assignee': {'name': 'Nguyen Huynh'},
      };

      final task = TaskModel.fromJson(json);
      expect(task.id, 'task-1');
      expect(task.status, TaskStatus.inProgress);
      expect(task.priority, TaskPriority.urgent);
      expect(task.projectName, 'Mobile Meetly');
      expect(task.assigneeName, 'Nguyen Huynh');
    });
  });
}

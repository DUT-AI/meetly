class ApiEndpoints {
  ApiEndpoints._();

  // Đổi baseUrl theo môi trường (10.0.2.2 cho Android Emulator, localhost cho iOS/Web, hoặc domain server thực tế)
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8000',
  );

  // Auth
  static const String login = '/api/v1/auth/login';
  static const String logout = '/api/v1/auth/logout';
  static const String me = '/api/v1/auth/me';

  // Workspaces
  static const String workspaces = '/api/v1/workspaces';
  static String workspaceDetail(String id) => '/api/v1/workspaces/$id';
  static String workspaceInfo(String id) => '/api/v1/workspaces/$id/info';
  static String workspaceJoin(String id) => '/api/v1/workspaces/$id/join';
  static String workspaceAnalytics(String id) => '/api/v1/workspaces/$id/analytics';
  static String workspaceLabels(String id) => '/api/v1/workspaces/$id/labels';

  // Projects
  static const String projects = '/api/v1/projects';
  static String projectDetail(String id) => '/api/v1/projects/$id';
  static String projectAnalytics(String id) => '/api/v1/projects/$id/analytics';

  // Tasks
  static const String tasks = '/api/v1/tasks';
  static const String myTasks = '/api/v1/tasks/my-tasks';
  static const String bulkUpdateTasks = '/api/v1/tasks/bulk-update';
  static String taskDetail(String id) => '/api/v1/tasks/$id';
  static String taskComments(String id) => '/api/v1/tasks/$id/comments';
  static String taskCommentDetail(String taskId, String commentId) =>
      '/api/v1/tasks/$taskId/comments/$commentId';

  // Assets & Audio
  static String workspaceAssets(String workspaceId) =>
      '/api/v1/workspaces/$workspaceId/assets';
  static String assetDownloadUrl(String workspaceId, String assetId) =>
      '/api/v1/workspaces/$workspaceId/assets/$assetId/download-url';
}

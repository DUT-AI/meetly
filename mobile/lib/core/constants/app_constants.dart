class AppConstants {
  AppConstants._();

  static const String appName = 'Meetly';
  static const String tokenKey = 'meetly_access_token';
  static const String refreshTokenKey = 'meetly_refresh_token';
  static const String currentWorkspaceKey = 'meetly_current_workspace_id';

  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 15);
}

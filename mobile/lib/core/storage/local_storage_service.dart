import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/app_constants.dart';

final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('SharedPreferences must be overridden in main()');
});

final localStorageServiceProvider = Provider<LocalStorageService>((ref) {
  final prefs = ref.watch(sharedPreferencesProvider);
  return LocalStorageService(prefs);
});

class LocalStorageService {
  final SharedPreferences _prefs;

  LocalStorageService(this._prefs);

  Future<void> setSelectedWorkspaceId(String workspaceId) async {
    await _prefs.setString(AppConstants.currentWorkspaceKey, workspaceId);
  }

  String? getSelectedWorkspaceId() {
    return _prefs.getString(AppConstants.currentWorkspaceKey);
  }

  Future<void> clearWorkspaceId() async {
    await _prefs.remove(AppConstants.currentWorkspaceKey);
  }
}

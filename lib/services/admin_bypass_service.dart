import 'package:shared_preferences/shared_preferences.dart';

/// Client-side admin session flag. Change [accessCode] to rotate the PIN.
class AdminBypassService {
  static const accessCode = 'jcpl-admin';
  static const _prefKey = 'admin_bypass';

  Future<bool> isEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_prefKey) ?? false;
  }

  Future<void> enable() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_prefKey, true);
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_prefKey);
  }

  bool matchesCode(String input) {
    return input.trim() == accessCode;
  }
}

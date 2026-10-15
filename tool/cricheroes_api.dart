import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';

const _apiBase = 'https://api.cricheroes.in/api/v1';
const _userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
    '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

class ApiException implements Exception {
  final String message;
  ApiException(this.message);
  @override
  String toString() => message;
}

/// Calls the same public JSON API the cricheroes.com website uses.
class CricHeroesApi {
  final _client = HttpClient()..userAgent = _userAgent;
  final _udid = List.generate(32, (_) => Random().nextInt(16).toRadixString(16)).join();

  /// Returns the response's `data` object.
  Future<Map<String, dynamic>> get(String path) async {
    final res = await getRaw(path);
    final data = res['data'];
    if (data is Map<String, dynamic>) return data;
    throw ApiException('Unexpected response for $path');
  }

  /// Returns the full response body (`status`, `data`, `page`, ...).
  Future<Map<String, dynamic>> getRaw(String path) async {
    final uri = Uri.parse('$_apiBase$path');
    for (var attempt = 1;; attempt++) {
      try {
        final req = await _client.getUrl(uri);
        req.headers
          ..set('api-key', 'cr!CkH3r0s')
          ..set('udid', _udid)
          ..set('device-type', 'Chrome: 126.0.0.0')
          ..set(HttpHeaders.acceptHeader, 'application/json');
        final resp = await req.close().timeout(const Duration(seconds: 30));
        final body = await resp.transform(utf8.decoder).join();
        if (resp.statusCode == 429 || resp.statusCode >= 500) {
          throw ApiException('HTTP ${resp.statusCode} for $path');
        }
        final json = jsonDecode(body) as Map<String, dynamic>;
        if (resp.statusCode != 200 || json['status'] != true) {
          final err = json['error'] ?? json['message'] ?? body;
          throw ApiException('HTTP ${resp.statusCode} for $path: $err');
        }
        return json;
      } on Exception catch (e) {
        final retryable = e is SocketException ||
            e is HttpException ||
            e is TimeoutException ||
            (e is ApiException && RegExp(r'HTTP (429|5\d\d)').hasMatch(e.message));
        if (!retryable || attempt >= 3) {
          throw e is ApiException ? e : ApiException('$e');
        }
        await Future.delayed(Duration(seconds: attempt * 2));
      }
    }
  }

  void close() => _client.close();
}

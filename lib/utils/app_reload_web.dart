import 'dart:html' as html;

Future<void> reloadLatestDeployment() async {
  try {
    final worker = html.window.navigator.serviceWorker;
    if (worker != null) {
      final regs = await worker.getRegistrations();
      for (final reg in regs) {
        await reg.unregister();
      }
    }
  } catch (_) {}
  try {
    final caches = html.window.caches;
    if (caches != null) {
      final keys = await caches.keys();
      for (final key in keys) {
        await caches.delete(key);
      }
    }
  } catch (_) {}
  final loc = html.window.location;
  loc.replace(
    '${loc.protocol}//${loc.host}${loc.pathname}'
    '?v=${DateTime.now().millisecondsSinceEpoch}${loc.hash}',
  );
}

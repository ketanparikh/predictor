class TeamPlaceholders {
  static const Map<String, String> prefixes = {
    'mens': 'Team',
    'womens': "Women's Team",
    'boys': 'Boys Team',
    'girls': 'Girls Team',
  };

  final Map<String, String> _map = {};
  final Map<String, int> _counts = {};

  String name(String raw, {String category = 'mens'}) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) return 'TBD';
    final upper = trimmed.toUpperCase();
    if (upper == 'TBD' || upper == 'TBA' || upper == 'TO BE ANNOUNCED') {
      return 'TBD';
    }
    final key = '${category.toLowerCase()}|$trimmed'.toLowerCase();
    return _map.putIfAbsent(key, () {
      final n = (_counts[category] = (_counts[category] ?? 0) + 1);
      final prefix = prefixes[category] ?? 'Team';
      return '$prefix $n';
    });
  }
}

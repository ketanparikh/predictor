List<String> splitMatchTeams(String name) {
  return name
      .split(RegExp(r'\s+vs\.?\s+|\s+v\.?\s+|\s+versus\s+', caseSensitive: false))
      .map((part) => part.trim())
      .where((part) => part.isNotEmpty)
      .toList();
}

String teamKey(String name) =>
    name.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '');

/// Maps Excel / seed / live-score spellings onto one comparable key.
String canonicalTeamKey(String name) {
  var key = teamKey(name);
  if (key.startsWith('team') && key.length > 4) {
    key = key.substring(4);
  }
  return _aliases[key] ?? key;
}

const _aliases = {
  'mangoyorkers': 'mangoman',
  'mangoman': 'mangoman',
  'inergystrickers': 'inergystrikers',
  'inergystrikers': 'inergystrikers',
  'dalnexautomators': 'dalnex',
  'dalnexdominators': 'dalnex',
  'dalnexdominator': 'dalnex',
  'triphobo': 'triphobo',
  'triphobotrailblazers': 'triphobo',
  'pictonions': 'pictonion',
  'pictonion': 'pictonion',
  'yogicdhuranders': 'yogic',
  'yogicdhurandars': 'yogic',
  'phantomlegions': 'fantomlegions',
  'fantomlegions': 'fantomlegions',
  'd1': 'jadeinfernos',
  'jadeinfernos': 'jadeinfernos',
  'd2': 'jadedominators',
  'jadedominators': 'jadedominators',
  'd3': 'jadereddragons',
  'jadereddragons': 'jadereddragons',
  'd4': 'fantomlegions',
  'jadeunicorn': 'jadeunicorns',
  'jadeunicorns': 'jadeunicorns',
  'jadecardinal': 'jadecardinals',
  'jadecardinals': 'jadecardinals',
};

bool sameTeam(String a, String b) {
  final left = canonicalTeamKey(a);
  final right = canonicalTeamKey(b);
  if (left.isEmpty || right.isEmpty) return false;
  if (left == right) return true;
  if (left.contains(right) || right.contains(left)) {
    return left.length >= 5 && right.length >= 5;
  }
  return false;
}

bool matchHasTeams(String team1, String team2, String a, String b) {
  return (sameTeam(team1, a) && sameTeam(team2, b)) ||
      (sameTeam(team1, b) && sameTeam(team2, a));
}

import 'dart:convert';

import 'package:flutter/services.dart';

import '../models/team.dart';

class TeamRosterService {
  List<_TeamProfile> _profiles = [];
  bool _loaded = false;

  Future<void> load() async {
    if (_loaded) return;
    try {
      final raw = await rootBundle.loadString('assets/config/teams.json');
      final data = json.decode(raw) as Map<String, dynamic>;
      _profiles = [
        ..._mensProfiles(data['teams'] as List? ?? []),
        ..._namedProfiles(data['womensTeams'] as List? ?? []),
        ..._namedProfiles(data['boysTeams'] as List? ?? []),
        ..._namedProfiles(data['girlsTeams'] as List? ?? []),
      ];
      await _attachSponsorAliases();
      _loaded = true;
    } catch (_) {
      _profiles = [];
      _loaded = true;
    }
  }

  List<String> playersFor(String teamName, {List<Team> auctionTeams = const []}) {
    final fromAuction = _auctionPlayers(teamName, auctionTeams);
    final profile = _bestProfile(teamName);
    final players = <String>[];

    void addAll(Iterable<String> names) {
      for (final name in names) {
        final trimmed = name.trim();
        if (trimmed.isEmpty) continue;
        if (!players.any((p) => p.toLowerCase() == trimmed.toLowerCase())) {
          players.add(trimmed);
        }
      }
    }

    if (profile != null) {
      addAll(profile.players);
      if (profile.id.startsWith('team_')) {
        for (final team in auctionTeams) {
          if (team.id == profile.id) addAll(team.players);
        }
      }
    }
    addAll(fromAuction);
    players.sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase()));
    return players;
  }

  List<_TeamProfile> _mensProfiles(List raw) {
    return raw.whereType<Map>().map((item) {
      final map = Map<String, dynamic>.from(item);
      final players = <String>[
        if (map['captain'] != null) '${map['captain']}',
        if (map['viceCaptain'] != null) '${map['viceCaptain']}',
      ];
      return _TeamProfile(
        id: '${map['id'] ?? ''}',
        names: [
          if (map['sponsor'] != null) '${map['sponsor']}',
          if (map['captain'] != null) '${map['captain']}',
        ],
        players: players,
      );
    }).toList();
  }

  List<_TeamProfile> _namedProfiles(List raw) {
    return raw.whereType<Map>().map((item) {
      final map = Map<String, dynamic>.from(item);
      final players = ((map['players'] as List?) ?? [])
          .map((e) => '$e'.trim())
          .where((e) => e.isNotEmpty)
          .toList();
      if (map['captain'] != null) {
        final captain = '${map['captain']}'.trim();
        if (captain.isNotEmpty && !players.contains(captain)) {
          players.insert(0, captain);
        }
      }
      return _TeamProfile(
        id: '${map['id'] ?? ''}',
        names: [
          if (map['name'] != null) '${map['name']}',
          if (map['sponsor'] != null) '${map['sponsor']}',
          if (map['companyName'] != null) '${map['companyName']}',
        ],
        players: players,
      );
    }).toList();
  }

  Future<void> _attachSponsorAliases() async {
    try {
      final raw = await rootBundle.loadString('assets/config/schedule.json');
      final data = json.decode(raw) as Map<String, dynamic>;
      final sponsors = (data['sponsors'] as List? ?? []).whereType<Map>();
      for (final item in sponsors) {
        final map = Map<String, dynamic>.from(item);
        if ('${map['type']}' != 'team') continue;
        final sponsorName = '${map['name'] ?? ''}'.trim();
        final owner = '${map['owner'] ?? ''}'.trim();
        final teamName = '${map['teamName'] ?? ''}'.trim();
        _TeamProfile? target;
        var best = 0;
        for (final profile in _profiles) {
          for (final name in profile.names) {
            final byOwner = owner.isEmpty ? 0 : _score(owner, name);
            if (byOwner > best) {
              best = byOwner;
              target = profile;
            }
          }
        }
        if (target != null && best >= 40) {
          if (sponsorName.isNotEmpty) target.names.add(sponsorName);
          if (teamName.isNotEmpty) target.names.add(teamName);
        }
      }
    } catch (_) {}
  }

  List<String> _auctionPlayers(String teamName, List<Team> auctionTeams) {
    for (final team in auctionTeams) {
      if (_score(teamName, team.name) >= 70) {
        return team.players;
      }
    }
    return const [];
  }

  _TeamProfile? _bestProfile(String teamName) {
    _TeamProfile? best;
    var bestScore = 0;
    for (final profile in _profiles) {
      for (final name in profile.names) {
        final score = _score(teamName, name);
        if (score > bestScore) {
          bestScore = score;
          best = profile;
        }
      }
    }
    return bestScore >= 50 ? best : null;
  }

  int _score(String left, String right) {
    final a = _normalize(left);
    final b = _normalize(right);
    if (a.isEmpty || b.isEmpty) return 0;
    if (a == b) return 100;
    final ac = a.replaceAll(' ', '');
    final bc = b.replaceAll(' ', '');
    if (ac == bc) return 95;
    final shorter = a.length <= b.length ? a : b;
    final longer = a.length <= b.length ? b : a;
    final shorterC = ac.length <= bc.length ? ac : bc;
    final longerC = ac.length <= bc.length ? bc : ac;
    if (shorter.length >= 4 && longer.contains(shorter)) return 80;
    if (shorterC.length >= 5 && longerC.contains(shorterC)) return 80;
    final aTokens = a.split(' ').where((t) => t.length >= 4);
    final bTokens = b.split(' ');
    var score = 0;
    for (final token in aTokens) {
      final hit = bTokens.any((other) =>
          other == token || other.startsWith(token) || token.startsWith(other));
      if (!hit) continue;
      score += token.length >= 5 ? 50 : 25;
    }
    return score;
  }

  String _normalize(String value) {
    return value
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9 ]'), ' ')
        .replaceAll(RegExp(r'\b(team|the|fc|cc)\b'), ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }
}

class _TeamProfile {
  final String id;
  final List<String> names;
  final List<String> players;

  _TeamProfile({
    required this.id,
    required this.names,
    required this.players,
  });
}

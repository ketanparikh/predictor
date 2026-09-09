import '../models/live_score.dart';

class PointsTableCalculator {
  static Map<String, List<Map<String, dynamic>>> merge({
    required Map<String, List<Map<String, dynamic>>> seedByCategory,
    required Iterable<LiveScore> scores,
  }) {
    final completed = scores.where(_isCountable).toList();
    final out = <String, List<Map<String, dynamic>>>{};

    for (final entry in seedByCategory.entries) {
      final teams = entry.value.map((t) {
        final copy = Map<String, dynamic>.from(t);
        copy['played'] = 0;
        copy['won'] = 0;
        copy['lost'] = 0;
        copy['points'] = 0;
        copy['nrr'] = 0.0;
        return copy;
      }).toList();
      _applyScores(teams, completed);
      _sortTeams(entry.key, teams);
      out[entry.key] = teams;
    }
    return out;
  }

  static bool _isCountable(LiveScore score) {
    if (score.status != 'completed') return false;
    final first = score.inningsNumber(1);
    final second = score.inningsNumber(2);
    return first != null && second != null;
  }

  static void _applyScores(
    List<Map<String, dynamic>> teams,
    List<LiveScore> scores,
  ) {
    for (final score in scores) {
      final home = _findTeam(teams, score.team1);
      final away = _findTeam(teams, score.team2);
      if (home == null || away == null) continue;

      final first = score.inningsNumber(1)!;
      final second = score.inningsNumber(2)!;
      final maxOvers = score.maxOvers <= 0 ? 20 : score.maxOvers;
      final maxWickets = score.maxWickets <= 0 ? 10 : score.maxWickets;
      final firstTeam = _accFor(first.battingTeam, home, away);
      final secondTeam = firstTeam == home ? away : home;

      _addMatch(home);
      _addMatch(away);

      if (second.runs > first.runs) {
        _addWin(secondTeam);
        _addLoss(firstTeam);
      } else if (second.runs < first.runs) {
        _addWin(firstTeam);
        _addLoss(secondTeam);
      } else {
        _addTie(home);
        _addTie(away);
      }

      _addInningsNrr(home, away, first, maxOvers, maxWickets);
      _addInningsNrr(home, away, second, maxOvers, maxWickets);
    }

    for (final team in teams) {
      final oversFor = (team['_oversFor'] as num?)?.toDouble() ?? 0;
      final oversAgainst = (team['_oversAgainst'] as num?)?.toDouble() ?? 0;
      if (oversFor > 0 && oversAgainst > 0) {
        final runsFor = (team['_runsFor'] as num?)?.toDouble() ?? 0;
        final runsAgainst = (team['_runsAgainst'] as num?)?.toDouble() ?? 0;
        team['nrr'] = (runsFor / oversFor) - (runsAgainst / oversAgainst);
      }
      team.remove('_runsFor');
      team.remove('_oversFor');
      team.remove('_runsAgainst');
      team.remove('_oversAgainst');
    }
  }

  static _Acc? _findTeam(List<Map<String, dynamic>> teams, String name) {
    final key = _norm(name);
    for (final team in teams) {
      if (_norm('${team['name']}') == key) return _Acc(team);
    }
    for (final team in teams) {
      final teamKey = _norm('${team['name']}');
      if (teamKey.isEmpty || key.isEmpty) continue;
      if (key.contains(teamKey) || teamKey.contains(key)) return _Acc(team);
    }
    return null;
  }

  static String _norm(String value) {
    final key = value.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '');
    switch (key) {
      case 'mangoyorkers':
        return 'mangoman';
      case 'inergystrickers':
      case 'inergystrikers':
        return 'inergystrickers';
      default:
        return key;
    }
  }

  static void _addMatch(_Acc team) {
    team.team['played'] = (team.team['played'] as num? ?? 0).toInt() + 1;
  }

  static void _addWin(_Acc team) {
    team.team['won'] = (team.team['won'] as num? ?? 0).toInt() + 1;
    team.team['points'] = (team.team['points'] as num? ?? 0).toInt() + 2;
  }

  static void _addLoss(_Acc team) {
    team.team['lost'] = (team.team['lost'] as num? ?? 0).toInt() + 1;
  }

  static void _addTie(_Acc team) {
    team.team['points'] = (team.team['points'] as num? ?? 0).toInt() + 1;
  }

  static void _addInningsNrr(
    _Acc home,
    _Acc away,
    Innings innings,
    int maxOvers,
    int maxWickets,
  ) {
    final batting = _accFor(innings.battingTeam, home, away);
    final bowling = batting == home ? away : home;
    final overs = _nrrOvers(innings, maxOvers, maxWickets);
    if (overs <= 0) return;
    batting.addFor(innings.runs.toDouble(), overs);
    bowling.addAgainst(innings.runs.toDouble(), overs);
  }

  static _Acc _accFor(String battingTeam, _Acc home, _Acc away) {
    final key = _norm(battingTeam);
    final homeKey = _norm('${home.team['name']}');
    if (key == homeKey || key.contains(homeKey) || homeKey.contains(key)) {
      return home;
    }
    return away;
  }

  static double _nrrOvers(Innings innings, int maxOvers, int maxWickets) {
    if (innings.wickets >= maxWickets) return maxOvers.toDouble();
    return innings.legalBalls / 6.0;
  }

  static void _sortTeams(String categoryId, List<Map<String, dynamic>> teams) {
    int compare(Map<String, dynamic> a, Map<String, dynamic> b) {
      final pointsA = (a['points'] ?? ((a['won'] ?? 0) * 2)) as num;
      final pointsB = (b['points'] ?? ((b['won'] ?? 0) * 2)) as num;
      if (pointsA != pointsB) return pointsB.compareTo(pointsA);
      final nrrA = (a['nrr'] ?? 0.0) as num;
      final nrrB = (b['nrr'] ?? 0.0) as num;
      return nrrB.compareTo(nrrA);
    }

    if (categoryId == 'mens') {
      final groupA = teams
          .where((t) => (t['group'] ?? '').toString().toUpperCase() == 'A')
          .toList()
        ..sort(compare);
      final groupB = teams
          .where((t) => (t['group'] ?? '').toString().toUpperCase() == 'B')
          .toList()
        ..sort(compare);
      teams
        ..clear()
        ..addAll(groupA)
        ..addAll(groupB);
      return;
    }
    teams.sort(compare);
  }
}

class _Acc {
  final Map<String, dynamic> team;
  _Acc(this.team);

  void addFor(double runs, double overs) {
    team['_runsFor'] = ((team['_runsFor'] as num?)?.toDouble() ?? 0) + runs;
    team['_oversFor'] = ((team['_oversFor'] as num?)?.toDouble() ?? 0) + overs;
  }

  void addAgainst(double runs, double overs) {
    team['_runsAgainst'] =
        ((team['_runsAgainst'] as num?)?.toDouble() ?? 0) + runs;
    team['_oversAgainst'] =
        ((team['_oversAgainst'] as num?)?.toDouble() ?? 0) + overs;
  }
}

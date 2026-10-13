import '../models/bracket.dart';
import '../models/live_score.dart';
import '../models/tournament.dart';
import '../utils/match_teams.dart';
import 'points_table_calculator.dart';

class BracketEngine {
  static const correctPoints = 10;
  static const wrongPoints = -5;

  static String? canonicalName(List<Map<String, dynamic>> teams, String name) {
    for (final team in teams) {
      final teamName = '${team['name'] ?? ''}'.trim();
      if (teamName.isNotEmpty && sameTeam(teamName, name)) return teamName;
    }
    return null;
  }

  static String groupOf(List<Map<String, dynamic>> teams, String name) {
    for (final team in teams) {
      if (sameTeam('${team['name'] ?? ''}', name)) {
        final group = '${team['group'] ?? ''}'.toUpperCase();
        return group.isEmpty ? 'all' : group;
      }
    }
    return 'all';
  }

  static List<BracketMatch> categoryMatches({
    required BracketLayout layout,
    required List<Map<String, dynamic>> seed,
    required List<Tournament> tournaments,
  }) {
    return _collectMatches(layout: layout, seed: seed, tournaments: tournaments);
  }

  static List<BracketMatch> leagueMatches({
    required BracketLayout layout,
    required List<Map<String, dynamic>> seed,
    required List<Tournament> tournaments,
  }) {
    return _collectMatches(
      layout: layout,
      seed: seed,
      tournaments: tournaments,
      sameGroupOnly: true,
    );
  }

  static bool _belongsToCategory({
    required MatchInfo match,
    required BracketLayout layout,
    required List<Map<String, dynamic>> seed,
    required List<String> parts,
  }) {
    final category = match.category;
    if (category != null && category.isNotEmpty) {
      return category == layout.categoryId;
    }
    if (parts.length < 2) return false;
    return canonicalName(seed, parts[0]) != null &&
        canonicalName(seed, parts[1]) != null;
  }

  static List<BracketMatch> _collectMatches({
    required BracketLayout layout,
    required List<Map<String, dynamic>> seed,
    required List<Tournament> tournaments,
    bool sameGroupOnly = false,
  }) {
    final matches = <BracketMatch>[];
    for (final day in tournaments) {
      for (final match in day.matches) {
        final parts = splitMatchTeams(match.name);
        if (!_belongsToCategory(
          match: match,
          layout: layout,
          seed: seed,
          parts: parts,
        )) {
          continue;
        }
        final raw1 = parts.isNotEmpty ? parts[0] : match.name;
        final raw2 = parts.length > 1 ? parts[1] : 'TBD';
        if (raw1.isEmpty && raw2.isEmpty) continue;
        final team1 = canonicalName(seed, raw1) ?? raw1;
        final team2 = canonicalName(seed, raw2) ?? raw2;
        final mapped1 = canonicalName(seed, team1);
        final mapped2 = canonicalName(seed, team2);
        if (sameGroupOnly) {
          if (mapped1 == null || mapped2 == null) continue;
          final group1 = groupOf(seed, mapped1);
          final group2 = groupOf(seed, mapped2);
          if (layout.grouped && group1 != group2) continue;
          matches.add(BracketMatch(
            id: match.id,
            team1: mapped1,
            team2: mapped2,
            group: layout.grouped ? group1 : 'all',
            date: day.name,
            time: match.time,
          ));
          continue;
        }
        final group = mapped1 != null ? groupOf(seed, mapped1) : 'all';
        matches.add(BracketMatch(
          id: match.id,
          team1: team1,
          team2: team2,
          group: layout.grouped ? group : 'all',
          date: day.name,
          time: match.time,
        ));
      }
    }
    return matches;
  }

  static LiveScore? scoreFor(
    BracketMatch match,
    Map<String, LiveScore> scores,
  ) {
    final direct = scores[match.id];
    if (direct != null) return direct;
    for (final score in scores.values) {
      if (matchHasTeams(score.team1, score.team2, match.team1, match.team2)) {
        return score;
      }
    }
    return null;
  }

  static String? officialMatchWinner(
    BracketMatch match,
    Map<String, LiveScore> scores,
  ) {
    final score = scoreFor(match, scores);
    if (score == null || !score.isComplete) return null;
    final winner = score.winnerName;
    if (winner == null || winner.isEmpty) return null;
    return canonicalName([
      {'name': match.team1},
      {'name': match.team2},
    ], winner);
  }

  static Map<String, String> effectiveMatchWinners({
    required List<BracketMatch> matches,
    required Map<String, String> picks,
    required Map<String, LiveScore> scores,
  }) {
    final winners = Map<String, String>.from(picks);
    for (final match in matches) {
      final official = officialMatchWinner(match, scores);
      if (official != null) winners[match.id] = official;
    }
    return winners;
  }

  static List<Map<String, dynamic>> predictedTable({
    required String categoryId,
    required List<Map<String, dynamic>> seed,
    required List<BracketMatch> matches,
    required Map<String, String> matchWinners,
  }) {
    final teams = seed.map((team) {
      final copy = Map<String, dynamic>.from(team);
      copy['played'] = 0;
      copy['won'] = 0;
      copy['lost'] = 0;
      copy['points'] = 0;
      copy['nrr'] = 0.0;
      return copy;
    }).toList();

    Map<String, dynamic>? find(String name) {
      for (final team in teams) {
        if (sameTeam('${team['name']}', name)) return team;
      }
      return null;
    }

    for (final match in matches) {
      final winner = matchWinners[match.id];
      if (winner == null || winner.isEmpty) continue;
      final home = find(match.team1);
      final away = find(match.team2);
      if (home == null || away == null) continue;
      home['played'] = (home['played'] as int) + 1;
      away['played'] = (away['played'] as int) + 1;
      if (sameTeam(winner, match.team1)) {
        home['won'] = (home['won'] as int) + 1;
        home['points'] = (home['points'] as int) + 2;
        away['lost'] = (away['lost'] as int) + 1;
      } else if (sameTeam(winner, match.team2)) {
        away['won'] = (away['won'] as int) + 1;
        away['points'] = (away['points'] as int) + 2;
        home['lost'] = (home['lost'] as int) + 1;
      }
    }

    PointsTableCalculator.sortTeams(categoryId, teams);
    return teams;
  }

  static String? teamForKey(
    String key,
    Map<String, List<String>> ranks,
    Map<String, String> winners,
  ) {
    if (winners.containsKey(key) && winners[key]!.isNotEmpty) {
      return winners[key];
    }
    final match = RegExp(r'^([A-Za-z]+)(\d+)$').firstMatch(key);
    if (match == null) return null;
    final group = match.group(1)!;
    final index = int.parse(match.group(2)!) - 1;
    final list = ranks[group] ?? const <String>[];
    if (index < 0 || index >= list.length) return null;
    final name = list[index].trim();
    return name.isEmpty ? null : name;
  }

  static List<String> sidesFor(
    BracketSlot slot,
    Map<String, List<String>> ranks,
    Map<String, String> winners,
  ) {
    return [
      teamForKey(slot.homeKey, ranks, winners) ?? '',
      teamForKey(slot.awayKey, ranks, winners) ?? '',
    ];
  }

  static Map<String, String> pruneWinners(
    Map<String, String> winners,
    Map<String, List<String>> ranks,
    BracketLayout layout,
  ) {
    final next = Map<String, String>.from(winners);
    for (final slot in layout.slots) {
      final sides = sidesFor(slot, ranks, next);
      final pick = next[slot.id];
      if (pick == null || pick.isEmpty) continue;
      if (!sides.any((side) => side.isNotEmpty && sameTeam(side, pick))) {
        next.remove(slot.id);
      }
    }
    return next;
  }

  static BracketPicks setMatchWinner({
    required BracketPicks picks,
    required BracketLayout layout,
    required List<Map<String, dynamic>> seed,
    required List<BracketMatch> matches,
    required Map<String, LiveScore> scores,
    required String matchId,
    required String team,
  }) {
    final matchWinners = Map<String, String>.from(picks.matchWinners);
    if (team.isEmpty || sameTeam(matchWinners[matchId] ?? '', team)) {
      matchWinners.remove(matchId);
    } else {
      matchWinners[matchId] = team;
    }
    final effective = effectiveMatchWinners(
      matches: matches,
      picks: matchWinners,
      scores: scores,
    );
    final table = predictedTable(
      categoryId: layout.categoryId,
      seed: seed,
      matches: matches,
      matchWinners: effective,
    );
    final ranks = officialRanks(layout, table);
    return picks.copyWith(
      matchWinners: matchWinners,
      ranks: ranks,
      winners: pruneWinners(picks.winners, ranks, layout),
    );
  }

  static BracketPicks setWinner(
    BracketPicks picks,
    BracketLayout layout,
    String slotId,
    String team, {
    Map<String, List<String>>? ranks,
  }) {
    final resolvedRanks = ranks ?? picks.ranks;
    final winners = Map<String, String>.from(picks.winners);
    if (team.isEmpty || sameTeam(winners[slotId] ?? '', team)) {
      winners.remove(slotId);
    } else {
      winners[slotId] = team;
    }
    return picks.copyWith(
      ranks: resolvedRanks,
      winners: pruneWinners(winners, resolvedRanks, layout),
    );
  }

  static Map<String, List<String>> officialRanks(
    BracketLayout layout,
    List<Map<String, dynamic>> standings,
  ) {
    final ranks = <String, List<String>>{};
    for (final group in layout.groups) {
      final teams = standings.where((team) {
        if (group == 'all') return true;
        return '${team['group'] ?? ''}'.toUpperCase() == group;
      }).toList();
      ranks[group] = teams
          .map((team) => '${team['name'] ?? ''}'.trim())
          .where((name) => name.isNotEmpty)
          .toList();
    }
    return ranks;
  }

  static Map<String, String> officialWinners({
    required BracketLayout layout,
    required Map<String, List<String>> ranks,
    required Iterable<LiveScore> scores,
    required Map<String, String> adminWinners,
  }) {
    final winners = <String, String>{};
    for (final slot in layout.slots) {
      if (adminWinners[slot.id]?.isNotEmpty == true) {
        winners[slot.id] = adminWinners[slot.id]!;
        continue;
      }
      final sides = sidesFor(slot, ranks, winners);
      if (sides[0].isEmpty || sides[1].isEmpty) continue;
      for (final score in scores) {
        if (!score.isComplete) continue;
        if (!matchHasTeams(score.team1, score.team2, sides[0], sides[1])) {
          continue;
        }
        final winner = score.winnerName;
        if (winner != null && winner.isNotEmpty) {
          winners[slot.id] = winner;
        }
        break;
      }
    }
    return winners;
  }

  static BracketScore scorePicks({
    required BracketLayout layout,
    required BracketPicks picks,
    required Map<String, List<String>> officialRankMap,
    required Map<String, String> officialWinnerMap,
    List<BracketMatch> matches = const [],
    Map<String, LiveScore> scores = const {},
  }) {
    var points = 0;
    var correct = 0;
    var wrong = 0;
    var pending = 0;

    void scorePick(String? predicted, String? official) {
      if (official == null || official.isEmpty) {
        if (predicted != null && predicted.isNotEmpty) pending++;
        return;
      }
      if (predicted == null || predicted.isEmpty) return;
      if (sameTeam(official, predicted)) {
        points += correctPoints;
        correct++;
      } else {
        points += wrongPoints;
        wrong++;
      }
    }

    for (final match in matches) {
      scorePick(
        picks.matchWinners[match.id],
        officialMatchWinner(match, scores),
      );
    }

    for (final slot in layout.slots) {
      final sides = sidesFor(slot, officialRankMap, officialWinnerMap);
      final duplicate = matches.any((match) =>
          sides[0].isNotEmpty &&
          sides[1].isNotEmpty &&
          matchHasTeams(match.team1, match.team2, sides[0], sides[1]));
      if (duplicate) continue;
      scorePick(picks.winners[slot.id], officialWinnerMap[slot.id]);
    }

    return BracketScore(
      points: points,
      correct: correct,
      wrong: wrong,
      pending: pending,
    );
  }
}

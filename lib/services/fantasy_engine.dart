import '../models/fantasy.dart';
import '../models/live_score.dart';
import '../models/team.dart';
import 'team_roster_service.dart';

class FantasyEngine {
  static const budget = 100.0;
  static const squadSize = 11;
  static const maxFromTeam = 7;
  static const roles = ['WK', 'BAT', 'AR', 'BOWL'];

  static const _roleLimits = {
    'WK': (1, 4),
    'BAT': (3, 6),
    'AR': (1, 4),
    'BOWL': (3, 6),
  };

  static double creditsFor(String name, {bool captain = false, bool vc = false}) {
    if (captain) return 11.0;
    if (vc) return 10.5;
    final hash = name.toLowerCase().codeUnits.fold<int>(0, (sum, c) => sum + c);
    const options = [8.0, 8.5, 9.0, 9.5, 10.0];
    return options[hash % options.length];
  }

  static List<FantasyPlayer> poolFor({
    required String team1,
    required String team2,
    required TeamRosterService roster,
    List<Team> auctionTeams = const [],
    List<String> team1Squad = const [],
    List<String> team2Squad = const [],
  }) {
    final players = <FantasyPlayer>[];
    void addTeam(String team, List<String> extra) {
      final names = [
        ...roster.playersFor(team, auctionTeams: auctionTeams),
        ...extra,
      ];
      for (final name in names) {
        final trimmed = name.trim();
        if (trimmed.isEmpty) continue;
        if (players.any((p) => p.name.toLowerCase() == trimmed.toLowerCase())) {
          continue;
        }
        players.add(FantasyPlayer(
          name: trimmed,
          team: team,
          role: 'BAT',
          credits: creditsFor(trimmed),
        ));
      }
    }

    addTeam(team1, team1Squad);
    addTeam(team2, team2Squad);
    players.sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
    return players;
  }

  static String? validate(FantasyEntry entry) {
    if (entry.players.length != squadSize) {
      return 'Pick exactly $squadSize players';
    }
    if (entry.spent > budget + 0.01) {
      return 'Squad is over the $budget credit cap';
    }
    if (entry.captain.isEmpty || entry.viceCaptain.isEmpty) {
      return 'Choose a captain and vice-captain';
    }
    if (entry.captain == entry.viceCaptain) {
      return 'Captain and vice-captain must be different';
    }
    final names = entry.players.map((p) => p.name).toList();
    if (!names.contains(entry.captain) || !names.contains(entry.viceCaptain)) {
      return 'Captain and vice-captain must be in your XI';
    }
    final byTeam = <String, int>{};
    for (final player in entry.players) {
      byTeam[player.team] = (byTeam[player.team] ?? 0) + 1;
    }
    if (byTeam.values.any((count) => count > maxFromTeam)) {
      return 'Maximum $maxFromTeam players from one team';
    }
    for (final role in roles) {
      final count = entry.players.where((p) => p.role == role).length;
      final limits = _roleLimits[role]!;
      if (count < limits.$1 || count > limits.$2) {
        return '$role must be ${limits.$1}–${limits.$2} players';
      }
    }
    return null;
  }

  static FantasyResult score(LiveScore score, FantasyEntry entry) {
    final raw = <String, double>{};
    final notes = <String, List<String>>{};

    void add(String player, double pts, String why) {
      if (player.trim().isEmpty) return;
      raw[player] = (raw[player] ?? 0) + pts;
      notes.putIfAbsent(player, () => []).add(why);
    }

    for (final innings in score.innings) {
      for (final batter in innings.batters) {
        if (batter.balls == 0 && batter.runs == 0 && !batter.out) continue;
        add(batter.name, 4, 'Played');
        add(batter.name, batter.runs.toDouble(), '${batter.runs} runs');
        if (batter.fours > 0) {
          add(batter.name, batter.fours.toDouble(), '${batter.fours} fours');
        }
        if (batter.sixes > 0) {
          add(batter.name, batter.sixes * 2, '${batter.sixes} sixes');
        }
        if (batter.runs >= 50) {
          add(batter.name, 8, 'Fifty');
        } else if (batter.runs >= 25) {
          add(batter.name, 4, '25+ runs');
        }
        if (batter.out && batter.runs == 0) {
          add(batter.name, -2, 'Duck');
        }
      }
      for (final bowler in innings.bowlers) {
        if (bowler.balls == 0 && bowler.wickets == 0) continue;
        if (!(notes[bowler.name]?.contains('Played') ?? false)) {
          add(bowler.name, 4, 'Played');
        }
        if (bowler.wickets > 0) {
          add(bowler.name, bowler.wickets * 25, '${bowler.wickets} wickets');
        }
        if (bowler.maidens > 0) {
          add(bowler.name, bowler.maidens * 8, '${bowler.maidens} maidens');
        }
        if (bowler.wickets >= 5) {
          add(bowler.name, 16, '5-wicket haul');
        } else if (bowler.wickets >= 4) {
          add(bowler.name, 8, '4 wickets');
        } else if (bowler.wickets >= 3) {
          add(bowler.name, 4, '3 wickets');
        }
        if (bowler.balls >= 12) {
          final econ = bowler.econ;
          if (econ < 5) {
            add(bowler.name, 6, 'Economy bonus');
          } else if (econ < 6) {
            add(bowler.name, 4, 'Economy bonus');
          } else if (econ < 7) {
            add(bowler.name, 2, 'Economy bonus');
          } else if (econ > 12) {
            add(bowler.name, -6, 'Economy penalty');
          } else if (econ > 11) {
            add(bowler.name, -4, 'Economy penalty');
          } else if (econ > 10) {
            add(bowler.name, -2, 'Economy penalty');
          }
        }
      }
      for (final event in innings.events) {
        final fielder = event.fielder?.trim() ?? '';
        if (fielder.isEmpty || event.wicket == null) continue;
        if (!(notes[fielder]?.contains('Played') ?? false)) {
          add(fielder, 4, 'Played');
        }
        switch (event.wicket) {
          case 'caught':
            add(fielder, 8, 'Catch');
            break;
          case 'stumped':
            add(fielder, 12, 'Stumping');
            break;
          case 'runOut':
            add(fielder, 6, 'Run out');
            break;
        }
      }
    }

    FantasyPoints forPlayer(FantasyPlayer player) {
      var pts = 0.0;
      var breakdown = <String>[];
      for (final entry in raw.entries) {
        if (entry.key.toLowerCase() != player.name.toLowerCase()) continue;
        pts += entry.value;
        breakdown = notes[entry.key] ?? const [];
      }
      if (player.name == entry.captain) {
        pts *= 2;
        breakdown = [...breakdown, 'Captain 2x'];
      } else if (player.name == entry.viceCaptain) {
        pts *= 1.5;
        breakdown = [...breakdown, 'VC 1.5x'];
      }
      return FantasyPoints(player: player.name, points: pts, breakdown: breakdown);
    }

    final byPlayer = <String, FantasyPoints>{};
    var total = 0.0;
    for (final player in entry.players) {
      final result = forPlayer(player);
      byPlayer[player.name] = result;
      total += result.points;
    }
    return FantasyResult(total: total, byPlayer: byPlayer);
  }
}

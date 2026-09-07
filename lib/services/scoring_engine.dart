import '../models/live_score.dart';

class ScoringEngine {
  static LiveScore startFirstInnings({
    required LiveScore match,
    required String battingTeam,
    required String striker,
    required String nonStriker,
    required String bowler,
    required int maxOvers,
    required int maxWickets,
    String? tossWinner,
    String? tossDecision,
  }) {
    final bowlingTeam =
        battingTeam == match.team1 ? match.team2 : match.team1;
    final innings = _rebuildInnings(
      number: 1,
      battingTeam: battingTeam,
      bowlingTeam: bowlingTeam,
      openingStriker: striker,
      openingNonStriker: nonStriker,
      openingBowler: bowler,
      events: const [],
      maxOvers: maxOvers,
      maxWickets: maxWickets,
      chaseTarget: null,
    );
    return _sync(
      match.copyWith(
        status: 'live',
        maxOvers: maxOvers,
        maxWickets: maxWickets,
        currentInnings: 1,
        tossWinner: tossWinner,
        tossDecision: tossDecision,
        innings: [innings],
        clearResult: true,
      ),
    );
  }

  static LiveScore startSecondInnings({
    required LiveScore match,
    required String striker,
    required String nonStriker,
    required String bowler,
  }) {
    final first = match.inningsNumber(1);
    if (first == null) return match;
    final innings = _rebuildInnings(
      number: 2,
      battingTeam: first.bowlingTeam,
      bowlingTeam: first.battingTeam,
      openingStriker: striker,
      openingNonStriker: nonStriker,
      openingBowler: bowler,
      events: const [],
      maxOvers: match.maxOvers,
      maxWickets: match.maxWickets,
      chaseTarget: first.runs + 1,
    );
    return _sync(
      match.copyWith(
        status: 'live',
        currentInnings: 2,
        innings: [...match.innings.where((i) => i.number != 2), innings],
      ),
    );
  }

  static LiveScore addDelivery(LiveScore match, BallEvent event) {
    final current = match.liveInnings;
    if (current == null || current.completed || match.isComplete) {
      return match;
    }
    final bowler = (event.bowler != null && event.bowler!.isNotEmpty)
        ? event.bowler!
        : current.currentBowler;
    final legal = event.kind != 'wide' && event.kind != 'noBall';
    final draft = BallEvent(
      kind: event.kind,
      runs: event.runs,
      wicket: event.wicket,
      outNonStriker: event.outNonStriker,
      fielder: event.fielder,
      newBatsman: event.newBatsman,
      bowler: bowler,
      batsman: current.striker,
      legalBall: legal,
    );
    final annotated = BallEvent(
      kind: draft.kind,
      runs: draft.runs,
      wicket: draft.wicket,
      outNonStriker: draft.outNonStriker,
      fielder: draft.fielder,
      newBatsman: draft.newBatsman,
      bowler: draft.bowler,
      batsman: draft.batsman,
      legalBall: draft.legalBall,
      commentary: _commentary(current, draft),
    );
    final rebuilt = _rebuildInnings(
      number: current.number,
      battingTeam: current.battingTeam,
      bowlingTeam: current.bowlingTeam,
      openingStriker: current.openingStriker,
      openingNonStriker: current.openingNonStriker,
      openingBowler: current.openingBowler,
      events: [...current.events, annotated],
      maxOvers: match.maxOvers,
      maxWickets: match.maxWickets,
      chaseTarget: current.number == 2 ? match.target : null,
    );
    return _afterInningsUpdate(match, rebuilt);
  }

  static LiveScore rehydrate(LiveScore match) {
    var next = match;
    for (final inn in match.innings) {
      next = _replaceInnings(
        next,
        _rebuildInnings(
          number: inn.number,
          battingTeam: inn.battingTeam,
          bowlingTeam: inn.bowlingTeam,
          openingStriker: inn.openingStriker,
          openingNonStriker: inn.openingNonStriker,
          openingBowler: inn.openingBowler,
          events: inn.events,
          maxOvers: match.maxOvers,
          maxWickets: match.maxWickets,
          chaseTarget: inn.number == 2 ? match.target : null,
        ),
      );
    }
    return _sync(next);
  }

  static LiveScore undo(LiveScore match) {
    final current = match.liveInnings;
    if (current == null || current.events.isEmpty) return match;
    final rebuilt = _rebuildInnings(
      number: current.number,
      battingTeam: current.battingTeam,
      bowlingTeam: current.bowlingTeam,
      openingStriker: current.openingStriker,
      openingNonStriker: current.openingNonStriker,
      openingBowler: current.openingBowler,
      events: current.events.sublist(0, current.events.length - 1),
      maxOvers: match.maxOvers,
      maxWickets: match.maxWickets,
      chaseTarget: current.number == 2 ? match.target : null,
    );
    return _afterInningsUpdate(
      match.copyWith(status: 'live', clearResult: true),
      rebuilt,
    );
  }

  static LiveScore swapStrike(LiveScore match) {
    final current = match.liveInnings;
    if (current == null) return match;
    final swapped = Innings(
      number: current.number,
      battingTeam: current.battingTeam,
      bowlingTeam: current.bowlingTeam,
      openingStriker: current.openingStriker,
      openingNonStriker: current.openingNonStriker,
      openingBowler: current.openingBowler,
      events: current.events,
      runs: current.runs,
      wickets: current.wickets,
      legalBalls: current.legalBalls,
      wides: current.wides,
      noBalls: current.noBalls,
      byes: current.byes,
      legByes: current.legByes,
      batters: current.batters,
      bowlers: current.bowlers,
      striker: current.nonStriker,
      nonStriker: current.striker,
      currentBowler: current.currentBowler,
      needsNewBowler: current.needsNewBowler,
      completed: current.completed,
      thisOver: current.thisOver,
      fallOfWickets: current.fallOfWickets,
      partnershipRuns: current.partnershipRuns,
      partnershipBalls: current.partnershipBalls,
    );
    return _sync(_replaceInnings(match, swapped));
  }

  static LiveScore changeBowler(LiveScore match, String bowler) {
    final current = match.liveInnings;
    if (current == null) return match;
    final spells = [...current.bowlers];
    if (spells.every((b) => b.name != bowler)) {
      spells.add(BowlerSpell(name: bowler));
    }
    final updated = Innings(
      number: current.number,
      battingTeam: current.battingTeam,
      bowlingTeam: current.bowlingTeam,
      openingStriker: current.openingStriker,
      openingNonStriker: current.openingNonStriker,
      openingBowler: current.openingBowler,
      events: current.events,
      runs: current.runs,
      wickets: current.wickets,
      legalBalls: current.legalBalls,
      wides: current.wides,
      noBalls: current.noBalls,
      byes: current.byes,
      legByes: current.legByes,
      batters: current.batters,
      bowlers: spells,
      striker: current.striker,
      nonStriker: current.nonStriker,
      currentBowler: bowler,
      needsNewBowler: false,
      completed: current.completed,
      thisOver: current.thisOver,
      fallOfWickets: current.fallOfWickets,
      partnershipRuns: current.partnershipRuns,
      partnershipBalls: current.partnershipBalls,
    );
    return _sync(_replaceInnings(match, updated));
  }

  static LiveScore endInnings(LiveScore match) {
    final current = match.liveInnings;
    if (current == null) return match;
    final ended = Innings(
      number: current.number,
      battingTeam: current.battingTeam,
      bowlingTeam: current.bowlingTeam,
      openingStriker: current.openingStriker,
      openingNonStriker: current.openingNonStriker,
      openingBowler: current.openingBowler,
      events: current.events,
      runs: current.runs,
      wickets: current.wickets,
      legalBalls: current.legalBalls,
      wides: current.wides,
      noBalls: current.noBalls,
      byes: current.byes,
      legByes: current.legByes,
      batters: current.batters,
      bowlers: current.bowlers,
      striker: current.striker,
      nonStriker: current.nonStriker,
      currentBowler: current.currentBowler,
      needsNewBowler: false,
      completed: true,
      thisOver: current.thisOver,
      fallOfWickets: current.fallOfWickets,
      partnershipRuns: current.partnershipRuns,
      partnershipBalls: current.partnershipBalls,
    );
    var next = _sync(_replaceInnings(match, ended));
    if (ended.number == 2) {
      next = completeMatch(next);
    } else {
      next = next.copyWith(status: 'live');
    }
    return next;
  }

  static LiveScore completeMatch(LiveScore match) {
    final first = match.inningsNumber(1);
    final second = match.inningsNumber(2);
    String result;
    if (first == null) {
      result = 'Match completed';
    } else if (second == null) {
      result = '${first.battingTeam} ${first.scoreLine}';
    } else if (second.runs > first.runs) {
      final wktsLeft = match.maxWickets - second.wickets;
      final ballsLeft = match.maxOvers * 6 - second.legalBalls;
      result =
          '${second.battingTeam} won by $wktsLeft wicket${wktsLeft == 1 ? '' : 's'} ($ballsLeft ball${ballsLeft == 1 ? '' : 's'} remaining)';
    } else if (second.runs < first.runs) {
      final margin = first.runs - second.runs;
      result =
          '${first.battingTeam} won by $margin run${margin == 1 ? '' : 's'}';
    } else {
      result = 'Match tied';
    }
    return _sync(match.copyWith(status: 'completed', result: result));
  }

  static LiveScore addToSquad(LiveScore match, int team, String player) {
    final name = player.trim();
    if (name.isEmpty) return match;
    if (team == 1) {
      if (match.team1Squad.contains(name)) return match;
      return match.copyWith(team1Squad: [...match.team1Squad, name]);
    }
    if (match.team2Squad.contains(name)) return match;
    return match.copyWith(team2Squad: [...match.team2Squad, name]);
  }

  static LiveScore _afterInningsUpdate(LiveScore match, Innings innings) {
    var next = _sync(_replaceInnings(match, innings));
    if (innings.number == 2 && innings.completed) {
      next = completeMatch(next);
    }
    return next;
  }

  static LiveScore _replaceInnings(LiveScore match, Innings innings) {
    final list = [...match.innings];
    final idx = list.indexWhere((i) => i.number == innings.number);
    if (idx >= 0) {
      list[idx] = innings;
    } else {
      list.add(innings);
    }
    return match.copyWith(innings: list, currentInnings: innings.number);
  }

  static LiveScore _sync(LiveScore match) {
    int t1r = 0, t1w = 0, t2r = 0, t2w = 0;
    double t1o = 0, t2o = 0;
    for (final inn in match.innings) {
      if (inn.battingTeam == match.team1) {
        t1r = inn.runs;
        t1w = inn.wickets;
        t1o = cricketOversDouble(inn.legalBalls);
      } else if (inn.battingTeam == match.team2) {
        t2r = inn.runs;
        t2w = inn.wickets;
        t2o = cricketOversDouble(inn.legalBalls);
      }
    }
    final live = match.liveInnings;
    final side = live != null && live.battingTeam == match.team2 ? 2 : 1;
    return match.copyWith(
      team1Runs: t1r,
      team1Wickets: t1w,
      team1Overs: t1o,
      team2Runs: t2r,
      team2Wickets: t2w,
      team2Overs: t2o,
      battingSide: side,
    );
  }

  static Innings _rebuildInnings({
    required int number,
    required String battingTeam,
    required String bowlingTeam,
    required String openingStriker,
    required String openingNonStriker,
    required String openingBowler,
    required List<BallEvent> events,
    required int maxOvers,
    required int maxWickets,
    required int? chaseTarget,
  }) {
    final batters = <String, _Batter>{
      openingStriker: _Batter(openingStriker),
      openingNonStriker: _Batter(openingNonStriker),
    };
    final batterOrder = <String>[openingStriker, openingNonStriker];
    final bowlers = <String, _Bowler>{
      openingBowler: _Bowler(openingBowler),
    };
    final bowlerOrder = <String>[openingBowler];

    var runs = 0;
    var wickets = 0;
    var legalBalls = 0;
    var wides = 0;
    var noBalls = 0;
    var byes = 0;
    var legByes = 0;
    var striker = openingStriker;
    var nonStriker = openingNonStriker;
    var bowler = openingBowler;
    var legalInOver = 0;
    var bowlerRunsThisOver = 0;
    var thisOver = <String>[];
    var needsNewBowler = false;
    var completed = false;
    final fow = <FallOfWicket>[];
    var partnershipRuns = 0;
    var partnershipBalls = 0;

    void ensureBatter(String name) {
      batters.putIfAbsent(name, () => _Batter(name));
      if (!batterOrder.contains(name)) batterOrder.add(name);
    }

    void ensureBowler(String name) {
      bowlers.putIfAbsent(name, () => _Bowler(name));
      if (!bowlerOrder.contains(name)) bowlerOrder.add(name);
    }

    for (final event in events) {
      if (completed) break;
      if (event.bowler != null && event.bowler!.isNotEmpty) {
        if (event.bowler != bowler) {
          bowler = event.bowler!;
          bowlerRunsThisOver = 0;
          needsNewBowler = false;
        }
        ensureBowler(bowler);
      }

      ensureBatter(striker);
      final batter = batters[striker]!;
      final spell = bowlers[bowler]!;
      final legal = event.kind != 'wide' && event.kind != 'noBall';
      var teamRuns = 0;
      var token = '';
      var rotate = false;

      switch (event.kind) {
        case 'wide':
          teamRuns = 1 + event.runs;
          wides += teamRuns;
          spell.runs += teamRuns;
          spell.wides += 1;
          bowlerRunsThisOver += teamRuns;
          token = event.runs > 0 ? 'wd+${event.runs}' : 'wd';
          rotate = event.runs.isOdd;
          break;
        case 'noBall':
          teamRuns = 1 + event.runs;
          noBalls += 1;
          batter.runs += event.runs;
          batter.balls += 1;
          if (event.runs == 4) batter.fours++;
          if (event.runs == 6) batter.sixes++;
          spell.runs += teamRuns;
          spell.noBalls += 1;
          bowlerRunsThisOver += teamRuns;
          token = event.runs > 0 ? 'nb+${event.runs}' : 'nb';
          rotate = event.runs.isOdd;
          break;
        case 'bye':
          teamRuns = event.runs;
          byes += teamRuns;
          batter.balls += 1;
          spell.balls += 1;
          token = event.runs == 0 ? 'b' : '${event.runs}b';
          rotate = event.runs.isOdd;
          break;
        case 'legBye':
          teamRuns = event.runs;
          legByes += teamRuns;
          batter.balls += 1;
          spell.balls += 1;
          token = event.runs == 0 ? 'lb' : '${event.runs}lb';
          rotate = event.runs.isOdd;
          break;
        default:
          teamRuns = event.runs;
          batter.runs += event.runs;
          batter.balls += 1;
          if (event.runs == 4) batter.fours++;
          if (event.runs == 6) batter.sixes++;
          spell.runs += event.runs;
          spell.balls += 1;
          bowlerRunsThisOver += event.runs;
          token = event.runs == 0 ? '.' : '${event.runs}';
          rotate = event.runs.isOdd;
      }

      runs += teamRuns;
      partnershipRuns += teamRuns;
      if (legal) partnershipBalls += 1;

      if (event.wicket != null) {
        token = (token == '.' || token.isEmpty) ? 'W' : '$token W';
        final outName = event.outNonStriker ? nonStriker : striker;
        ensureBatter(outName);
        final outBatter = batters[outName]!;
        outBatter.out = true;
        outBatter.dismissal = _dismissal(
          event.wicket!,
          bowler,
          event.fielder,
        );
        if (_bowlerCredit(event.wicket!)) {
          spell.wickets += 1;
        }
        wickets += 1;
        final oversAtFall =
            cricketOvers(legalBalls + (legal ? 1 : 0));
        fow.add(FallOfWicket(
          wicket: wickets,
          batter: outName,
          score: runs,
          overs: oversAtFall,
        ));
        partnershipRuns = 0;
        partnershipBalls = 0;
        if (wickets < maxWickets &&
            event.newBatsman != null &&
            event.newBatsman!.trim().isNotEmpty) {
          ensureBatter(event.newBatsman!);
          if (event.outNonStriker) {
            nonStriker = event.newBatsman!;
          } else {
            striker = event.newBatsman!;
          }
        }
      }

      thisOver.add(token);

      if (legal) {
        legalBalls += 1;
        legalInOver += 1;
      }

      if (rotate) {
        final tmp = striker;
        striker = nonStriker;
        nonStriker = tmp;
      }

      if (legalInOver == 6) {
        if (bowlerRunsThisOver == 0) {
          spell.maidens += 1;
        }
        final tmp = striker;
        striker = nonStriker;
        nonStriker = tmp;
        legalInOver = 0;
        thisOver = [];
        needsNewBowler = true;
        bowlerRunsThisOver = 0;
      }

      final allOut = wickets >= maxWickets;
      final oversDone = legalBalls >= maxOvers * 6;
      final chaseDone =
          chaseTarget != null && runs >= chaseTarget;
      if (allOut || oversDone || chaseDone) {
        completed = true;
        needsNewBowler = false;
      }
    }

    return Innings(
      number: number,
      battingTeam: battingTeam,
      bowlingTeam: bowlingTeam,
      openingStriker: openingStriker,
      openingNonStriker: openingNonStriker,
      openingBowler: openingBowler,
      events: events,
      runs: runs,
      wickets: wickets,
      legalBalls: legalBalls,
      wides: wides,
      noBalls: noBalls,
      byes: byes,
      legByes: legByes,
      batters: batterOrder
          .map((name) => batters[name]!.toInnings())
          .toList(),
      bowlers:
          bowlerOrder.map((name) => bowlers[name]!.toSpell()).toList(),
      striker: striker,
      nonStriker: nonStriker,
      currentBowler: bowler,
      needsNewBowler: needsNewBowler,
      completed: completed,
      thisOver: thisOver,
      fallOfWickets: fow,
      partnershipRuns: partnershipRuns,
      partnershipBalls: partnershipBalls,
    );
  }

  static bool _bowlerCredit(String wicket) {
    return wicket == 'bowled' ||
        wicket == 'lbw' ||
        wicket == 'caught' ||
        wicket == 'stumped' ||
        wicket == 'hitWicket';
  }

  static String _dismissal(String wicket, String bowler, String? fielder) {
    switch (wicket) {
      case 'bowled':
        return 'b $bowler';
      case 'lbw':
        return 'lbw b $bowler';
      case 'caught':
        return fielder == null || fielder.isEmpty
            ? 'c & b $bowler'
            : 'c $fielder b $bowler';
      case 'stumped':
        return fielder == null || fielder.isEmpty
            ? 'st b $bowler'
            : 'st $fielder b $bowler';
      case 'runOut':
        return fielder == null || fielder.isEmpty
            ? 'run out'
            : 'run out ($fielder)';
      case 'hitWicket':
        return 'hit wicket b $bowler';
      default:
        return wicket;
    }
  }

  static String _commentary(Innings innings, BallEvent event) {
    final overBall = (innings.legalBalls % 6) + 1;
    final over = innings.legalBalls ~/ 6;
    final prefix = '$over.$overBall ${event.bowler} to ${event.batsman}';
    if (event.wicket != null) {
      return '$prefix, WICKET (${event.wicket})';
    }
    switch (event.kind) {
      case 'wide':
        return event.runs > 0
            ? '$prefix, wide + ${event.runs}'
            : '$prefix, wide';
      case 'noBall':
        return event.runs > 0
            ? '$prefix, no ball + ${event.runs}'
            : '$prefix, no ball';
      case 'bye':
        return '$prefix, ${event.runs} bye${event.runs == 1 ? '' : 's'}';
      case 'legBye':
        return '$prefix, ${event.runs} leg bye${event.runs == 1 ? '' : 's'}';
      default:
        if (event.runs == 0) return '$prefix, no run';
        if (event.runs == 4) return '$prefix, FOUR';
        if (event.runs == 6) return '$prefix, SIX';
        return '$prefix, ${event.runs} run${event.runs == 1 ? '' : 's'}';
    }
  }
}

class _Batter {
  _Batter(this.name);
  final String name;
  int runs = 0;
  int balls = 0;
  int fours = 0;
  int sixes = 0;
  bool out = false;
  String? dismissal;

  BatterInnings toInnings() => BatterInnings(
        name: name,
        runs: runs,
        balls: balls,
        fours: fours,
        sixes: sixes,
        out: out,
        dismissal: dismissal,
      );
}

class _Bowler {
  _Bowler(this.name);
  final String name;
  int balls = 0;
  int maidens = 0;
  int runs = 0;
  int wickets = 0;
  int wides = 0;
  int noBalls = 0;

  BowlerSpell toSpell() => BowlerSpell(
        name: name,
        balls: balls,
        maidens: maidens,
        runs: runs,
        wickets: wickets,
        wides: wides,
        noBalls: noBalls,
      );
}

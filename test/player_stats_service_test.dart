import 'package:cricket_predictor/services/player_stats_service.dart';
import 'package:cricket_predictor/services/tournament_stats_service.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('loads JCPL3 stats A-Z and finds a player by search', () async {
    final all = await PlayerStatsService.load();
    expect(all.length, 175);

    final mens = PlayerStatsService.inCategory(all, 'Mens', '');
    expect(mens.length, 104);
    for (var i = 1; i < mens.length; i++) {
      expect(
        mens[i - 1].name.toLowerCase().compareTo(mens[i].name.toLowerCase()) <= 0,
        isTrue,
        reason: '${mens[i - 1].name} should come before ${mens[i].name}',
      );
    }

    final ketan = PlayerStatsService.inCategory(all, 'Mens', 'ketan');
    expect(ketan, hasLength(1));
    expect(ketan.single.name, 'Ketan Parikh');
    expect(ketan.single.matches, 11);
    expect(ketan.single.bowling.wickets, 7);
  });

  test('tournament catalog has seasons and no girls in season 1-2', () async {
    final catalog = await TournamentStatsService.loadCatalog();
    expect(catalog.seasons.map((s) => s.label).toList(),
        ['Season 1', 'Season 2', 'Season 3']);
    expect(catalog.seasons[0].categories.map((c) => c.id).toList(),
        ['mens', 'womens', 'boys']);
    expect(catalog.seasons[1].categories.map((c) => c.id).toList(),
        ['mens', 'womens', 'boys']);
    expect(catalog.seasons[2].categories.map((c) => c.id).toList(),
        ['mens', 'womens', 'boys', 'girls']);
  });

  test('loads JCPL Men 2024 tournament scorecards', () async {
    final tournament =
        await TournamentStatsService.load('assets/config/jcpl_s1_mens.json');
    expect(tournament.name, 'JCPL Men');
    expect(tournament.matches, hasLength(9));
    expect(tournament.players.length, 60);
    expect(tournament.overall['Runs'], '710');

    for (var i = 1; i < tournament.players.length; i++) {
      expect(
        tournament.players[i - 1].name
                .toLowerCase()
                .compareTo(tournament.players[i].name.toLowerCase()) <=
            0,
        isTrue,
      );
    }

    final raptors = TournamentStatsService.search(tournament.players, 'raptors');
    expect(raptors, isNotEmpty);
    expect(raptors.every((p) => p.skill.toLowerCase().contains('raptors')), isTrue);
  });

  test('tournament MVP includes player of the match awards', () async {
    final tournament =
        await TournamentStatsService.load('assets/config/jcpl_s3_mens.json');
    expect(tournament.mvp, isNotEmpty);
    expect(tournament.mvp.first.mvpTotal, greaterThan(0));
    expect(tournament.mvp.first.playerOfTheMatch, greaterThan(0));
    expect(
      tournament.matches.any((m) => m.playerOfTheMatch.isPresent),
      isTrue,
    );
    final pomSum = tournament.mvp.fold<int>(
        0, (sum, row) => sum + row.playerOfTheMatch);
    expect(pomSum, tournament.matches.where((m) => m.playerOfTheMatch.isPresent).length);
  });
}

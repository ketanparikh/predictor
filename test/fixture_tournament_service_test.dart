import 'package:flutter_test/flutter_test.dart';
import 'package:cricket_predictor/services/fixture_tournament_service.dart';

void main() {
  group('FixtureTournamentService._parseDateValue', () {
    String parse(dynamic value) =>
        FixtureTournamentService.parseDateValueForTest(value);

    test('parses DateTime directly', () {
      final dt = DateTime(2026, 1, 10);
      expect(parse(dt), '2026-01-10');
    });

    test('parses Excel serial number', () {
      final serial = DateTime(2026, 1, 10)
          .difference(DateTime(1899, 12, 30))
          .inDays;
      expect(parse(serial), '2026-01-10');
    });

    test('parses ISO string', () {
      expect(parse('2026-01-10'), '2026-01-10');
    });

    test('parses numeric dash string', () {
      expect(parse('10-01-2026'), '2026-01-10');
    });

    test('parses month-name string', () {
      expect(parse('10-Jan-26'), '2026-01-10');
      expect(parse('10 Jan 2026'), '2026-01-10');
    });

    test('returns TBD for empty/unknown', () {
      expect(parse(null), 'TBD');
      expect(parse(''), 'TBD');
      expect(parse('not-a-date'), 'TBD');
    });
  });
}



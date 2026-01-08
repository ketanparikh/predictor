import 'package:flutter_test/flutter_test.dart';
import 'package:cricket_predictor/models/tournament.dart';
import 'package:intl/intl.dart';

void main() {
  group('Freeze Logic - Time Parsing and Comparison', () {
    // Helper to parse time string to DateTime (simulating GameProvider logic)
    DateTime parseMatchDateTime(DateTime date, String timeStr) {
      try {
        // Handle time range format like "07AM - 08AM" - extract start time
        String timeToParse = timeStr;
        if (timeStr.contains(' - ')) {
          final parts = timeStr.split(' - ');
          if (parts.isNotEmpty) {
            timeToParse = parts[0].trim();
          }
        }
        
        // Convert formats like "07AM" to "07:00 AM" for parsing
        final simpleTimeMatch = RegExp(r'^(\d{1,2})(AM|PM)$', caseSensitive: false).firstMatch(timeToParse);
        if (simpleTimeMatch != null) {
          final hour = int.tryParse(simpleTimeMatch.group(1) ?? '');
          final amPm = simpleTimeMatch.group(2)?.toUpperCase() ?? '';
          if (hour != null) {
            timeToParse = '${hour.toString().padLeft(2, '0')}:00 $amPm';
          }
        }

        // Try common time formats
        final timePatterns = [
          'hh:mm a', // 09:00 AM
          'h:mm a',  // 9:00 AM
          'HH:mm',   // 09:00
          'H:mm',    // 9:00
        ];

        for (final pattern in timePatterns) {
          try {
            final time = DateFormat(pattern).parse(timeToParse);
            return DateTime(
              date.year,
              date.month,
              date.day,
              time.hour,
              time.minute,
            );
          } catch (_) {
            continue;
          }
        }

        // If parsing fails, default to 9:00 AM
        return DateTime(date.year, date.month, date.day, 9, 0);
      } catch (_) {
        // Default to 9:00 AM if all parsing fails
        return DateTime(date.year, date.month, date.day, 9, 0);
      }
    }

    // Helper to find first match time
    DateTime? findFirstMatchTime(Tournament tournament) {
      DateTime? firstMatchDateTime;

      for (final match in tournament.matches) {
        try {
          final matchDate = DateTime.parse(match.date);
          
          DateTime matchDateTime;
          if (match.time != null && match.time!.isNotEmpty && match.time != 'TBD') {
            matchDateTime = parseMatchDateTime(matchDate, match.time!);
          } else {
            // If no time specified, assume 9:00 AM as default first match time
            matchDateTime = DateTime(matchDate.year, matchDate.month, matchDate.day, 9, 0);
          }

          if (firstMatchDateTime == null || matchDateTime.isBefore(firstMatchDateTime)) {
            firstMatchDateTime = matchDateTime;
          }
        } catch (e) {
          continue;
        }
      }

      return firstMatchDateTime;
    }

    // Helper to check if frozen
    bool isFrozen(Tournament tournament, DateTime currentTime) {
      final firstMatchTime = findFirstMatchTime(tournament);
      if (firstMatchTime == null) return false;
      return currentTime.isBefore(firstMatchTime);
    }

    Tournament createTournament({
      required String date,
      required List<Map<String, String?>> matches,
    }) {
      final matchInfos = matches.map((m) {
        return MatchInfo(
          id: m['id']!,
          name: m['name']!,
          date: date,
          questionFile: 'assets/config/prediction_bank.json',
          time: m['time'],
        );
      }).toList();

      return Tournament(
        id: date,
        name: DateFormat('MMM dd, yyyy').format(DateTime.parse(date)),
        matches: matchInfos,
      );
    }

    test('should freeze when current time is before first match', () {
      final tournament = createTournament(
        date: '2026-01-15',
        matches: [
          {'id': 'm1', 'name': 'Team A vs Team B', 'time': '10:00 AM'},
          {'id': 'm2', 'name': 'Team C vs Team D', 'time': '02:00 PM'},
        ],
      );

      final now = DateTime(2026, 1, 15, 8, 0); // Before first match
      expect(isFrozen(tournament, now), true);
    });

    test('should NOT freeze when current time is after first match', () {
      final tournament = createTournament(
        date: '2026-01-15',
        matches: [
          {'id': 'm1', 'name': 'Team A vs Team B', 'time': '10:00 AM'},
          {'id': 'm2', 'name': 'Team C vs Team D', 'time': '02:00 PM'},
        ],
      );

      final now = DateTime(2026, 1, 15, 11, 0); // After first match
      expect(isFrozen(tournament, now), false);
    });

    test('should NOT freeze when current time equals first match time', () {
      final tournament = createTournament(
        date: '2026-01-15',
        matches: [
          {'id': 'm1', 'name': 'Team A vs Team B', 'time': '10:00 AM'},
        ],
      );

      final now = DateTime(2026, 1, 15, 10, 0); // Exactly at match time
      expect(isFrozen(tournament, now), false);
    });

    test('should handle matches with no time (defaults to 9:00 AM)', () {
      final tournament = createTournament(
        date: '2026-01-15',
        matches: [
          {'id': 'm1', 'name': 'Team A vs Team B', 'time': null},
          {'id': 'm2', 'name': 'Team C vs Team D', 'time': '02:00 PM'},
        ],
      );

      final now = DateTime(2026, 1, 15, 8, 0); // Before 9:00 AM default
      expect(isFrozen(tournament, now), true);

      final now2 = DateTime(2026, 1, 15, 9, 30); // After 9:00 AM default
      expect(isFrozen(tournament, now2), false);
    });

    test('should handle TBD time (defaults to 9:00 AM)', () {
      final tournament = createTournament(
        date: '2026-01-15',
        matches: [
          {'id': 'm1', 'name': 'Team A vs Team B', 'time': 'TBD'},
          {'id': 'm2', 'name': 'Team C vs Team D', 'time': '02:00 PM'},
        ],
      );

      final now = DateTime(2026, 1, 15, 8, 0);
      expect(isFrozen(tournament, now), true);
    });

    test('should find earliest match time when multiple matches exist', () {
      final tournament = createTournament(
        date: '2026-01-15',
        matches: [
          {'id': 'm1', 'name': 'Team A vs Team B', 'time': '02:00 PM'},
          {'id': 'm2', 'name': 'Team C vs Team D', 'time': '09:00 AM'}, // Earliest
          {'id': 'm3', 'name': 'Team E vs Team F', 'time': '11:00 AM'},
        ],
      );

      final now = DateTime(2026, 1, 15, 8, 30); // Before earliest (9 AM)
      expect(isFrozen(tournament, now), true);

      final now2 = DateTime(2026, 1, 15, 9, 30); // After earliest
      expect(isFrozen(tournament, now2), false);
    });

    test('should parse different time formats correctly', () {
      final testCases = [
        {'time': '09:00 AM', 'expectedHour': 9, 'expectedMinute': 0},
        {'time': '9:00 AM', 'expectedHour': 9, 'expectedMinute': 0},
        {'time': '09:00', 'expectedHour': 9, 'expectedMinute': 0},
        {'time': '9:00', 'expectedHour': 9, 'expectedMinute': 0},
        {'time': '02:30 PM', 'expectedHour': 14, 'expectedMinute': 30},
        {'time': '2:30 PM', 'expectedHour': 14, 'expectedMinute': 30},
        {'time': '12:00 PM', 'expectedHour': 12, 'expectedMinute': 0},
        {'time': '12:00 AM', 'expectedHour': 0, 'expectedMinute': 0},
        // Time range formats
        {'time': '07AM - 08AM', 'expectedHour': 7, 'expectedMinute': 0},
        {'time': '09AM - 10AM', 'expectedHour': 9, 'expectedMinute': 0},
        {'time': '02PM - 03PM', 'expectedHour': 14, 'expectedMinute': 0},
        // Simple formats without colon
        {'time': '07AM', 'expectedHour': 7, 'expectedMinute': 0},
        {'time': '08AM', 'expectedHour': 8, 'expectedMinute': 0},
        {'time': '09AM', 'expectedHour': 9, 'expectedMinute': 0},
        {'time': '10AM', 'expectedHour': 10, 'expectedMinute': 0},
      ];

      final date = DateTime(2026, 1, 15);

      for (final testCase in testCases) {
        final parsed = parseMatchDateTime(date, testCase['time'] as String);
        expect(parsed.hour, testCase['expectedHour']);
        expect(parsed.minute, testCase['expectedMinute']);
      }
    });

    test('should handle PM times correctly', () {
      final tournament = createTournament(
        date: '2026-01-15',
        matches: [
          {'id': 'm1', 'name': 'Team A vs Team B', 'time': '01:00 PM'},
        ],
      );

      final now = DateTime(2026, 1, 15, 12, 0); // Before 1 PM
      expect(isFrozen(tournament, now), true);

      final now2 = DateTime(2026, 1, 15, 13, 30); // After 1 PM
      expect(isFrozen(tournament, now2), false);
    });

    test('should return false (not frozen) when tournament has no matches', () {
      final emptyTournament = Tournament(
        id: '2026-01-15',
        name: 'Jan 15, 2026',
        matches: [],
      );

      final now = DateTime(2026, 1, 15, 8, 0);
      expect(isFrozen(emptyTournament, now), false);
    });

    test('should handle matches on different dates correctly', () {
      final tournament = createTournament(
        date: '2026-01-15',
        matches: [
          {'id': 'm1', 'name': 'Team A vs Team B', 'time': '10:00 AM'},
        ],
      );

      // Same day, before match
      final now1 = DateTime(2026, 1, 15, 9, 0);
      expect(isFrozen(tournament, now1), true);

      // Same day, after match
      final now2 = DateTime(2026, 1, 15, 11, 0);
      expect(isFrozen(tournament, now2), false);

      // Different day (before tournament date)
      final now3 = DateTime(2026, 1, 14, 23, 0);
      expect(isFrozen(tournament, now3), true);

      // Different day (after tournament date)
      final now4 = DateTime(2026, 1, 16, 8, 0);
      expect(isFrozen(tournament, now4), false);
    });

    test('should handle invalid time formats gracefully', () {
      final tournament = createTournament(
        date: '2026-01-15',
        matches: [
          {'id': 'm1', 'name': 'Team A vs Team B', 'time': 'invalid-time'},
        ],
      );

      // Should default to 9:00 AM for invalid time
      final now = DateTime(2026, 1, 15, 8, 0);
      expect(isFrozen(tournament, now), true);

      final now2 = DateTime(2026, 1, 15, 9, 30);
      expect(isFrozen(tournament, now2), false);
    });

    test('should handle empty time string', () {
      final tournament = createTournament(
        date: '2026-01-15',
        matches: [
          {'id': 'm1', 'name': 'Team A vs Team B', 'time': ''},
        ],
      );

      // Should default to 9:00 AM
      final now = DateTime(2026, 1, 15, 8, 0);
      expect(isFrozen(tournament, now), true);
    });

    test('should handle multiple matches with mixed time formats', () {
      final tournament = createTournament(
        date: '2026-01-15',
        matches: [
          {'id': 'm1', 'name': 'Team A vs Team B', 'time': '09:30'}, // 24-hour format
          {'id': 'm2', 'name': 'Team C vs Team D', 'time': '08:00 AM'}, // Earliest
          {'id': 'm3', 'name': 'Team E vs Team F', 'time': null}, // Defaults to 9 AM
        ],
      );

      // Before earliest (8 AM)
      final now1 = DateTime(2026, 1, 15, 7, 0);
      expect(isFrozen(tournament, now1), true);

      // After earliest but before others
      final now2 = DateTime(2026, 1, 15, 8, 30);
      expect(isFrozen(tournament, now2), false);
    });

    test('should handle time range format like "07AM - 08AM"', () {
      final tournament = createTournament(
        date: '2026-01-15',
        matches: [
          {'id': 'm1', 'name': 'Team A vs Team B', 'time': '07AM - 08AM'}, // Earliest
          {'id': 'm2', 'name': 'Team C vs Team D', 'time': '09AM - 10AM'},
          {'id': 'm3', 'name': 'Team E vs Team F', 'time': '02PM - 03PM'},
        ],
      );

      // Before earliest (7 AM)
      final now1 = DateTime(2026, 1, 15, 6, 30);
      expect(isFrozen(tournament, now1), true);

      // At start of first match (7 AM)
      final now2 = DateTime(2026, 1, 15, 7, 0);
      expect(isFrozen(tournament, now2), false);

      // After first match starts
      final now3 = DateTime(2026, 1, 15, 7, 30);
      expect(isFrozen(tournament, now3), false);
    });
  });
}


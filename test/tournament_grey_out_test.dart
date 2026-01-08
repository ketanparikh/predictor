import 'package:flutter_test/flutter_test.dart';
import 'package:intl/intl.dart';
import 'package:cricket_predictor/models/tournament.dart';
import 'package:cricket_predictor/providers/game_provider.dart';

void main() {
  group('Tournament Grey Out - First Match Past Check', () {
    test('should return true when first match time has passed', () {
      final provider = GameProvider();
      
      // Create a tournament with a match that started 2 hours ago
      final pastTime = DateTime.now().subtract(const Duration(hours: 2));
      final pastDateStr = DateFormat('yyyy-MM-dd').format(pastTime);
      final pastTimeStr = DateFormat('hh:mm a').format(pastTime);
      
      final tournament = Tournament(
        id: pastDateStr,
        name: DateFormat('MMM dd, yyyy').format(pastTime),
        matches: [
          MatchInfo(
            id: 'match1',
            name: 'Team A vs Team B',
            date: pastDateStr,
            questionFile: 'assets/config/prediction_bank.json',
            time: pastTimeStr,
          ),
        ],
      );
      
      expect(provider.isTournamentFirstMatchPast(tournament), true);
    });

    test('should return false when first match time is in the future', () {
      final provider = GameProvider();
      
      // Create a tournament with a match that starts in 2 hours
      final futureTime = DateTime.now().add(const Duration(hours: 2));
      final futureDateStr = DateFormat('yyyy-MM-dd').format(futureTime);
      final futureTimeStr = DateFormat('hh:mm a').format(futureTime);
      
      final tournament = Tournament(
        id: futureDateStr,
        name: DateFormat('MMM dd, yyyy').format(futureTime),
        matches: [
          MatchInfo(
            id: 'match1',
            name: 'Team A vs Team B',
            date: futureDateStr,
            questionFile: 'assets/config/prediction_bank.json',
            time: futureTimeStr,
          ),
        ],
      );
      
      expect(provider.isTournamentFirstMatchPast(tournament), false);
    });

    test('should handle time range format like "07AM - 08AM"', () {
      final provider = GameProvider();
      
      // Create a tournament with a match that started 1 hour ago using time range format
      final pastTime = DateTime.now().subtract(const Duration(hours: 1));
      final pastDateStr = DateFormat('yyyy-MM-dd').format(pastTime);
      
      final tournament = Tournament(
        id: pastDateStr,
        name: DateFormat('MMM dd, yyyy').format(pastTime),
        matches: [
          MatchInfo(
            id: 'match1',
            name: 'Team A vs Team B',
            date: pastDateStr,
            questionFile: 'assets/config/prediction_bank.json',
            time: '07AM - 08AM', // Should extract "07AM"
          ),
        ],
      );
      
      // If current time is after 7 AM today, it should be past
      final now = DateTime.now();
      final expectedResult = now.hour > 7 || (now.hour == 7 && now.minute >= 0);
      
      // Only check if the date matches today
      if (pastDateStr == DateFormat('yyyy-MM-dd').format(now)) {
        expect(provider.isTournamentFirstMatchPast(tournament), expectedResult);
      }
    });

    test('should find earliest match when multiple matches exist', () {
      final provider = GameProvider();
      
      final date = DateTime.now();
      final dateStr = DateFormat('yyyy-MM-dd').format(date);
      
      // Create tournament with multiple matches, earliest is in the past
      final pastTime = date.subtract(const Duration(hours: 1));
      final futureTime = date.add(const Duration(hours: 2));
      
      final tournament = Tournament(
        id: dateStr,
        name: DateFormat('MMM dd, yyyy').format(date),
        matches: [
          MatchInfo(
            id: 'match1',
            name: 'Team A vs Team B',
            date: dateStr,
            questionFile: 'assets/config/prediction_bank.json',
            time: DateFormat('hh:mm a').format(futureTime), // Later match
          ),
          MatchInfo(
            id: 'match2',
            name: 'Team C vs Team D',
            date: dateStr,
            questionFile: 'assets/config/prediction_bank.json',
            time: DateFormat('hh:mm a').format(pastTime), // Earlier match (should be used)
          ),
        ],
      );
      
      // Should return true because the earliest match (match2) is in the past
      expect(provider.isTournamentFirstMatchPast(tournament), true);
    });

    test('should return false when tournament has no matches', () {
      final provider = GameProvider();
      
      final tournament = Tournament(
        id: '2026-01-10',
        name: 'Jan 10, 2026',
        matches: [],
      );
      
      expect(provider.isTournamentFirstMatchPast(tournament), false);
    });

    test('should handle matches with no time (defaults to 9:00 AM)', () {
      final provider = GameProvider();
      
      // Create a tournament with a match that has no time (should default to 9 AM)
      final today = DateTime.now();
      final todayStr = DateFormat('yyyy-MM-dd').format(today);
      
      final tournament = Tournament(
        id: todayStr,
        name: DateFormat('MMM dd, yyyy').format(today),
        matches: [
          MatchInfo(
            id: 'match1',
            name: 'Team A vs Team B',
            date: todayStr,
            questionFile: 'assets/config/prediction_bank.json',
            time: null, // No time specified
          ),
        ],
      );
      
      // Should return true if current time is after 9 AM today
      final now = DateTime.now();
      final nineAM = DateTime(now.year, now.month, now.day, 9, 0);
      final expectedResult = now.compareTo(nineAM) >= 0;
      
      if (todayStr == DateFormat('yyyy-MM-dd').format(now)) {
        expect(provider.isTournamentFirstMatchPast(tournament), expectedResult);
      }
    });

    test('should handle TBD time (defaults to 9:00 AM)', () {
      final provider = GameProvider();
      
      final today = DateTime.now();
      final todayStr = DateFormat('yyyy-MM-dd').format(today);
      
      final tournament = Tournament(
        id: todayStr,
        name: DateFormat('MMM dd, yyyy').format(today),
        matches: [
          MatchInfo(
            id: 'match1',
            name: 'Team A vs Team B',
            date: todayStr,
            questionFile: 'assets/config/prediction_bank.json',
            time: 'TBD', // TBD time
          ),
        ],
      );
      
      final now = DateTime.now();
      final nineAM = DateTime(now.year, now.month, now.day, 9, 0);
      final expectedResult = now.compareTo(nineAM) >= 0;
      
      if (todayStr == DateFormat('yyyy-MM-dd').format(now)) {
        expect(provider.isTournamentFirstMatchPast(tournament), expectedResult);
      }
    });
  });
}


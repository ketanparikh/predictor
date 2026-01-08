import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../models/question.dart';
import '../models/tournament.dart';
import '../services/match_status_service.dart';
import '../services/fixture_tournament_service.dart';
import '../services/game_config_service.dart';

class GameProvider with ChangeNotifier {
  List<Question> _questions = [];
  Map<String, String> _userAnswers = {};
  int _currentQuestionIndex = 0;
  bool _gameStarted = false;
  bool _gameCompleted = false;

  // Tournament data/state
  List<Tournament> _tournaments = [];
  bool _tournamentsLoaded = false;
  Tournament? _selectedTournament;
  MatchInfo? _selectedMatch;
  final MatchStatusService _matchStatusService = MatchStatusService();
  Set<String> _completedMatchIds = {};
  bool _testUnblock = false;
  Set<String> _playableTournamentIds = {}; // controlled by admin

  List<Question> get questions => _questions;
  Map<String, String> get userAnswers => _userAnswers;
  int get currentQuestionIndex => _currentQuestionIndex;
  Question? get currentQuestion =>
      _questions.isNotEmpty && _currentQuestionIndex < _questions.length
          ? _questions[_currentQuestionIndex]
          : null;
  bool get gameStarted => _gameStarted;
  bool get gameCompleted => _gameCompleted;
  int get totalScore => _calculateScore();

  List<Tournament> get tournaments => _tournaments;
  bool get tournamentsLoaded => _tournamentsLoaded;
  Tournament? get selectedTournament => _selectedTournament;
  MatchInfo? get selectedMatch => _selectedMatch;
  Set<String> get completedMatchIds => _completedMatchIds;
  bool get testUnblock => _testUnblock;
  Set<String> get playableTournamentIds => _playableTournamentIds;

  Future<void> loadTournaments() async {
    try {
      // Prefer building tournaments dynamically from the Excel schedule
      final fixtureService = FixtureTournamentService();
      _tournaments = await fixtureService.loadTournamentsFromExcel();
      if (_tournaments.isEmpty) {
        throw Exception('No tournaments built from Excel');
      }
      _tournamentsLoaded = true;
      notifyListeners();
    } catch (e) {
      // ignore: avoid_print
      print('Error loading tournaments from Excel: $e');
      // Fallback to static JSON config if Excel loading fails
      try {
        final String response =
            await rootBundle.loadString('assets/config/tournaments.json');
        final data = json.decode(response);
        _tournaments = (data['tournaments'] as List)
            .map((t) => Tournament.fromJson(t))
            .toList();
        _tournamentsLoaded = true;
        notifyListeners();
      } catch (e2) {
        // ignore: avoid_print
        print('Error loading tournaments from JSON fallback: $e2');
      }
    }
  }

  /// Loads admin-configured playable tournament ids from Firestore.
  /// If none are configured, all days are treated as playable.
  Future<void> loadPlayableTournaments() async {
    try {
      final configService = GameConfigService();
      _playableTournamentIds =
          await configService.fetchPlayableTournamentIds();
      notifyListeners();
    } catch (e) {
      // ignore: avoid_print
      print('Error loading playable tournaments: $e');
    }
  }

  Future<void> loadQuestionsFromFile(String questionsFilePath) async {
    try {
      final String response = await rootBundle.loadString(questionsFilePath);
      final data = json.decode(response);
      _questions = (data['questions'] as List)
          .map((q) => Question.fromJson(q as Map<String, dynamic>))
          .toList();
      notifyListeners();
    } catch (e) {
      print('Error loading questions from $questionsFilePath: $e');
    }
  }

  /// Used by the admin panel to load exactly the same questions that players
  /// see for a given match (same random seed, same team-name replacements).
  Future<void> loadQuestionsForAdmin(MatchInfo match) async {
    // Derive team names similarly to selectMatch
    String? team1Name;
    String? team2Name;
    try {
      final parts = match.name.split(
        RegExp(r'\s+vs\s+|\s+VS\s+|\s+v\s+|\s+V\s+', caseSensitive: false),
      );
      if (parts.length >= 2) {
        team1Name = parts[0].trim();
        team2Name = parts[1].trim();
      }
    } catch (_) {}

    await _loadQuestionsForMatch(match,
        team1Name: team1Name, team2Name: team2Name);
  }

  void selectTournament(Tournament tournament) {
    _selectedTournament = tournament;
    _selectedMatch = null;
    _questions = [];
    _currentQuestionIndex = 0;
    _userAnswers = {};
    _gameStarted = false;
    _gameCompleted = false;
    notifyListeners();
  }

  void clearTournamentSelection() {
    _selectedTournament = null;
    _selectedMatch = null;
    _questions = [];
    _currentQuestionIndex = 0;
    _userAnswers = {};
    _gameStarted = false;
    _gameCompleted = false;
    notifyListeners();
  }

  Future<void> loadCompletedMatchesForUser(String userId) async {
    try {
      _completedMatchIds =
          await _matchStatusService.fetchCompletedMatches(userId);
      // If test override is enabled, keep UI unblocked regardless of backend state
      if (_testUnblock) {
        _completedMatchIds = {};
      }
      notifyListeners();
    } catch (e) {
      print('Error loading completed matches: $e');
    }
  }

  Future<void> markCurrentMatchCompletedForUser(String userId) async {
    final matchId = _selectedMatch?.id;
    print(
        'markCurrentMatchCompletedForUser called - userId: $userId, matchId: $matchId');
    if (matchId == null) {
      print('ERROR: matchId is null, cannot mark as completed');
      return;
    }
    try {
      await _matchStatusService.markCompleted(userId, matchId);
      print('Successfully marked match $matchId as completed for user $userId');
    } catch (e) {
      print('Error marking match completed: $e');
      // Even if backend update fails, mark as completed locally so the game
      // cannot be played again in this session.
    } finally {
      _completedMatchIds.add(matchId);
      notifyListeners();
    }
  }

  Future<void> selectMatch(MatchInfo match) async {
    _selectedMatch = match;
    _currentQuestionIndex = 0;
    _userAnswers = {};
    _gameStarted = false;
    _gameCompleted = false;
    notifyListeners();

    // Derive team names from match name for placeholder replacement in questions.
    String? team1Name;
    String? team2Name;
    try {
      final parts = match.name.split(
        RegExp(r'\s+vs\s+|\s+VS\s+|\s+v\s+|\s+V\s+', caseSensitive: false),
      );
      if (parts.length >= 2) {
        team1Name = parts[0].trim();
        team2Name = parts[1].trim();
      }
    } catch (_) {}

    await _loadQuestionsForMatch(match,
        team1Name: team1Name, team2Name: team2Name);
  }

  Future<void> _loadQuestionsForMatch(
    MatchInfo match, {
    String? team1Name,
    String? team2Name,
  }) async {
    try {
      final String response =
          await rootBundle.loadString(match.questionFile);
      final data = json.decode(response);
      var rawQuestions = (data['questions'] as List)
          .map((q) => Question.fromJson(q as Map<String, dynamic>))
          .toList();

      // Randomly pick up to 10 questions from the bank for this match
      rawQuestions.shuffle(Random(match.id.hashCode));
      rawQuestions = rawQuestions.take(10).toList();

      if (team1Name == null && team2Name == null) {
        _questions = rawQuestions;
      } else {
        _questions = rawQuestions
            .map((q) => _withTeamPlaceholdersReplaced(q, team1Name, team2Name))
            .toList();
      }
      notifyListeners();
    } catch (e) {
      print('Error loading questions for match from ${match.questionFile}: $e');
    }
  }

  Question _withTeamPlaceholdersReplaced(
      Question q, String? team1Name, String? team2Name) {
    String replaceTeams(String input) {
      var out = input;
      if (team1Name != null && team1Name.isNotEmpty) {
        out = out
            .replaceAll('Team 1', team1Name)
            .replaceAll('team 1', team1Name)
            .replaceAll('TEAM 1', team1Name.toUpperCase())
            .replaceAll('Team1', team1Name)
            .replaceAll('team1', team1Name);
      }
      if (team2Name != null && team2Name.isNotEmpty) {
        out = out
            .replaceAll('Team 2', team2Name)
            .replaceAll('team 2', team2Name)
            .replaceAll('TEAM 2', team2Name.toUpperCase())
            .replaceAll('Team2', team2Name)
            .replaceAll('team2', team2Name);
      }
      return out;
    }

    final newQuestion = replaceTeams(q.question);
    final newOptions = q.options.map(replaceTeams).toList();
    final newCorrect = replaceTeams(q.correctAnswer);

    return Question(
      id: q.id,
      question: newQuestion,
      options: newOptions,
      correctAnswer: newCorrect,
      points: q.points,
      category: q.category,
    );
  }

  void setTestUnblock(bool enabled) {
    _testUnblock = enabled;
    if (_testUnblock) {
      _completedMatchIds = {};
    }
    notifyListeners();
  }

  bool isMatchCompleted(String matchId) {
    if (_testUnblock) return false;
    return _completedMatchIds.contains(matchId);
  }

  void startGame() {
    _currentQuestionIndex = 0;
    _userAnswers = {};
    _gameStarted = true;
    _gameCompleted = false;
    notifyListeners();
  }

  void answerQuestion(String questionId, String answer) {
    _userAnswers[questionId] = answer;
    notifyListeners();
  }

  void nextQuestion() {
    if (_currentQuestionIndex < _questions.length - 1) {
      _currentQuestionIndex++;
    } else {
      _gameCompleted = true;
      _gameStarted = false;
    }
    notifyListeners();
  }

  void resetGame() {
    _currentQuestionIndex = 0;
    _userAnswers = {};
    _gameStarted = false;
    _gameCompleted = false;
    notifyListeners();
  }

  int _calculateScore() {
    int score = 0;
    for (var question in _questions) {
      final userAnswer = _userAnswers[question.id];
      if (userAnswer == null) continue;

      if (userAnswer == question.correctAnswer) {
        // Correct prediction: +10
        score += 10;
      } else {
        // Incorrect prediction: 0 (no negative scoring)
      }
    }
    return score;
  }

  bool isAnswerSelected(String questionId) {
    return _userAnswers.containsKey(questionId);
  }

  void clearCompletedMatches() {
    _completedMatchIds = {};
    notifyListeners();
  }

  /// Returns tournaments filtered by admin-configured playable ids.
  /// For admins or when no config exists, returns all tournaments.
  List<Tournament> getPlayableTournaments({required bool includeAll}) {
    if (includeAll || _playableTournamentIds.isEmpty) {
      return _tournaments;
    }
    return _tournaments
        .where((t) => _playableTournamentIds.contains(t.id))
        .toList();
  }

  /// Checks if the game should be frozen (before first match of the day).
  /// Returns true if current time is before the first match start time for the selected tournament.
  bool isGameFrozen() {
    if (_selectedTournament == null || _selectedTournament!.matches.isEmpty) {
      return false; // Can't freeze if no tournament/match selected
    }

    final now = DateTime.now();
    DateTime? firstMatchDateTime;

    // Find the earliest match time for this tournament/day
    for (final match in _selectedTournament!.matches) {
      try {
        // Parse match date
        final matchDate = DateTime.parse(match.date);
        
        // Parse match time if available
        DateTime matchDateTime;
        if (match.time != null && match.time!.isNotEmpty && match.time != 'TBD') {
          matchDateTime = _parseMatchDateTime(matchDate, match.time!);
        } else {
          // If no time specified, assume 9:00 AM as default first match time
          matchDateTime = DateTime(matchDate.year, matchDate.month, matchDate.day, 9, 0);
        }

        if (firstMatchDateTime == null || matchDateTime.isBefore(firstMatchDateTime)) {
          firstMatchDateTime = matchDateTime;
        }
      } catch (e) {
        // Skip matches with invalid dates/times
        continue;
      }
    }

    if (firstMatchDateTime == null) {
      return false; // Can't freeze if no valid match time found
    }

    // Game is frozen if current time is before the first match
    return now.isBefore(firstMatchDateTime);
  }

  /// Checks if a tournament's first match time has passed.
  /// Returns true if the first match of the day has already started.
  /// Uses the same logic as isGameFrozen() but for any tournament (not just selected one).
  bool isTournamentFirstMatchPast(Tournament tournament) {
    if (tournament.matches.isEmpty) {
      return false; // No matches, so can't be past
    }

    final now = DateTime.now();
    DateTime? firstMatchDateTime;

    // Find the earliest match time for this tournament/day
    // Use the same logic as isGameFrozen() for consistency
    for (final match in tournament.matches) {
      try {
        // Parse match date - same as isGameFrozen()
        final matchDate = DateTime.parse(match.date);
        
        // Parse match time if available
        DateTime matchDateTime;
        if (match.time != null && match.time!.isNotEmpty && match.time != 'TBD') {
          matchDateTime = _parseMatchDateTime(matchDate, match.time!);
        } else {
          // If no time specified, assume 9:00 AM as default first match time
          matchDateTime = DateTime(matchDate.year, matchDate.month, matchDate.day, 9, 0);
        }

        if (firstMatchDateTime == null || matchDateTime.isBefore(firstMatchDateTime)) {
          firstMatchDateTime = matchDateTime;
        }
      } catch (e) {
        // Skip matches with invalid dates/times
        print('[GameProvider] Error processing match ${match.id} (date: "${match.date}", time: "${match.time}"): $e');
        continue;
      }
    }

    if (firstMatchDateTime == null) {
      print('[GameProvider] No valid match time found for tournament ${tournament.id} (${tournament.name})');
      return false; // Can't determine if past if no valid match time found
    }

    // Tournament is past if current time is at or after the first match start time
    // Note: isGameFrozen() checks if now.isBefore() (frozen before start)
    // This checks if now >= firstMatchDateTime (past if at or after start)
    final isPast = now.compareTo(firstMatchDateTime) >= 0;
    
    // Always log for debugging
    print('[GameProvider] Tournament "${tournament.name}" (${tournament.id}):');
    print('  First match: $firstMatchDateTime');
    print('  Current time: $now');
    print('  Comparison: now.compareTo(firstMatch) = ${now.compareTo(firstMatchDateTime)}');
    print('  isPast: $isPast');
    
    return isPast;
  }

  /// Parses a time string (e.g., "09:00 AM", "14:30", "07AM - 08AM", "03:30PM – 04PM") and combines with date.
  DateTime _parseMatchDateTime(DateTime date, String timeStr) {
    try {
      // Handle time range format like "07AM - 08AM" or "03:30PM – 04PM" - extract start time
      // Support both regular hyphen "-" and en-dash "–"
      String timeToParse = timeStr;
      if (timeStr.contains(' - ') || timeStr.contains(' – ')) {
        final parts = timeStr.split(RegExp(r'\s*[-–]\s*'));
        if (parts.isNotEmpty) {
          timeToParse = parts[0].trim();
        }
      }
      
      // Handle formats like "03:30PM" or "3:30PM" (with colon and AM/PM)
      final colonTimeMatch = RegExp(r'^(\d{1,2}):(\d{2})(AM|PM)$', caseSensitive: false).firstMatch(timeToParse);
      if (colonTimeMatch != null) {
        final hour = int.tryParse(colonTimeMatch.group(1) ?? '');
        final minute = int.tryParse(colonTimeMatch.group(2) ?? '');
        final amPm = colonTimeMatch.group(3)?.toUpperCase() ?? '';
        if (hour != null && minute != null) {
          timeToParse = '${hour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')} $amPm';
        }
      } else {
        // Convert formats like "07AM" to "07:00 AM" for parsing
        final simpleTimeMatch = RegExp(r'^(\d{1,2})(AM|PM)$', caseSensitive: false).firstMatch(timeToParse);
        if (simpleTimeMatch != null) {
          final hour = int.tryParse(simpleTimeMatch.group(1) ?? '');
          final amPm = simpleTimeMatch.group(2)?.toUpperCase() ?? '';
          if (hour != null) {
            timeToParse = '${hour.toString().padLeft(2, '0')}:00 $amPm';
          }
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
}

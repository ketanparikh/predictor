import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/question.dart';
import '../models/tournament.dart';
import '../services/match_status_service.dart';

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

  List<Question> get questions => _questions;
  Map<String, String> get userAnswers => _userAnswers;
  int get currentQuestionIndex => _currentQuestionIndex;
  Question? get currentQuestion => _questions.isNotEmpty && _currentQuestionIndex < _questions.length
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

  Future<void> loadTournaments() async {
    try {
      final String response = await rootBundle.loadString('assets/config/tournaments.json');
      final data = json.decode(response);
      _tournaments = (data['tournaments'] as List)
          .map((t) => Tournament.fromJson(t))
          .toList();
      _tournamentsLoaded = true;
      notifyListeners();
    } catch (e) {
      print('Error loading tournaments: $e');
    }
  }

  Future<void> loadQuestionsFromFile(String questionsFilePath) async {
    try {
      final String response = await rootBundle.loadString(questionsFilePath);
      final data = json.decode(response);
      _questions = (data['questions'] as List)
          .map((q) => Question.fromJson(q))
          .toList();
      notifyListeners();
    } catch (e) {
      print('Error loading questions from $questionsFilePath: $e');
    }
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
      _completedMatchIds = await _matchStatusService.fetchCompletedMatches(userId);
      notifyListeners();
    } catch (e) {
      print('Error loading completed matches: $e');
    }
  }

  Future<void> markCurrentMatchCompletedForUser(String userId) async {
    final matchId = _selectedMatch?.id;
    if (matchId == null) return;
    try {
      await _matchStatusService.markCompleted(userId, matchId);
      _completedMatchIds.add(matchId);
      notifyListeners();
    } catch (e) {
      print('Error marking match completed: $e');
    }
  }

  Future<void> selectMatch(MatchInfo match) async {
    _selectedMatch = match;
    _currentQuestionIndex = 0;
    _userAnswers = {};
    _gameStarted = false;
    _gameCompleted = false;
    notifyListeners();
    await loadQuestionsFromFile(match.questionFile);
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
      if (userAnswer == question.correctAnswer) {
        score += question.points;
      }
    }
    return score;
  }

  bool isAnswerSelected(String questionId) {
    return _userAnswers.containsKey(questionId);
  }
}


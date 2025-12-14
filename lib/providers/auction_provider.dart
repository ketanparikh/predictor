import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:convert';
import '../services/auction_service.dart';
import '../models/team.dart';

class AuctionProvider with ChangeNotifier {
  final AuctionService _auctionService = AuctionService();
  List<Team> _teams = [];
  List<String> _mensParticipants = [];
  bool _loading = false;

  List<Team> get teams => _teams;
  List<String> get mensParticipants => _mensParticipants;
  bool get loading => _loading;

  AuctionProvider() {
    loadParticipants();
    loadTeams();
  }

  Future<void> loadParticipants() async {
    try {
      final String response =
          await rootBundle.loadString('assets/config/participants.json');
      final data = json.decode(response);
      _mensParticipants = List<String>.from(data['mens'] ?? []);
      // Sort participants alphabetically
      _mensParticipants.sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase()));
      notifyListeners();
    } catch (e) {
      print('Error loading participants: $e');
      _mensParticipants = [];
    }
  }

  Future<void> loadTeams() async {
    try {
      _loading = true;
      notifyListeners();
      _teams = await _auctionService.getTeams();
      _loading = false;
      notifyListeners();
    } catch (e) {
      print('Error loading teams: $e');
      _loading = false;
      notifyListeners();
    }
  }

  Stream<List<Team>> getTeamsStream() {
    return _auctionService.getTeamsStream();
  }

  Future<void> assignPlayerToTeam(String teamId, String playerName) async {
    try {
      await _auctionService.assignPlayerToTeam(teamId, playerName);
      await loadTeams(); // Refresh teams
    } catch (e) {
      print('Error assigning player: $e');
      rethrow;
    }
  }

  Future<void> removePlayerFromTeam(String teamId, String playerName) async {
    try {
      await _auctionService.removePlayerFromTeam(teamId, playerName);
      await loadTeams(); // Refresh teams
    } catch (e) {
      print('Error removing player: $e');
      rethrow;
    }
  }

  // Get available players (not assigned to any team)
  List<String> getAvailablePlayers() {
    final assignedPlayers = <String>{};
    for (final team in _teams) {
      assignedPlayers.addAll(team.players);
    }
    return _mensParticipants
        .where((player) => !assignedPlayers.contains(player))
        .toList();
  }

  // Get players assigned to a specific team
  List<String> getTeamPlayers(String teamId) {
    final team = _teams.firstWhere(
      (t) => t.id == teamId,
      orElse: () => Team(id: teamId, name: '', players: []),
    );
    return team.players;
  }
}


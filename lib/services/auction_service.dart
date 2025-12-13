import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/team.dart';

class AuctionService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final String _collection = 'auctions';
  final String _category = 'mens';

  // Get all teams
  Future<List<Team>> getTeams() async {
    try {
      final snapshot = await _firestore
          .collection(_collection)
          .doc(_category)
          .collection('teams')
          .get();

      if (snapshot.docs.isEmpty) {
        // Initialize 12 teams if they don't exist
        await _initializeTeams();
        return getTeams(); // Recursive call after initialization
      }

      final teams = snapshot.docs
          .map((doc) {
            final data = doc.data();
            return Team.fromMap({...data, 'id': doc.id});
          })
          .toList();
      
      // Sort by team number (team_1, team_2, etc.)
      teams.sort((a, b) {
        final aNum = int.tryParse(a.id.replaceAll('team_', '')) ?? 0;
        final bNum = int.tryParse(b.id.replaceAll('team_', '')) ?? 0;
        return aNum.compareTo(bNum);
      });

      return teams;
    } catch (e) {
      print('Error getting teams: $e');
      return [];
    }
  }

  // Stream teams for real-time updates
  Stream<List<Team>> getTeamsStream() {
    return _firestore
        .collection(_collection)
        .doc(_category)
        .collection('teams')
        .snapshots()
        .map((snapshot) {
      final teams = snapshot.docs
          .map((doc) {
            final data = doc.data();
            return Team.fromMap({...data, 'id': doc.id});
          })
          .toList();
      
      // Sort by team number (team_1, team_2, etc.)
      teams.sort((a, b) {
        final aNum = int.tryParse(a.id.replaceAll('team_', '')) ?? 0;
        final bNum = int.tryParse(b.id.replaceAll('team_', '')) ?? 0;
        return aNum.compareTo(bNum);
      });

      return teams;
    });
  }

  // Initialize 12 teams
  Future<void> _initializeTeams() async {
    try {
      final batch = _firestore.batch();
      for (int i = 1; i <= 12; i++) {
        final teamRef = _firestore
            .collection(_collection)
            .doc(_category)
            .collection('teams')
            .doc('team_$i');
        batch.set(teamRef, {
          'id': 'team_$i',
          'name': 'Team $i',
          'players': <String>[],
        });
      }
      await batch.commit();
      print('Initialized 12 teams for auctions');
    } catch (e) {
      print('Error initializing teams: $e');
    }
  }

  // Assign player to team
  Future<void> assignPlayerToTeam(String teamId, String playerName) async {
    try {
      final teamRef = _firestore
          .collection(_collection)
          .doc(_category)
          .collection('teams')
          .doc(teamId);

      // Get current team data
      final teamDoc = await teamRef.get();
      if (!teamDoc.exists) {
        throw Exception('Team not found');
      }

      final currentData = teamDoc.data()!;
      final currentPlayers = List<String>.from(currentData['players'] ?? []);

      // Check if player is already in another team
      await _removePlayerFromAllTeams(playerName);

      // Add player to this team
      if (!currentPlayers.contains(playerName)) {
        currentPlayers.add(playerName);
        await teamRef.update({'players': currentPlayers});
        print('Assigned $playerName to team $teamId');
      }
    } catch (e) {
      print('Error assigning player to team: $e');
      rethrow;
    }
  }

  // Remove player from all teams (before assigning to new team)
  Future<void> _removePlayerFromAllTeams(String playerName) async {
    try {
      final teamsSnapshot = await _firestore
          .collection(_collection)
          .doc(_category)
          .collection('teams')
          .get();

      final batch = _firestore.batch();
      for (final teamDoc in teamsSnapshot.docs) {
        final currentPlayers = List<String>.from(teamDoc.data()['players'] ?? []);
        if (currentPlayers.contains(playerName)) {
          currentPlayers.remove(playerName);
          batch.update(teamDoc.reference, {'players': currentPlayers});
        }
      }
      await batch.commit();
    } catch (e) {
      print('Error removing player from teams: $e');
    }
  }

  // Remove player from a specific team
  Future<void> removePlayerFromTeam(String teamId, String playerName) async {
    try {
      final teamRef = _firestore
          .collection(_collection)
          .doc(_category)
          .collection('teams')
          .doc(teamId);

      final teamDoc = await teamRef.get();
      if (!teamDoc.exists) {
        throw Exception('Team not found');
      }

      final currentData = teamDoc.data()!;
      final currentPlayers = List<String>.from(currentData['players'] ?? []);
      currentPlayers.remove(playerName);

      await teamRef.update({'players': currentPlayers});
      print('Removed $playerName from team $teamId');
    } catch (e) {
      print('Error removing player from team: $e');
      rethrow;
    }
  }
}


import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/leaderboard_service.dart';
import '../../models/leaderboard_entry.dart';
import '../../providers/game_provider.dart';

class LeaderboardScreen extends StatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> {
  String? _selectedTournamentId;

  @override
  Widget build(BuildContext context) {
    final leaderboardService = LeaderboardService();
    final gameProvider = Provider.of<GameProvider>(context);

    final tournaments = gameProvider.tournaments;
    final loaded = gameProvider.tournamentsLoaded;
    // Debug status panel
    print('LeaderboardScreen loaded=$loaded tournaments=${tournaments.length}');
    // Initialize selection to first tournament if not set
    if (loaded && tournaments.isNotEmpty && _selectedTournamentId == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          setState(() {
            _selectedTournamentId = tournaments.first.id;
          });
        }
      });
    }

    return !loaded
        ? const Center(child: CircularProgressIndicator())
        : tournaments.isEmpty
            ? const Center(child: Text('No tournaments configured'))
            : Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Tournament selection list
                    Text(
                      'Select Tournament',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 8),
                  SizedBox(
                    height: 110,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: tournaments.length,
                      itemBuilder: (context, index) {
                        final tournament = tournaments[index];
                        final isSelected = _selectedTournamentId == tournament.id;
                        return GestureDetector(
                          onTap: () {
                            setState(() {
                              _selectedTournamentId = tournament.id;
                            });
                          },
                          child: Container(
                            width: 160,
                            margin: const EdgeInsets.only(right: 12),
                            child: Card(
                              color: isSelected
                                  ? Theme.of(context).colorScheme.primaryContainer
                                  : null,
                              elevation: isSelected ? 4 : 1,
                              child: Padding(
                                padding: const EdgeInsets.all(12),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.emoji_events,
                                      color: isSelected
                                          ? Theme.of(context).colorScheme.onPrimaryContainer
                                          : Theme.of(context).colorScheme.primary,
                                      size: 28,
                                    ),
                                    const SizedBox(height: 6),
                                    Flexible(
                                      child: Text(
                                        tournament.name,
                                        textAlign: TextAlign.center,
                                        style: TextStyle(
                                          fontWeight: isSelected
                                              ? FontWeight.bold
                                              : FontWeight.normal,
                                          color: isSelected
                                              ? Theme.of(context).colorScheme.onPrimaryContainer
                                              : null,
                                          fontSize: 12,
                                        ),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 16),
                  // Leaderboard for selected tournament
                  if (_selectedTournamentId != null) ...[
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Text(
                        'Leaderboard',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                    ),
                    Expanded(
                      child: StreamBuilder<List<LeaderboardEntry>>(
                        stream: leaderboardService.getLeaderboardByTournament(_selectedTournamentId!),
                        builder: (context, snapshot) {
                          if (snapshot.connectionState == ConnectionState.waiting) {
                            return const Center(child: CircularProgressIndicator());
                          }
                          if (snapshot.hasError) {
                            return Center(child: Text('Error: ${snapshot.error}'));
                          }
                          final entries = snapshot.data ?? [];
                          return entries.isEmpty
                              ? Center(
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(Icons.leaderboard_outlined, size: 80, color: Colors.grey[400]),
                                      const SizedBox(height: 16),
                                      const Text('No scores yet for this tournament'),
                                      const SizedBox(height: 8),
                                      Text(
                                        'Be the first to play and set a record!',
                                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey[600]),
                                      ),
                                    ],
                                  ),
                                )
                              : ListView.builder(
                                  padding: const EdgeInsets.all(16),
                                  itemCount: entries.length,
                                  itemBuilder: (context, index) {
                                    final entry = entries[index];
                                    return _buildLeaderboardItem(context, entry, index);
                                  },
                                );
                        },
                      ),
                    ),
                  ],
                ],
                ),
              );
  }

  Widget _buildLeaderboardItem(
      BuildContext context, LeaderboardEntry entry, int index) {
    final theme = Theme.of(context);
    final isTopThree = index < 3;
    
    Color medalColor;
    IconData medalIcon;
    
    if (index == 0) {
      medalColor = Colors.amber;
      medalIcon = Icons.looks_one;
    } else if (index == 1) {
      medalColor = Colors.grey[400]!;
      medalIcon = Icons.looks_two;
    } else if (index == 2) {
      medalColor = Colors.brown;
      medalIcon = Icons.looks_3;
    } else {
      medalColor = theme.colorScheme.primary;
      medalIcon = Icons.person;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: isTopThree ? 4 : 1,
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: isTopThree ? medalColor.withOpacity(0.2) : theme.colorScheme.primary.withOpacity(0.1),
          child: Icon(
            medalIcon,
            color: isTopThree ? medalColor : theme.colorScheme.primary,
          ),
        ),
        title: Text(
          entry.userName,
          style: TextStyle(
            fontWeight: isTopThree ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        subtitle: Text(
          _formatDate(entry.timestamp),
          style: theme.textTheme.bodySmall,
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              '${entry.score} pts',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: theme.colorScheme.primary,
              ),
            ),
            Text(
              '#${index + 1}',
              style: theme.textTheme.bodySmall?.copyWith(
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year} ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
  }
}


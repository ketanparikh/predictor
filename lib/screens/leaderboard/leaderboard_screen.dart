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
    if (loaded && tournaments.isNotEmpty && _selectedTournamentId == null) {
      _selectedTournamentId = tournaments.first.id;
    }

    if (!loaded) {
      return const Center(child: CircularProgressIndicator());
    }

    if (tournaments.isEmpty) {
      return const Center(child: Text('No tournaments configured'));
    }

    return StreamBuilder<List<LeaderboardEntry>>(
      stream: leaderboardService.getLeaderboardByTournament(_selectedTournamentId ?? tournaments.first.id),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return Center(
            child: Text('Error: ${snapshot.error}'),
          );
        }

        final entries = snapshot.data ?? [];

        if (entries.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.leaderboard_outlined,
                  size: 100,
                  color: Colors.grey[400],
                ),
                const SizedBox(height: 16),
                Text(
                  'No scores yet',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                Text(
                  'Be the first to play and set a record!',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          );
        }

        return Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Tournament selector
              Row(
                children: [
                  const Icon(Icons.emoji_events),
                  const SizedBox(width: 8),
                  DropdownButton<String>(
                    value: _selectedTournamentId ?? tournaments.first.id,
                    items: [
                      for (final t in tournaments)
                        DropdownMenuItem(
                          value: t.id,
                          child: Text(t.name),
                        )
                    ],
                    onChanged: (value) {
                      setState(() {
                        _selectedTournamentId = value;
                      });
                    },
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Icon(
                        Icons.emoji_events,
                        color: Theme.of(context).colorScheme.primary,
                        size: 32,
                      ),
                      const SizedBox(width: 12),
                      Text(
                        'Top Players',
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: ListView.builder(
                  itemCount: entries.length,
                  itemBuilder: (context, index) {
                    final entry = entries[index];
                    return _buildLeaderboardItem(context, entry, index);
                  },
                ),
              ),
            ],
          ),
        );
      },
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


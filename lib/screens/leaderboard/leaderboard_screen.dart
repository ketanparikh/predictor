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
  bool _initialized = false;
  final LeaderboardService _leaderboardService = LeaderboardService();
  Stream<List<LeaderboardEntry>>? _leaderboardStream;

  void _updateStream() {
    if (_selectedTournamentId != null) {
      _leaderboardStream = _leaderboardService
          .getLeaderboardByTournament(_selectedTournamentId!);
    }
  }

  @override
  Widget build(BuildContext context) {
    final gameProvider = Provider.of<GameProvider>(context, listen: false);
    final theme = Theme.of(context);

    final tournaments = gameProvider.tournaments;
    final loaded = gameProvider.tournamentsLoaded;

    // Initialize selection to first tournament only once
    if (loaded && tournaments.isNotEmpty && !_initialized) {
      _initialized = true;
      _selectedTournamentId = tournaments.first.id;
      _updateStream();
    }

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Leaderboard',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        flexibleSpace: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [theme.colorScheme.primary, theme.colorScheme.secondary],
            ),
          ),
        ),
      ),
      body: !loaded
          ? const Center(child: CircularProgressIndicator())
          : tournaments.isEmpty
              ? const Center(child: Text('No tournaments configured'))
              : Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Tournament selection list
                      Row(
                        children: [
                          Icon(
                            Icons.emoji_events,
                            color: Theme.of(context).colorScheme.primary,
                            size: 24,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Select Tournament',
                            style: Theme.of(context)
                                .textTheme
                                .titleLarge
                                ?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      SizedBox(
                        height: 110,
                        child: ListView.builder(
                          scrollDirection: Axis.horizontal,
                          itemCount: tournaments.length,
                          itemBuilder: (context, index) {
                            final tournament = tournaments[index];
                            final isSelected =
                                _selectedTournamentId == tournament.id;
                            return GestureDetector(
                              onTap: () {
                                setState(() {
                                  _selectedTournamentId = tournament.id;
                                  _updateStream();
                                });
                              },
                              child: Container(
                                width: 160,
                                margin: const EdgeInsets.only(right: 12),
                                child: Card(
                                  color: isSelected
                                      ? Theme.of(context)
                                          .colorScheme
                                          .primaryContainer
                                      : null,
                                  elevation: isSelected ? 4 : 1,
                                  child: Padding(
                                    padding: const EdgeInsets.all(12),
                                    child: Column(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.all(8),
                                          decoration: BoxDecoration(
                                            gradient: isSelected
                                                ? LinearGradient(
                                                    colors: [
                                                      Theme.of(context)
                                                          .colorScheme
                                                          .primary,
                                                      Theme.of(context)
                                                          .colorScheme
                                                          .secondary,
                                                    ],
                                                  )
                                                : null,
                                            color: !isSelected
                                                ? Theme.of(context)
                                                    .colorScheme
                                                    .primary
                                                    .withOpacity(0.1)
                                                : null,
                                            shape: BoxShape.circle,
                                          ),
                                          child: Icon(
                                            Icons.emoji_events,
                                            color: isSelected
                                                ? Colors.white
                                                : Theme.of(context)
                                                    .colorScheme
                                                    .primary,
                                            size: 32,
                                          ),
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
                                                  ? Theme.of(context)
                                                      .colorScheme
                                                      .onPrimaryContainer
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
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: [
                                      Theme.of(context).colorScheme.primary,
                                      Theme.of(context).colorScheme.secondary,
                                    ],
                                  ),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Icon(
                                  Icons.leaderboard,
                                  color: Colors.white,
                                  size: 24,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Text(
                                'Leaderboard',
                                style: Theme.of(context)
                                    .textTheme
                                    .titleLarge
                                    ?.copyWith(
                                      fontWeight: FontWeight.bold,
                                    ),
                              ),
                            ],
                          ),
                        ),
                        Expanded(
                          child: StreamBuilder<List<LeaderboardEntry>>(
                            stream: _leaderboardStream,
                            builder: (context, snapshot) {
                              if (snapshot.connectionState ==
                                  ConnectionState.waiting) {
                                return const Center(
                                    child: CircularProgressIndicator());
                              }
                              if (snapshot.hasError) {
                                return Center(
                                    child: Text('Error: ${snapshot.error}'));
                              }
                              final entries = snapshot.data ?? [];
                              return entries.isEmpty
                                  ? Center(
                                      child: Column(
                                        mainAxisAlignment:
                                            MainAxisAlignment.center,
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.all(24),
                                            decoration: BoxDecoration(
                                              color: Theme.of(context)
                                                  .colorScheme
                                                  .primary
                                                  .withOpacity(0.1),
                                              shape: BoxShape.circle,
                                            ),
                                            child: Icon(
                                              Icons.leaderboard_outlined,
                                              size: 64,
                                              color: Colors.grey[400],
                                            ),
                                          ),
                                          const SizedBox(height: 24),
                                          Text(
                                            'No scores yet for this tournament',
                                            style: Theme.of(context)
                                                .textTheme
                                                .titleMedium
                                                ?.copyWith(
                                                  color: Colors.grey[700],
                                                  fontWeight: FontWeight.w600,
                                                ),
                                          ),
                                          const SizedBox(height: 8),
                                          Row(
                                            mainAxisAlignment:
                                                MainAxisAlignment.center,
                                            children: [
                                              Icon(
                                                Icons.emoji_events,
                                                size: 20,
                                                color: Colors.grey[500],
                                              ),
                                              const SizedBox(width: 6),
                                              Text(
                                                'Be the first to play and set a record!',
                                                style: Theme.of(context)
                                                    .textTheme
                                                    .bodyMedium
                                                    ?.copyWith(
                                                      color: Colors.grey[600],
                                                    ),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    )
                                  : ListView.builder(
                                      padding: const EdgeInsets.all(16),
                                      itemCount: entries.length,
                                      itemBuilder: (context, index) {
                                        final entry = entries[index];
                                        return _buildLeaderboardItem(
                                            context, entry, index);
                                      },
                                    );
                            },
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
    );
  }

  Widget _buildLeaderboardItem(
      BuildContext context, LeaderboardEntry entry, int index) {
    final theme = Theme.of(context);
    final isTopThree = index < 3;

    Color medalColor;
    IconData medalIcon;
    String rankText;

    if (index == 0) {
      medalColor = const Color(0xFFFFD700); // Gold
      medalIcon = Icons.emoji_events;
      rankText = '🥇';
    } else if (index == 1) {
      medalColor = const Color(0xFFC0C0C0); // Silver
      medalIcon = Icons.emoji_events;
      rankText = '🥈';
    } else if (index == 2) {
      medalColor = const Color(0xFFCD7F32); // Bronze
      medalIcon = Icons.emoji_events;
      rankText = '🥉';
    } else {
      medalColor = theme.colorScheme.primary;
      medalIcon = Icons.person;
      rankText = '${index + 1}';
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: isTopThree ? 6 : 3,
      child: Container(
        decoration: isTopThree
            ? BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    medalColor.withOpacity(0.15),
                    medalColor.withOpacity(0.05),
                  ],
                ),
                border: Border.all(
                  color: medalColor.withOpacity(0.3),
                  width: 1.5,
                ),
              )
            : null,
        child: ListTile(
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          leading: Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              gradient: isTopThree
                  ? LinearGradient(
                      colors: [
                        medalColor.withOpacity(0.3),
                        medalColor.withOpacity(0.1),
                      ],
                    )
                  : null,
              color: !isTopThree
                  ? theme.colorScheme.primary.withOpacity(0.1)
                  : null,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: isTopThree
                  ? Text(
                      rankText,
                      style: const TextStyle(fontSize: 28),
                    )
                  : Icon(
                      medalIcon,
                      color: theme.colorScheme.primary,
                      size: 28,
                    ),
            ),
          ),
          title: Text(
            entry.userName,
            style: TextStyle(
              fontWeight: isTopThree ? FontWeight.bold : FontWeight.w600,
              fontSize: 16,
            ),
          ),
          subtitle: Row(
            children: [
              Icon(Icons.access_time, size: 14, color: Colors.grey[600]),
              const SizedBox(width: 4),
              Text(
                _formatDate(entry.timestamp),
                style: theme.textTheme.bodySmall?.copyWith(
                  color: Colors.grey[600],
                ),
              ),
            ],
          ),
          trailing: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  theme.colorScheme.primary,
                  theme.colorScheme.secondary,
                ],
              ),
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: theme.colorScheme.primary.withOpacity(0.3),
                  blurRadius: 8,
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.stars, size: 14, color: Colors.white),
                    const SizedBox(width: 4),
                    Text(
                      '${entry.score}',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
                Text(
                  'pts',
                  style: TextStyle(
                    fontSize: 9,
                    color: Colors.white.withOpacity(0.9),
                    height: 1.0,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year} ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
  }
}

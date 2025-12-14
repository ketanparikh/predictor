import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../providers/auction_provider.dart';
import '../../models/team.dart';

class TeamsTab extends StatefulWidget {
  const TeamsTab({super.key});

  @override
  State<TeamsTab> createState() => _TeamsTabState();
}

class _TeamsTabState extends State<TeamsTab> {
  String _selectedCategory = 'mens';
  List<Map<String, dynamic>> _teamsData = [];

  final Map<String, Map<String, dynamic>> _categories = {
    'mens': {
      'name': "Men's",
      'icon': Icons.sports_cricket,
      'color': const Color(0xFF1565C0),
    },
    'womens': {
      'name': "Women's",
      'icon': Icons.sports_cricket,
      'color': const Color(0xFFAD1457),
    },
    'boys': {
      'name': "Boys",
      'icon': Icons.sports_cricket,
      'color': const Color(0xFF2E7D32),
    },
    'girls': {
      'name': "Girls",
      'icon': Icons.sports_cricket,
      'color': const Color(0xFFE91E63),
    },
  };

  @override
  void initState() {
    super.initState();
    _loadTeamsData();
    // Load teams when tab is opened
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_selectedCategory == 'mens') {
        Provider.of<AuctionProvider>(context, listen: false).loadTeams();
      }
    });
  }

  Future<void> _loadTeamsData() async {
    try {
      final String response =
          await rootBundle.loadString('assets/config/teams.json');
      final data = json.decode(response);
      final teams = (data['teams'] as List? ?? [])
          .map((t) => t as Map<String, dynamic>)
          .toList();
      setState(() {
        _teamsData = teams;
      });
    } catch (e) {
      print('Error loading teams data: $e');
      setState(() {
        _teamsData = [];
      });
    }
  }

  Map<String, dynamic>? _getTeamData(String teamId) {
    try {
      return _teamsData.firstWhere(
        (t) => t['id'] == teamId,
        orElse: () => <String, dynamic>{},
      );
    } catch (e) {
      return null;
    }
  }

  Stream<List<Team>> _getTeamsStream(String category) {
    if (category == 'mens') {
      return Provider.of<AuctionProvider>(context, listen: false)
          .getTeamsStream();
    }
    // For other categories, return empty stream for now
    return Stream.value(<Team>[]);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            theme.colorScheme.primary.withOpacity(0.05),
            theme.colorScheme.secondary.withOpacity(0.05),
          ],
        ),
      ),
      child: Column(
        children: [
          // Category Selection
          Container(
            padding: const EdgeInsets.all(16.0),
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 10,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                children: _categories.entries.map((entry) {
                  final categoryId = entry.key;
                  final categoryData = entry.value;
                  final isSelected = _selectedCategory == categoryId;
                  return Expanded(
                    child: GestureDetector(
                      onTap: () {
                        setState(() {
                          _selectedCategory = categoryId;
                        });
                        if (categoryId == 'mens') {
                          Provider.of<AuctionProvider>(context, listen: false)
                              .loadTeams();
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 12,
                        ),
                        decoration: BoxDecoration(
                          gradient: isSelected
                              ? LinearGradient(
                                  colors: [
                                    categoryData['color'] as Color,
                                    (categoryData['color'] as Color)
                                        .withOpacity(0.7),
                                  ],
                                )
                              : null,
                          color: isSelected ? null : Colors.transparent,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              categoryData['icon'] as IconData,
                              size: 20,
                              color: isSelected
                                  ? Colors.white
                                  : Colors.grey.shade600,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              categoryData['name'] as String,
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: isSelected
                                    ? FontWeight.bold
                                    : FontWeight.w500,
                                color: isSelected
                                    ? Colors.white
                                    : Colors.grey.shade700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          // Teams List
          Expanded(
            child: _selectedCategory == 'mens'
                ? _buildMensTeamsList(context, theme)
                : _buildComingSoonView(context, theme),
          ),
        ],
      ),
    );
  }

  Widget _buildMensTeamsList(BuildContext context, ThemeData theme) {
    return StreamBuilder<List<Team>>(
      stream: _getTeamsStream(_selectedCategory),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return Center(
            child: Text('Error: ${snapshot.error}'),
          );
        }

        final teams = snapshot.data ?? [];
        if (teams.isEmpty) {
          return const Center(
            child: Text('No teams found. Initializing...'),
          );
        }

        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      theme.colorScheme.primary.withOpacity(0.1),
                      theme.colorScheme.secondary.withOpacity(0.1),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: theme.colorScheme.primary.withOpacity(0.2),
                    width: 1.5,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: theme.colorScheme.primary.withOpacity(0.1),
                      blurRadius: 20,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            theme.colorScheme.primary,
                            theme.colorScheme.secondary,
                          ],
                        ),
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: theme.colorScheme.primary.withOpacity(0.4),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.groups,
                        color: Colors.white,
                        size: 28,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "Men's Teams",
                            style: theme.textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: theme.colorScheme.primary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Team Rosters & Details',
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: Colors.grey.shade600,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '12 Teams',
                        style: TextStyle(
                          color: theme.colorScheme.primary,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              // Teams List
              Expanded(
                child: ListView.builder(
                  itemCount: 12,
                  itemBuilder: (context, index) {
                    final teamId = 'team_${index + 1}';
                    final team = teams.firstWhere(
                      (t) => t.id == teamId,
                      orElse: () => Team(
                        id: teamId,
                        name: 'Team ${index + 1}',
                        players: [],
                      ),
                    );
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _buildTeamCard(context, team, theme),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildTeamCard(BuildContext context, Team team, ThemeData theme) {
    // Generate a unique color for each team based on index - 12 distinct color pairs
    final teamIndex = int.tryParse(team.id.replaceAll('team_', '')) ?? 1;
    final colors = [
      [const Color(0xFF6366F1), const Color(0xFF8B5CF6)], // 1. Indigo-Purple
      [const Color(0xFFEC4899), const Color(0xFFF43F5E)], // 2. Pink-Red
      [const Color(0xFF10B981), const Color(0xFF059669)], // 3. Green
      [const Color(0xFF3B82F6), const Color(0xFF2563EB)], // 4. Blue
      [const Color(0xFFF59E0B), const Color(0xFFD97706)], // 5. Amber
      [const Color(0xFFEF4444), const Color(0xFFDC2626)], // 6. Red
      [const Color(0xFF8B5CF6), const Color(0xFF7C3AED)], // 7. Purple
      [const Color(0xFF06B6D4), const Color(0xFF0891B2)], // 8. Cyan
      [const Color(0xFF84CC16), const Color(0xFF65A30D)], // 9. Lime
      [const Color(0xFFF97316), const Color(0xFFEA580C)], // 10. Orange
      [const Color(0xFF9333EA), const Color(0xFF7E22CE)], // 11. Violet
      [const Color(0xFF14B8A6), const Color(0xFF0D9488)], // 12. Teal
    ];
    final teamColors = colors[(teamIndex - 1) % colors.length];
    // Get team data from teams.json
    final teamData = _getTeamData(team.id);
    final sponsorName = teamData?['sponsor'] as String?;
    final captain = teamData?['captain'] as String?;
    final viceCaptain = teamData?['viceCaptain'] as String?;

    return InkWell(
      onTap: () => _showTeamDetails(context, team, teamData, teamColors),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              teamColors[0].withOpacity(0.15),
              teamColors[1].withOpacity(0.1),
            ],
          ),
          boxShadow: [
            BoxShadow(
              color: teamColors[0].withOpacity(0.2),
              blurRadius: 12,
              offset: const Offset(0, 4),
              spreadRadius: 0,
            ),
          ],
        ),
        child: Card(
          elevation: 0,
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: BorderSide(
              color: teamColors[0].withOpacity(0.2),
              width: 1.5,
            ),
          ),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              color: Colors.white.withOpacity(0.7),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  // Left side: Team Icon
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: teamColors,
                      ),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: teamColors[0].withOpacity(0.4),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.shield,
                      color: Colors.white,
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: 16),
                  // Middle: Team Info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          team.name,
                          style: theme.textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: teamColors[0],
                            fontSize: 18,
                          ),
                        ),
                        const SizedBox(height: 6),
                        if (sponsorName != null) ...[
                          Text(
                            sponsorName,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Colors.grey.shade700,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                        ],
                        if (captain != null) ...[
                          Row(
                            children: [
                              Icon(
                                Icons.military_tech,
                                size: 14,
                                color: teamColors[0],
                              ),
                              const SizedBox(width: 4),
                              Flexible(
                                child: Text(
                                  'C: $captain',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.grey.shade700,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                        ],
                        if (viceCaptain != null) ...[
                          Row(
                            children: [
                              Icon(
                                Icons.star_outline,
                                size: 14,
                                color: teamColors[1],
                              ),
                              const SizedBox(width: 4),
                              Flexible(
                                child: Text(
                                  'VC: $viceCaptain',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.grey.shade700,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                        ],
                        Row(
                          children: [
                            Icon(
                              Icons.people,
                              size: 16,
                              color: teamColors[0],
                            ),
                            const SizedBox(width: 6),
                            Text(
                              '${team.players.length} Player${team.players.length != 1 ? 's' : ''}',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: Colors.grey.shade700,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  // Right side: Arrow and Player Count Badge
                  Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(colors: teamColors),
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: teamColors[0].withOpacity(0.3),
                              blurRadius: 4,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.people,
                              color: Colors.white,
                              size: 14,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              '${team.players.length}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 8),
                      Icon(
                        Icons.arrow_forward_ios,
                        size: 16,
                        color: Colors.grey.shade600,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _showTeamDetails(BuildContext context, Team team,
      Map<String, dynamic>? teamData, List<Color> teamColors) {
    final theme = Theme.of(context);
    final teamPlayers = team.players;
    final sponsorName = teamData?['sponsor'] as String?;
    final captain = teamData?['captain'] as String?;
    final viceCaptain = teamData?['viceCaptain'] as String?;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.75,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.2),
              blurRadius: 20,
              offset: const Offset(0, -5),
            ),
          ],
        ),
        child: Column(
          children: [
            // Handle bar
            Container(
              margin: const EdgeInsets.only(top: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            // Header
            Padding(
              padding: const EdgeInsets.all(20.0),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: teamColors,
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.shield,
                      color: Colors.white,
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          team.name,
                          style: theme.textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        if (sponsorName != null) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.amber.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: Colors.amber.shade300),
                            ),
                            child: Text(
                              'Team Sponsor: $sponsorName',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: Colors.amber.shade900,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                        if (captain != null) ...[
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: theme.colorScheme.primary.withOpacity(0.08),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.military_tech,
                                    size: 14,
                                    color: theme.colorScheme.primary),
                                const SizedBox(width: 6),
                                Text(
                                  'Captain: $captain',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: theme.colorScheme.primary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                        if (viceCaptain != null) ...[
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color:
                                  theme.colorScheme.secondary.withOpacity(0.08),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.star_outline,
                                    size: 14,
                                    color: theme.colorScheme.secondary),
                                const SizedBox(width: 6),
                                Text(
                                  'Vice Captain: $viceCaptain',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: theme.colorScheme.secondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: theme.colorScheme.primary.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            '${teamPlayers.length} Player${teamPlayers.length != 1 ? 's' : ''}',
                            style: TextStyle(
                              color: theme.colorScheme.primary,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            // Players List
            Expanded(
              child: teamPlayers.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.people_outline,
                            size: 64,
                            color: Colors.grey.shade400,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'No players assigned yet',
                            style: TextStyle(
                              color: Colors.grey.shade600,
                              fontSize: 16,
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: teamPlayers.length,
                      itemBuilder: (context, index) {
                        final player = teamPlayers[index];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          elevation: 1,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: ListTile(
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 8,
                            ),
                            leading: CircleAvatar(
                              radius: 20,
                              backgroundColor: teamColors[0],
                              child: Text(
                                '${index + 1}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            title: Text(
                              player,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildComingSoonView(BuildContext context, ThemeData theme) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  _categories[_selectedCategory]!['color']
                      .withOpacity(0.15) as Color,
                  (_categories[_selectedCategory]!['color'] as Color)
                      .withOpacity(0.1),
                ],
              ),
              shape: BoxShape.circle,
              border: Border.all(
                color: (_categories[_selectedCategory]!['color'] as Color)
                    .withOpacity(0.3),
                width: 2,
              ),
            ),
            child: Icon(
              _categories[_selectedCategory]!['icon'] as IconData,
              size: 80,
              color: (_categories[_selectedCategory]!['color'] as Color)
                  .withOpacity(0.6),
            ),
          ),
          const SizedBox(height: 32),
          ShaderMask(
            shaderCallback: (bounds) => LinearGradient(
              colors: [
                _categories[_selectedCategory]!['color'] as Color,
                (_categories[_selectedCategory]!['color'] as Color)
                    .withOpacity(0.7),
              ],
            ).createShader(bounds),
            child: Text(
              'Coming Soon!',
              style: const TextStyle(
                fontSize: 36,
                fontWeight: FontWeight.bold,
                color: Colors.white,
                letterSpacing: 1,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 48),
            child: Text(
              '${_categories[_selectedCategory]!['name']} team profiles and player stats\nwill be available here soon.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey.shade600,
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

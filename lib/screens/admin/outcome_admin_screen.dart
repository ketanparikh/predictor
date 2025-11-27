import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/game_provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class OutcomeAdminScreen extends StatefulWidget {
  const OutcomeAdminScreen({super.key});

  @override
  State<OutcomeAdminScreen> createState() => _OutcomeAdminScreenState();
}

class _OutcomeAdminScreenState extends State<OutcomeAdminScreen> {
  String? _selectedTournamentId;
  String? _selectedMatchId;
  final Map<String, String> _correctAnswers = {};
  final Map<String, int> _points = {};
  bool _submitting = false;

  @override
  Widget build(BuildContext context) {
    final gameProvider = Provider.of<GameProvider>(context);
    final tournaments = gameProvider.tournaments;
    final loaded = gameProvider.tournamentsLoaded;
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        flexibleSpace: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                theme.colorScheme.primary,
                Colors.orange,
                theme.colorScheme.primary.withOpacity(0.8),
              ],
              stops: const [0.0, 0.5, 1.0],
            ),
          ),
        ),
        title: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.2),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: Colors.white.withOpacity(0.3),
              width: 1.5,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.25),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.admin_panel_settings,
                  size: 22,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 10),
              const Text(
                'Admin: Set Match Outcome',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                  color: Colors.white,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
        ),
        elevation: 0,
      ),
      body: !loaded
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Card(
                    elevation: 2,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          Icon(Icons.emoji_events, color: theme.colorScheme.primary),
                          const SizedBox(width: 12),
                          const Text('Tournament:', style: TextStyle(fontWeight: FontWeight.w600)),
                          const SizedBox(width: 12),
                          Expanded(
                            child: DropdownButton<String>(
                        value: _selectedTournamentId,
                        hint: const Text('Select tournament'),
                        items: [
                          for (final t in tournaments)
                            DropdownMenuItem(value: t.id, child: Text(t.name))
                        ],
                        onChanged: (value) async {
                          setState(() {
                            _selectedTournamentId = value;
                            _selectedMatchId = null;
                            _correctAnswers.clear();
                            _points.clear();
                          });
                              },
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Card(
                    elevation: 2,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          Icon(Icons.sports_cricket, color: theme.colorScheme.secondary),
                          const SizedBox(width: 12),
                          const Text('Match:', style: TextStyle(fontWeight: FontWeight.w600)),
                          const SizedBox(width: 12),
                          Expanded(
                            child: DropdownButton<String>(
                        value: _selectedMatchId,
                        hint: const Text('Select match'),
                        items: [
                          if (_selectedTournamentId != null)
                            for (final m in tournaments
                                .firstWhere((t) => t.id == _selectedTournamentId!)
                                .matches)
                              DropdownMenuItem(value: m.id, child: Text(m.name))
                        ],
                        onChanged: (value) async {
                          setState(() {
                            _selectedMatchId = value;
                            _correctAnswers.clear();
                            _points.clear();
                          });
                          // Load match questions so admin can select outcomes
                          final t = tournaments.firstWhere((t) => t.id == _selectedTournamentId);
                          final m = t.matches.firstWhere((m) => m.id == value);
                          await gameProvider.loadQuestionsFromFile(m.questionFile);
                          // Initialize points with default from questions
                          for (final q in gameProvider.questions) {
                            _points[q.id] = q.points;
                          }
                              },
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  if (_selectedTournamentId != null && _selectedMatchId != null)
                    Expanded(
                      child: ListView.builder(
                        itemCount: gameProvider.questions.length,
                        itemBuilder: (context, index) {
                          final q = gameProvider.questions[index];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 16),
                            elevation: 3,
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Icon(Icons.quiz, color: theme.colorScheme.primary),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          q.question,
                                          style: theme.textTheme.titleMedium?.copyWith(
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 8,
                                    children: [
                                      for (final opt in q.options)
                                        ChoiceChip(
                                          label: Text(opt),
                                          selected: _correctAnswers[q.id] == opt,
                                          onSelected: (sel) {
                                            setState(() {
                                              _correctAnswers[q.id] = opt;
                                            });
                                          },
                                          selectedColor: theme.colorScheme.primary,
                                          labelStyle: TextStyle(
                                            color: _correctAnswers[q.id] == opt
                                                ? Colors.white
                                                : null,
                                            fontWeight: _correctAnswers[q.id] == opt
                                                ? FontWeight.bold
                                                : FontWeight.normal,
                                          ),
                                        ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: theme.colorScheme.tertiary.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Row(
                                      children: [
                                        Icon(
                                          Icons.stars,
                                          color: theme.colorScheme.tertiary,
                                          size: 20,
                                        ),
                                        const SizedBox(width: 8),
                                        const Text('Points:', style: TextStyle(fontWeight: FontWeight.w600)),
                                        const SizedBox(width: 12),
                                        SizedBox(
                                          width: 100,
                                          child: TextFormField(
                                            initialValue: _points[q.id]?.toString() ?? q.points.toString(),
                                            keyboardType: TextInputType.number,
                                            decoration: InputDecoration(
                                              border: OutlineInputBorder(
                                                borderRadius: BorderRadius.circular(8),
                                              ),
                                              contentPadding: const EdgeInsets.symmetric(
                                                horizontal: 12,
                                                vertical: 8,
                                              ),
                                            ),
                                            onChanged: (v) {
                                              final p = int.tryParse(v) ?? q.points;
                                              _points[q.id] = p;
                                            },
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  const SizedBox(height: 8),
                  if (_selectedTournamentId != null && _selectedMatchId != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _submitting ? null : _submitOutcome,
                          icon: _submitting
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Icon(Icons.save, size: 24),
                          label: const Text(
                            'Save Match Outcome',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
    );
  }

  Future<void> _submitOutcome() async {
    if (_selectedTournamentId == null || _selectedMatchId == null) return;
    if (_correctAnswers.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select at least one correct answer.')),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      final matchRef = FirebaseFirestore.instance
          .collection('tournaments')
          .doc(_selectedTournamentId)
          .collection('matches')
          .doc(_selectedMatchId);

      await matchRef
          .collection('meta')
          .doc('outcome')
          .set({
        'correctAnswers': _correctAnswers,
        'points': _points,
        'lockedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Outcome saved. Scoring will be reconciled.')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to save outcome: $e')),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }
}



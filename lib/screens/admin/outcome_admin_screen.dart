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
        title: const Text('Admin: Set Match Outcome'),
      ),
      body: !loaded
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Text('Tournament:'),
                      const SizedBox(width: 8),
                      DropdownButton<String>(
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
                      const SizedBox(width: 24),
                      const Text('Match:'),
                      const SizedBox(width: 8),
                      DropdownButton<String>(
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
                    ],
                  ),
                  const SizedBox(height: 16),
                  if (_selectedTournamentId != null && _selectedMatchId != null)
                    Expanded(
                      child: ListView.builder(
                        itemCount: gameProvider.questions.length,
                        itemBuilder: (context, index) {
                          final q = gameProvider.questions[index];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(q.question, style: theme.textTheme.titleMedium),
                                  const SizedBox(height: 8),
                                  Wrap(
                                    spacing: 8,
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
                                        ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      const Text('Points:'),
                                      const SizedBox(width: 8),
                                      SizedBox(
                                        width: 80,
                                        child: TextFormField(
                                          initialValue: _points[q.id]?.toString() ?? q.points.toString(),
                                          keyboardType: TextInputType.number,
                                          onChanged: (v) {
                                            final p = int.tryParse(v) ?? q.points;
                                            _points[q.id] = p;
                                          },
                                        ),
                                      ),
                                    ],
                                  )
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  const SizedBox(height: 8),
                  if (_selectedTournamentId != null && _selectedMatchId != null)
                    Align(
                      alignment: Alignment.centerRight,
                      child: ElevatedButton.icon(
                        onPressed: _submitting ? null : _submitOutcome,
                        icon: _submitting
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.save),
                        label: const Text('Save Outcome'),
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



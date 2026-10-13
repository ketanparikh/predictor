import 'dart:convert';

import 'package:flutter/services.dart';

Future<Map<String, List<Map<String, dynamic>>>> loadBracketSeed() async {
  final raw = await rootBundle.loadString('assets/config/points_table.json');
  final data = json.decode(raw) as Map<String, dynamic>;
  final seed = <String, List<Map<String, dynamic>>>{};
  for (final item in (data['categories'] as List? ?? [])) {
    final cat = Map<String, dynamic>.from(item as Map);
    seed['${cat['id']}'] = ((cat['teams'] as List?) ?? [])
        .whereType<Map>()
        .map((team) => Map<String, dynamic>.from(team))
        .toList();
  }
  return seed;
}

import 'dart:convert';
import 'dart:io';

import 'package:excel/excel.dart';

void main() {
  final excel = Excel.decodeBytes(
      File('cricheroes_data/JCPL3_CricHeroes_Stats.xlsx').readAsBytesSync());
  final sheet = excel.tables['All Players']!;
  final header = sheet.rows.first.map(_text).toList();
  int col(String name) {
    final i = header.indexOf(name);
    if (i < 0) throw StateError('Missing column "$name"');
    return i;
  }

  final players = [
    for (final row in sheet.rows.skip(1))
      if (_text(row[col('Name')]).isNotEmpty)
        {
          'category': _text(row[col('Category')]),
          'name': _text(row[col('Name')]),
          'age': _text(row[col('Age')]),
          'gender': _text(row[col('Gender')]),
          'skill': _text(row[col('Primary Skill')]),
          'matchStatus': _text(row[col('Match Status')]),
          'playerId': _num(row[col('CricHeroes ID')]),
          'cricheroesName': _text(row[col('CricHeroes Name')]),
          'city': _text(row[col('City')]),
          'playingRole': _text(row[col('Playing Role')]),
          'battingHand': _text(row[col('Batting Hand')]),
          'bowlingStyle': _text(row[col('Bowling Style')]),
          'profileUrl': _text(row[col('Profile URL')]),
          'matches': _num(row[col('Matches')]),
          'batting': {
            'innings': _num(row[col('Bat Innings')]),
            'notOut': _num(row[col('Bat Not out')]),
            'runs': _num(row[col('Bat Runs')]),
            'highScore': _text(row[col('Bat Highest Runs')]),
            'avg': _num(row[col('Bat Avg')]),
            'sr': _num(row[col('Bat SR')]),
            'thirties': _num(row[col('Bat 30s')]),
            'fifties': _num(row[col('Bat 50s')]),
            'hundreds': _num(row[col('Bat 100s')]),
            'fours': _num(row[col('Bat 4s')]),
            'sixes': _num(row[col('Bat 6s')]),
            'ducks': _num(row[col('Bat Ducks')]),
            'won': _num(row[col('Bat Won')]),
            'loss': _num(row[col('Bat Loss')]),
          },
          'bowling': {
            'innings': _num(row[col('Bowl Innings')]),
            'overs': _text(row[col('Bowl Overs')]),
            'maidens': _num(row[col('Bowl Maidens')]),
            'wickets': _num(row[col('Bowl Wickets')]),
            'runs': _num(row[col('Bowl Runs')]),
            'best': _text(row[col('Bowl Best Bowling')]),
            'threeWickets': _num(row[col('Bowl 3 Wickets')]),
            'fiveWickets': _num(row[col('Bowl 5 Wickets')]),
            'economy': _num(row[col('Bowl Economy')]),
            'sr': _num(row[col('Bowl SR')]),
            'avg': _num(row[col('Bowl Avg')]),
            'wides': _num(row[col('Bowl Wides')]),
            'noBalls': _num(row[col('Bowl NoBalls')]),
            'dots': _num(row[col('Bowl Dot Balls')]),
            'fours': _num(row[col('Bowl 4s')]),
            'sixes': _num(row[col('Bowl 6s')]),
          },
          'fielding': {
            'catches': _num(row[col('Field Catches')]),
            'caughtBehind': _num(row[col('Field Caught behind')]),
            'runOuts': _num(row[col('Field Run outs')]),
            'stumpings': _num(row[col('Field Stumpings')]),
            'assistedRunOuts': _num(row[col('Field Assisted Run Outs')]),
          },
        },
  ];

  final out = File('assets/config/jcpl3_player_stats.json');
  out.writeAsStringSync(const JsonEncoder.withIndent('  ').convert({
    'source': 'JCPL 3 Registration Form (Responses) + CricHeroes career stats',
    'players': players,
  }));
  stdout.writeln('Wrote ${players.length} players to ${out.path}');
}

String _text(Data? cell) {
  final v = cell?.value;
  if (v == null) return '';
  return v.toString().trim();
}

Object? _num(Data? cell) {
  final v = cell?.value;
  if (v == null) return null;
  if (v is int) return v;
  if (v is num) return v;
  final s = v.toString().trim();
  if (s.isEmpty) return null;
  return int.tryParse(s) ?? double.tryParse(s);
}

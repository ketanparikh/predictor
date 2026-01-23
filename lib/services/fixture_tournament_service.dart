import 'dart:typed_data';

import 'package:excel/excel.dart' as excel;
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

import '../models/tournament.dart';

/// Builds predictor "tournaments" (day-wise lists of matches) from the Excel schedule.
///
/// Each distinct date in the schedule becomes a Tournament, and all matches on that
/// date (across Mens/Womens/Boys/Girls) are grouped under it.
class FixtureTournamentService {
  static const _excelPath = 'assets/JCPL 3 Schedule V3 (1).xlsx';
  static const bool _debug = true; // emit console logs for troubleshooting

  // Map category id -> question file to use for all matches in that category
  // Default prediction bank for most dates
  static const Map<String, String> _categoryQuestionFiles = {
    // All categories now use the shared prediction bank; questions are
    // randomized per match and team names are injected at runtime.
    'mens': 'assets/config/prediction_bank.json',
    'womens': 'assets/config/prediction_bank.json',
    'boys': 'assets/config/prediction_bank.json',
    'girls': 'assets/config/prediction_bank.json',
  };

  // Latest prediction bank for 17th and 18th Jan 2026
  static const Map<String, String> _categoryQuestionFilesLatest = {
    'mens': 'assets/config/prediction_bank_latest.json',
    'womens': 'assets/config/prediction_bank_latest.json',
    'boys': 'assets/config/prediction_bank_latest.json',
    'girls': 'assets/config/prediction_bank_latest.json',
  };

  Future<List<Tournament>> loadTournamentsFromExcel() async {
    // Group matches by date (yyyy-MM-dd)
    final Map<String, List<MatchInfo>> matchesByDate = {};

    try {
      final ByteData data = await rootBundle.load(_excelPath);
      final Uint8List bytes = data.buffer.asUint8List();
      final excel.Excel excelFile = excel.Excel.decodeBytes(bytes);

      for (final tableName in excelFile.tables.keys) {
        final sheet = excelFile.tables[tableName];
        if (sheet == null || sheet.maxRows < 2) continue;

        // Assume structured format: Date, Time, Category, Team 1, Team 2
        final headerRow = sheet.rows[0];
        final headerTexts = headerRow
            .map((cell) =>
                cell?.value != null ? cell!.value.toString().toLowerCase() : '')
            .toList();

        final dateCol = _indexOfHeader(headerTexts, 'date', fallback: 0);
        final timeCol = _indexOfHeader(headerTexts, 'time', fallback: 1);
        final categoryCol =
            _indexOfHeader(headerTexts, 'category', fallback: 2);
        final team1Col = _indexOfHeader(headerTexts, 'team 1',
            altKeys: const ['team1'], fallback: 3);
        final team2Col = _indexOfHeader(headerTexts, 'team 2',
            altKeys: const ['team2'], fallback: 4);

        if (_debug) {
          print(
              '[FixtureTournamentService] sheet="$tableName" cols => date:$dateCol time:$timeCol category:$categoryCol t1:$team1Col t2:$team2Col');
        }

        String? lastDateForSheet;

        for (var rowIndex = 1; rowIndex < sheet.maxRows; rowIndex++) {
          final row = sheet.rows[rowIndex];
          if (row.isEmpty) continue;

          // Capture date even if this row has no teams (merged date rows)
          String matchDateStr = _parseDateString(row, dateCol);
          if (matchDateStr != 'TBD') {
            lastDateForSheet = matchDateStr;
          } else if (lastDateForSheet != null) {
            // inherit previously seen date
            matchDateStr = lastDateForSheet!;
          }

          final rawTeam1 = _cellString(row, team1Col);
          final rawTeam2 = _cellString(row, team2Col);
          if (rawTeam1.isEmpty && rawTeam2.isEmpty) continue;

          // Determine category only for question-file mapping
          final matchCategoryId =
              _detectCategoryId(_cellString(row, categoryCol));

          final matchName = rawTeam1.isNotEmpty && rawTeam2.isNotEmpty
              ? '$rawTeam1 vs $rawTeam2'
              : (rawTeam1.isNotEmpty ? rawTeam1 : rawTeam2);

          // Use latest prediction bank for 17th and 18th Jan 2026
          final useLatestBank = matchDateStr == '2026-01-17' || matchDateStr == '2026-01-18';
          final questionFile = useLatestBank
              ? (_categoryQuestionFilesLatest[matchCategoryId] ?? _categoryQuestionFilesLatest['mens']!)
              : (_categoryQuestionFiles[matchCategoryId] ?? _categoryQuestionFiles['mens']!);

          final matchList = matchesByDate.putIfAbsent(matchDateStr, () => []);
          final sanitizedDate = matchDateStr.replaceAll('-', '_');
          final matchId = 'match_${sanitizedDate}_${matchList.length + 1}';

          // Parse time from Excel
          String? matchTime = _parseTimeString(row, timeCol);
          if (matchTime.isEmpty) matchTime = null;

          matchList.add(
            MatchInfo(
              id: matchId,
              name: matchName,
              date: matchDateStr,
              questionFile: questionFile,
              time: matchTime,
            ),
          );

          if (_debug) {
            print(
                '[FixtureTournamentService] row=$rowIndex date=$matchDateStr cat=$matchCategoryId match="$matchName"');
          }
        }
      }

      // Build tournaments list ordered by date
      final tournaments = <Tournament>[];
      final dateKeys = matchesByDate.keys.toList()..sort();
      if (_debug) {
        print('[FixtureTournamentService] date buckets: ${dateKeys.join(', ')}');
        for (final k in dateKeys) {
          print('  $k => ${matchesByDate[k]?.length ?? 0} matches');
        }
      }
      for (final dateKey in dateKeys) {
        final matches = matchesByDate[dateKey] ?? [];
        if (matches.isEmpty) continue;

        String displayName = dateKey;
        try {
          final dt = DateTime.parse(dateKey);
          displayName = DateFormat('MMM dd, yyyy').format(dt);
        } catch (_) {}

        tournaments.add(
          Tournament(
            id: dateKey,
            name: displayName,
            matches: matches,
          ),
        );
      }

      return tournaments;
    } catch (e) {
      // ignore: avoid_print
      print('Error building tournaments from Excel: $e');
      rethrow;
    }
  }

  static int _indexOfHeader(List<String> headers, String key,
      {List<String> altKeys = const [], int fallback = 0}) {
    final lowerKey = key.toLowerCase();
    for (var i = 0; i < headers.length; i++) {
      final h = headers[i];
      if (h.contains(lowerKey)) return i;
      for (final alt in altKeys) {
        if (alt.isNotEmpty && h.contains(alt.toLowerCase())) return i;
      }
    }
    return fallback;
  }

  static String _cellString(List<excel.Data?> row, int index) {
    if (index < 0 || index >= row.length) return '';
    final cell = row[index];
    if (cell == null || cell.value == null) return '';
    return cell.value.toString().trim();
  }

  static String _detectCategoryId(String rawCategory) {
    final v = rawCategory.toLowerCase();
    if (v.contains('boy')) return 'boys';
    if (v.contains('girl')) return 'girls';
    if (v.contains('women') || v.contains('womens')) return 'womens';
    if (v.contains('men') || v.contains('mens')) return 'mens';
    return 'mens';
  }

  static String _parseDateString(List<excel.Data?> row, int dateCol) {
    if (dateCol < 0 || dateCol >= row.length) return 'TBD';
    final cell = row[dateCol];
    if (cell == null || cell.value == null) return 'TBD';

    // Access raw cell value directly; excel package already exposes the runtime value
    final dynamic rawValue = cell.value;
    final parsed = _parseDateValue(rawValue);
    if (_debug && parsed == 'TBD') {
      print('[FixtureTournamentService] date parse TBD for raw="$rawValue"');
    }
    return parsed;
  }

  static String _parseTimeString(List<excel.Data?> row, int timeCol) {
    if (timeCol < 0 || timeCol >= row.length) return '';
    final cell = row[timeCol];
    if (cell == null || cell.value == null) return '';

    final dynamic rawValue = cell.value;
    final timeValue = _getCellValue(rawValue);

    if (timeValue == null) return '';

    // Handle Excel time format (decimal fraction of day)
    if (timeValue is double && timeValue < 1.0) {
      final hours = (timeValue * 24).floor();
      final minutes = ((timeValue * 24 - hours) * 60).floor();
      final amPm = hours >= 12 ? 'PM' : 'AM';
      final displayHour = hours > 12 ? hours - 12 : (hours == 0 ? 12 : hours);
      return '${displayHour.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')} $amPm';
    }

    // Get the time string
    String timeStr = timeValue.toString().trim();
    
    // Handle time range format like "07AM - 08AM" - extract start time
    if (timeStr.contains(' - ')) {
      final parts = timeStr.split(' - ');
      if (parts.isNotEmpty) {
        timeStr = parts[0].trim();
      }
    }
    
    // Convert formats like "07AM" to "07:00 AM" for consistency
    final rangeMatch = RegExp(r'^(\d{1,2})(AM|PM)$', caseSensitive: false).firstMatch(timeStr);
    if (rangeMatch != null) {
      final hour = int.tryParse(rangeMatch.group(1) ?? '');
      final amPm = rangeMatch.group(2)?.toUpperCase() ?? '';
      if (hour != null) {
        return '${hour.toString().padLeft(2, '0')}:00 $amPm';
      }
    }

    return timeStr;
  }

  static dynamic _getCellValue(dynamic cellValue) {
    if (cellValue == null) return null;
    try {
      final str = cellValue.toString();
      final doubleValue = double.tryParse(str);
      if (doubleValue != null) return doubleValue;
      final intValue = int.tryParse(str);
      if (intValue != null) return intValue;
      return str;
    } catch (_) {
      return null;
    }
  }

  /// Shared date parsing logic, exposed for testing.
  static String parseDateValueForTest(dynamic rawValue) =>
      _parseDateValue(rawValue);

  static String _parseDateValue(dynamic rawValue) {
    // Handle Excel DateTime directly if provided
    if (rawValue is DateTime) {
      try {
        return DateFormat('yyyy-MM-dd').format(rawValue);
      } catch (_) {
        // fall through to generic parsing
      }
    }

    final dateValue = _getCellValue(rawValue);

    try {
      if (dateValue is num && dateValue > 1) {
        // Excel serial date stored as number (days since 1899-12-30)
        final excelEpoch = DateTime(1899, 12, 30);
        final dt = excelEpoch.add(Duration(days: dateValue.toInt()));
        return DateFormat('yyyy-MM-dd').format(dt);
      }

      var s = dateValue?.toString().trim() ?? '';
      if (s.isEmpty) return 'TBD';

      s = _cleanDateString(s);
      if (_debug) {
        print('[FixtureTournamentService] cleaned date="$s"');
      }

      // Try ISO first (yyyy-MM-dd, full DateTime, etc.)
      try {
        final dt = DateTime.parse(s);
        return DateFormat('yyyy-MM-dd').format(dt);
      } catch (_) {}

      // Try common text date formats with month names, e.g. 10-Jan-26
      const patterns = [
        'dd-MMM-yy',
        'd-MMM-yy',
        'dd-MMM-yyyy',
        'd-MMM-yyyy',
        'dd MMM yy',
        'd MMM yy',
        'dd MMM yyyy',
        'd MMM yyyy',
        'dd MMMM yyyy',
        'd MMMM yyyy',
        // Numeric dash variants
        'dd-MM-yyyy',
        'd-MM-yyyy',
        'dd-M-yyyy',
        'd-M-yyyy',
        // Dot variants
        'dd.MM.yyyy',
        'd.MM.yyyy',
        // Slash US variant
        'MM/dd/yyyy',
      ];
      for (final pattern in patterns) {
        try {
          final dt = DateFormat(pattern).parseStrict(s);
          return DateFormat('yyyy-MM-dd').format(dt);
        } catch (_) {
          // try next pattern
        }
      }

      // Try day + month without year; assume current year (or 2026 as schedule season)
      final fallbackYear = DateTime.now().year >= 2026 ? 2026 : DateTime.now().year;
      final noYearMatch =
          RegExp(r'^(\d{1,2})\s+([A-Za-z]+)$').firstMatch(s);
      if (noYearMatch != null) {
        final day = noYearMatch.group(1)!;
        final mon = noYearMatch.group(2)!;
        final candidate = '$day $mon $fallbackYear';
        try {
          final dt = DateFormat('d MMMM yyyy').parseStrict(candidate);
          return DateFormat('yyyy-MM-dd').format(dt);
        } catch (_) {
          try {
            final dt = DateFormat('d MMM yyyy').parseStrict(candidate);
            return DateFormat('yyyy-MM-dd').format(dt);
          } catch (_) {}
        }
      }

      // Try dd/MM/yyyy or similar
      final parts = s.split(RegExp(r'[/-]'));
      if (parts.length == 3) {
        final d = int.tryParse(parts[0]);
        final m = int.tryParse(parts[1]);
        final y = int.tryParse(parts[2]);
        if (d != null && m != null && y != null) {
          final dt = DateTime(y, m, d);
          return DateFormat('yyyy-MM-dd').format(dt);
        }
      }
    } catch (_) {
      // fall-through to TBD
    }
    if (_debug) {
      print('[FixtureTournamentService] unable to parse date from "$rawValue"');
    }
    return 'TBD';
  }

  static String _cleanDateString(String s) {
    var cleaned = s.trim();
    cleaned = cleaned.replaceFirst(
        RegExp(
            r'^(mon(day)?|tue(sday)?|wed(nesday)?|thu(rsday)?|fri(day)?|sat(urday)?|sun(day)?)\s*[,.-]?\s+',
            caseSensitive: false),
        '');
    // Remove ordinal suffixes (10th -> 10) using mapped replacement to avoid "$1" artifacts
    cleaned = cleaned.replaceAllMapped(
      RegExp(r'\b(\d+)(st|nd|rd|th)\b', caseSensitive: false),
      (match) => match.group(1) ?? '',
    );
    cleaned = cleaned.replaceAll(',', ' ');
    cleaned = cleaned.replaceAll(RegExp(r'\s+'), ' ').trim();
    return cleaned;
  }
}



import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:convert';
import 'package:excel/excel.dart' as excel;
import 'package:intl/intl.dart';

class ScheduleTab extends StatefulWidget {
  final Function(int)? onNavigateToTab;
  
  const ScheduleTab({super.key, this.onNavigateToTab});

  @override
  State<ScheduleTab> createState() => _ScheduleTabState();
}

class _ScheduleTabState extends State<ScheduleTab>
    with SingleTickerProviderStateMixin {
  Map<String, dynamic>? _scheduleData;
  bool _isLoading = true;
  late TabController _tabController;
  late TabController _fixturesTabController;
  Map<String, List<Map<String, dynamic>>> _fixturesByCategory = {};
  Map<String, List<Map<String, dynamic>>> _pointsTableByCategory = {};

  // Groups data from the image
  final List<Map<String, dynamic>> _groupA = [
    {'name': 'Powerpoint', 'category': 'A'},
    {'name': 'Inergy Strickers', 'category': 'A'},
    {'name': 'Mango Yorkers', 'category': 'A'},
    {'name': 'Team Housewise', 'category': 'A'},
    {'name': 'Pictonions', 'category': 'A'},
    {'name': 'Jade 4 Lions', 'category': 'A'},
  ];

  final List<Map<String, dynamic>> _groupB = [
    {'name': 'Team Yogic Dhuranders', 'category': 'B'},
    {'name': 'MentoMap', 'category': 'B'},
    {'name': 'Fiery Sun Warriors', 'category': 'B'},
    {'name': 'SBCC Titans', 'category': 'B'},
    {'name': 'Dalnex Automators', 'category': 'B'},
    {'name': 'Team Triphobo', 'category': 'B'},
  ];

  @override
  void initState() {
    super.initState();
    _loadScheduleData();
    _tabController = TabController(length: 3, vsync: this);
    _fixturesTabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _fixturesTabController.dispose();
    super.dispose();
  }

  Future<void> _loadScheduleData() async {
    try {
      final String response =
          await rootBundle.loadString('assets/config/schedule.json');
      final data = json.decode(response);

      setState(() {
        _scheduleData = data;
      });

      // Load fixtures from Excel
      await _loadFixturesFromExcel();

      // Load points table from config file
      await _loadPointsTable();

      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _loadPointsTable() async {
    try {
      final String response =
          await rootBundle.loadString('assets/config/points_table.json');
      final data = json.decode(response);
      final categories = data['categories'] as List<dynamic>? ?? [];

      _pointsTableByCategory = {};
      for (final cat in categories) {
        final c = cat as Map<String, dynamic>;
        final id = c['id'] as String? ?? '';
        final teams = (c['teams'] as List<dynamic>? ?? [])
            .map((t) => t as Map<String, dynamic>)
            .toList();
        
        // Sort teams by points (descending), then by NRR (descending)
        // For Men's category, sort within each group separately
        if (id == 'mens') {
          final groupA = teams.where((t) => (t['group'] ?? '').toString().toUpperCase() == 'A').toList();
          final groupB = teams.where((t) => (t['group'] ?? '').toString().toUpperCase() == 'B').toList();
          
          // Sort Group A
          groupA.sort((a, b) {
            final pointsA = (a['points'] ?? ((a['won'] ?? 0) * 2)) as num;
            final pointsB = (b['points'] ?? ((b['won'] ?? 0) * 2)) as num;
            if (pointsA != pointsB) {
              return pointsB.compareTo(pointsA);
            }
            final nrrA = (a['nrr'] ?? 0.0) as num;
            final nrrB = (b['nrr'] ?? 0.0) as num;
            return nrrB.compareTo(nrrA);
          });
          
          // Sort Group B
          groupB.sort((a, b) {
            final pointsA = (a['points'] ?? ((a['won'] ?? 0) * 2)) as num;
            final pointsB = (b['points'] ?? ((b['won'] ?? 0) * 2)) as num;
            if (pointsA != pointsB) {
              return pointsB.compareTo(pointsA);
            }
            final nrrA = (a['nrr'] ?? 0.0) as num;
            final nrrB = (b['nrr'] ?? 0.0) as num;
            return nrrB.compareTo(nrrA);
          });
          
          // Combine groups (Group A first, then Group B)
          teams.clear();
          teams.addAll(groupA);
          teams.addAll(groupB);
        } else {
          // For other categories, sort all teams together
          teams.sort((a, b) {
            final pointsA = (a['points'] ?? ((a['won'] ?? 0) * 2)) as num;
            final pointsB = (b['points'] ?? ((b['won'] ?? 0) * 2)) as num;
            
            if (pointsA != pointsB) {
              return pointsB.compareTo(pointsA); // Descending order
            }
            
            // If points are equal, sort by NRR (descending)
            final nrrA = (a['nrr'] ?? 0.0) as num;
            final nrrB = (b['nrr'] ?? 0.0) as num;
            return nrrB.compareTo(nrrA); // Descending order
          });
        }
        
        if (id.isNotEmpty) {
          _pointsTableByCategory[id] = teams;
        }
      }
    } catch (e) {
      // ignore: avoid_print
      print('Error loading points_table.json: $e');
      _pointsTableByCategory = {};
    }
  }

  Future<void> _loadFixturesFromExcel() async {
    // Initialize categories
    _fixturesByCategory = {
      'mens': [],
      'womens': [],
      'boys': [],
      'girls': [],
    };

    try {
      final ByteData data = await rootBundle.load('assets/JCPL 3 Schedule V3 (1).xlsx');
      final bytes = data.buffer.asUint8List();
      final excelFile = excel.Excel.decodeBytes(bytes);

      // Parse all sheets - don't rely on sheet names for category
      // Category will be determined from team names during parsing
      for (var tableName in excelFile.tables.keys) {
        final sheet = excelFile.tables[tableName];
        if (sheet == null) continue;
        
        // Default category - will be overridden during parsing based on team names
        String defaultCategory = 'mens';
        final sheetName = tableName.toLowerCase();
        if (sheetName.contains('women') || sheetName.contains('womens')) {
          defaultCategory = 'womens';
        } else if (sheetName.contains('boy')) {
          defaultCategory = 'boys';
        } else if (sheetName.contains('girl')) {
          defaultCategory = 'girls';
        } else if (sheetName.contains('men') || sheetName.contains('mens')) {
          defaultCategory = 'mens';
        }

        // Analyze sheet structure - look at first few rows to understand format
        final sheetStructure = _analyzeSheetStructure(sheet);
        
        // Parse based on detected structure
        if (sheetStructure['isStructuredFormat'] == true) {
          // New format: Date, Time, Category, Team 1, Team 2
          _parseStructuredSheet(sheet, sheetStructure);
        } else {
          // Legacy format
        _parseSheetByStructure(sheet, defaultCategory, sheetStructure);
        }
      }
      
      // Debug: Print counts
      print('Fixtures loaded - Mens: ${_fixturesByCategory['mens']!.length}, '
            'Womens: ${_fixturesByCategory['womens']!.length}, '
            'Boys: ${_fixturesByCategory['boys']!.length}, '
            'Girls: ${_fixturesByCategory['girls']!.length}');
    } catch (e) {
      print('Error loading Excel: $e');
      // If Excel reading fails, use JSON data as fallback
      if (_scheduleData != null && _scheduleData!['matches'] != null) {
        final matches = _scheduleData!['matches'] as List;
        for (var match in matches) {
          final category = match['category'] as String? ?? 'mens';
          if (_fixturesByCategory.containsKey(category)) {
            _fixturesByCategory[category]!.add(match as Map<String, dynamic>);
          }
        }
      }
    }
  }

  dynamic _getCellValue(excel.CellValue? cellValue) {
    if (cellValue == null) return null;
    try {
      // Excel package CellValue uses pattern matching or direct access
      // Try toString first and parse if needed
      final str = cellValue.toString();
      
      // Try parsing as number (for dates/times stored as numbers)
      final doubleValue = double.tryParse(str);
      if (doubleValue != null) {
        return doubleValue;
      }
      
      final intValue = int.tryParse(str);
      if (intValue != null) {
        return intValue;
      }
      
      // Return as string
      return str;
    } catch (e) {
      return null;
    }
  }

  Map<String, dynamic> _analyzeSheetStructure(excel.Sheet sheet) {
    // Analyze first 10 rows to understand structure
    int headerRowIndex = -1;
    int dateColumnIndex = -1;
    int timeColumnIndex = -1;
    int categoryColumnIndex = -1;
    int team1ColumnIndex = -1;
    int team2ColumnIndex = -1;
    int teamColumnStartIndex = -1;
    bool hasDateHeader = false;
    bool dateInSeparateRow = false;
    bool isStructuredFormat = false; // New format: Date, Time, Category, Team 1, Team 2

    // Look for header row
    for (var i = 0; i < sheet.maxRows && i < 10; i++) {
      final row = sheet.rows[i];
      if (row.isEmpty) continue;

        // Check if this is a header row
        for (var j = 0; j < row.length && j < 10; j++) {
          if (row[j]?.value != null) {
            final cellValue = _getCellValue(row[j]!.value)?.toString().toLowerCase().trim() ?? '';
            if (cellValue.contains('date') || cellValue.contains('time') || 
                cellValue.contains('team') || cellValue.contains('match') ||
                cellValue.contains('fixture') || cellValue.contains('category')) {
              headerRowIndex = i;
              // Determine column positions
              if (cellValue.contains('date') && !cellValue.contains('update')) {
                dateColumnIndex = j;
              }
              if (cellValue.contains('time')) {
                timeColumnIndex = j;
              }
              if (cellValue.contains('category')) {
                categoryColumnIndex = j;
                isStructuredFormat = true;
              }
              if (cellValue.contains('team')) {
                if (cellValue.contains('team 1') || cellValue.contains('team1') || 
                    (cellValue == 'team1' || cellValue == 'team 1')) {
                  team1ColumnIndex = j;
                  isStructuredFormat = true;
                } else if (cellValue.contains('team 2') || cellValue.contains('team2') || 
                           (cellValue == 'team2' || cellValue == 'team 2')) {
                  team2ColumnIndex = j;
                  isStructuredFormat = true;
                } else if (teamColumnStartIndex == -1) {
                teamColumnStartIndex = j;
              }
              }
            }
          }
        }
      
      if (headerRowIndex != -1) break;
    }
    
    // Special check: If row 0 (first row) has headers, detect them
    if (sheet.maxRows > 0) {
      final firstRow = sheet.rows[0];
      
      // Check for "Date" in column A (index 0)
      if (firstRow.length > 0 && firstRow[0]?.value != null) {
        final cellValue = _getCellValue(firstRow[0]!.value)?.toString().toLowerCase().trim() ?? '';
        if (cellValue == 'date' || cellValue.contains('date')) {
          dateColumnIndex = 0; // Column A
          isStructuredFormat = true;
          if (headerRowIndex == -1) {
            headerRowIndex = 0;
          }
        }
      }
      
      // Check for "Team2" or "Team 2" in column E (index 4)
      if (firstRow.length > 4 && firstRow[4]?.value != null) {
        final cellValue = _getCellValue(firstRow[4]!.value)?.toString().toLowerCase().trim() ?? '';
        if (cellValue.contains('team 2') || cellValue.contains('team2') || 
            cellValue == 'team2' || cellValue == 'team 2') {
          team2ColumnIndex = 4; // Column E
          isStructuredFormat = true;
          if (headerRowIndex == -1) {
            headerRowIndex = 0;
          }
        }
      }
      
      // Check for "Team1" or "Team 1" in column D (index 3)
      if (firstRow.length > 3 && firstRow[3]?.value != null) {
        final cellValue = _getCellValue(firstRow[3]!.value)?.toString().toLowerCase().trim() ?? '';
        if (cellValue.contains('team 1') || cellValue.contains('team1') || 
            cellValue == 'team1' || cellValue == 'team 1') {
          team1ColumnIndex = 3; // Column D
          isStructuredFormat = true;
          if (headerRowIndex == -1) {
            headerRowIndex = 0;
          }
        }
      }
      
      // Check for "Time" in column B (index 1)
      if (firstRow.length > 1 && firstRow[1]?.value != null) {
        final cellValue = _getCellValue(firstRow[1]!.value)?.toString().toLowerCase().trim() ?? '';
        if (cellValue == 'time' || cellValue.contains('time')) {
          timeColumnIndex = 1; // Column B
          isStructuredFormat = true;
          if (headerRowIndex == -1) {
            headerRowIndex = 0;
          }
        }
      }
      
      // Check for "Category" in column C (index 2)
      if (firstRow.length > 2 && firstRow[2]?.value != null) {
        final cellValue = _getCellValue(firstRow[2]!.value)?.toString().toLowerCase().trim() ?? '';
        if (cellValue == 'category' || cellValue.contains('category')) {
          categoryColumnIndex = 2; // Column C
          isStructuredFormat = true;
          if (headerRowIndex == -1) {
            headerRowIndex = 0;
          }
        }
      }
    }

    // If no header found, try to detect structure from data
    if (headerRowIndex == -1) {
      // Check first few rows for patterns
      for (var i = 0; i < sheet.maxRows && i < 5; i++) {
        final row = sheet.rows[i];
        if (row.isEmpty) continue;

        // Check column B (index 1) for time
        if (row.length > 1 && row[1] != null) {
          final cellValue = row[1]!.value;
          if (cellValue != null) {
            final timeValue = _getCellValue(cellValue);
            if (timeValue != null) {
              if (timeValue is double && timeValue < 1.0) {
                timeColumnIndex = 1; // Excel time format
              } else {
                final timeStr = timeValue.toString().trim();
                if (_isTime(timeStr)) {
                  timeColumnIndex = 1;
                }
              }
            }
          }
        }

        // Check column A (index 0) for date
        if (row.length > 0 && row[0] != null) {
          final cellValue = row[0]!.value;
          if (cellValue != null) {
            final dateValue = _getCellValue(cellValue);
            if (dateValue != null) {
              if (dateValue is DateTime) {
                dateColumnIndex = 0;
              } else if (dateValue is double && dateValue > 1) {
                dateColumnIndex = 0;
              } else {
                final dateStr = dateValue.toString().trim();
                if (_isDate(dateStr)) {
                  dateColumnIndex = 0;
                  // Check if this row only has date (separate date row)
                  bool onlyDate = true;
                  for (var j = 1; j < row.length && j < 5; j++) {
                    if (row[j] != null && row[j]!.value != null) {
                      final valObj = _getCellValue(row[j]!.value);
                      if (valObj != null) {
                        final val = valObj.toString().trim();
                        if (val.isNotEmpty && !_isTime(val)) {
                          onlyDate = false;
                          break;
                        }
                      }
                    }
                  }
                  if (onlyDate) {
                    dateInSeparateRow = true;
                  }
                }
              }
            }
          }
        }
      }
    }

    // Default assumptions if not detected
    if (timeColumnIndex == -1) timeColumnIndex = 1; // Column B
    if (dateColumnIndex == -1) dateColumnIndex = 0; // Column A
    if (teamColumnStartIndex == -1) teamColumnStartIndex = 2; // Column C onwards
    
    // If structured format detected but Team2 not found, default to column E (index 4)
    if (isStructuredFormat && team2ColumnIndex == -1) {
      team2ColumnIndex = 4; // Column E
    }
    // If structured format detected but Team1 not found, default to column D (index 3)
    if (isStructuredFormat && team1ColumnIndex == -1) {
      team1ColumnIndex = 3; // Column D
    }

    return {
      'headerRowIndex': headerRowIndex,
      'dateColumnIndex': dateColumnIndex,
      'timeColumnIndex': timeColumnIndex,
      'categoryColumnIndex': categoryColumnIndex,
      'team1ColumnIndex': team1ColumnIndex,
      'team2ColumnIndex': team2ColumnIndex,
      'teamColumnStartIndex': teamColumnStartIndex,
      'dateInSeparateRow': dateInSeparateRow,
      'isStructuredFormat': isStructuredFormat,
    };
  }

  void _parseStructuredSheet(
    excel.Sheet sheet,
    Map<String, dynamic> structure,
  ) {
    // Parse structured format: Date, Time, Category, Team 1, Team 2
    final headerRowIndex = structure['headerRowIndex'] as int? ?? 0;
    final dateColumnIndex = structure['dateColumnIndex'] as int? ?? 0;
    final timeColumnIndex = structure['timeColumnIndex'] as int? ?? 1;
    final categoryColumnIndex = structure['categoryColumnIndex'] as int? ?? 2;
    final team1ColumnIndex = structure['team1ColumnIndex'] as int? ?? 3;
    final team2ColumnIndex = structure['team2ColumnIndex'] as int? ?? 4;

    // Start parsing from row after header
    for (var rowIndex = headerRowIndex + 1; rowIndex < sheet.maxRows; rowIndex++) {
      final row = sheet.rows[rowIndex];
      if (row.isEmpty) continue;

      // Extract date
      DateTime? matchDate;
      String dateStr = '';
      if (dateColumnIndex >= 0 && row.length > dateColumnIndex && row[dateColumnIndex]?.value != null) {
        final dateValue = _getCellValue(row[dateColumnIndex]!.value);
        if (dateValue != null) {
          // Skip if it's a header text like "Date"
          final dateValueStr = dateValue.toString().toLowerCase().trim();
          if (dateValueStr == 'date' || dateValueStr.isEmpty) {
            // Skip header or empty
          } else if (dateValue is DateTime) {
            matchDate = dateValue;
          } else if (dateValue is double) {
            // Excel dates are stored as days since 1900-01-01
            // Dates are typically > 1, times are < 1
            if (dateValue > 1 && dateValue < 1000000) {
              try {
                // Excel epoch is 1899-12-30 (Excel incorrectly treats 1900 as leap year)
                final excelEpoch = DateTime(1899, 12, 30);
                matchDate = excelEpoch.add(Duration(days: dateValue.toInt()));
              } catch (e) {
                // Try parsing as string if conversion fails
                dateStr = dateValue.toString().trim();
                if (dateStr.isNotEmpty && _isDate(dateStr)) {
                  matchDate = _parseDate(dateStr);
                }
              }
            } else {
              // Might be a time value or invalid, try parsing as string
              dateStr = dateValue.toString().trim();
              if (dateStr.isNotEmpty && _isDate(dateStr)) {
                matchDate = _parseDate(dateStr);
              }
            }
          } else if (dateValue is int && dateValue > 1 && dateValue < 1000000) {
            // Excel date as integer
            try {
              final excelEpoch = DateTime(1899, 12, 30);
              matchDate = excelEpoch.add(Duration(days: dateValue));
            } catch (e) {
              dateStr = dateValue.toString().trim();
              if (dateStr.isNotEmpty && _isDate(dateStr)) {
                matchDate = _parseDate(dateStr);
              }
            }
          } else {
            dateStr = dateValue.toString().trim();
            // Skip if it's just "Date" header
            if (dateStr.isNotEmpty && dateStr.toLowerCase() != 'date' && _isDate(dateStr)) {
              matchDate = _parseDate(dateStr);
            }
          }
        }
      }

      // Extract time
      String timeStr = '';
      if (timeColumnIndex >= 0 && row.length > timeColumnIndex && row[timeColumnIndex]?.value != null) {
        final timeValue = _getCellValue(row[timeColumnIndex]!.value);
        if (timeValue != null) {
          if (timeValue is double && timeValue < 1.0) {
            // Excel time format
            final hours = (timeValue * 24).floor();
            final minutes = ((timeValue * 24 - hours) * 60).floor();
            final amPm = hours >= 12 ? 'PM' : 'AM';
            final displayHour = hours > 12 ? hours - 12 : (hours == 0 ? 12 : hours);
            timeStr = '${displayHour.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')} $amPm';
          } else {
            timeStr = timeValue.toString().trim();
          }
        }
      }

      // Extract category
      String matchCategory = 'mens'; // Default
      if (categoryColumnIndex >= 0 && row.length > categoryColumnIndex && row[categoryColumnIndex]?.value != null) {
        final categoryValue = _getCellValue(row[categoryColumnIndex]!.value);
        if (categoryValue != null) {
          final categoryStr = categoryValue.toString().toLowerCase().trim();
          if (categoryStr.isNotEmpty) {
            if (categoryStr.contains('men') && !categoryStr.contains('women')) {
              matchCategory = 'mens';
            } else if (categoryStr.contains('women') || categoryStr.contains('womens')) {
              matchCategory = 'womens';
            } else if (categoryStr.contains('boy') && !categoryStr.contains('girl')) {
              matchCategory = 'boys';
            } else if (categoryStr.contains('girl')) {
              matchCategory = 'girls';
            }
          }
        }
      }
      
      // Ensure category is valid
      if (!_fixturesByCategory.containsKey(matchCategory)) {
        matchCategory = 'mens'; // Fallback to mens if invalid category
      }

      // Extract Team 1
      String team1 = '';
      if (team1ColumnIndex >= 0 && row.length > team1ColumnIndex && row[team1ColumnIndex]?.value != null) {
        final team1Value = _getCellValue(row[team1ColumnIndex]!.value);
        if (team1Value != null) {
          team1 = team1Value.toString().trim();
        }
      }

      // Extract Team 2
      String team2 = '';
      if (team2ColumnIndex >= 0 && row.length > team2ColumnIndex && row[team2ColumnIndex]?.value != null) {
        final team2Value = _getCellValue(row[team2ColumnIndex]!.value);
        if (team2Value != null) {
          team2 = team2Value.toString().trim();
        }
      }

      // Skip if no teams found
      if (team1.isEmpty && team2.isEmpty) continue;

      // Skip if values look like dates, times, or numbers only
      if ((_isDate(team1) || _isTime(team1) || RegExp(r'^\d+$').hasMatch(team1)) &&
          (_isDate(team2) || _isTime(team2) || RegExp(r'^\d+$').hasMatch(team2))) {
        continue;
      }

      // Format date properly
      String formattedDateStr = 'TBD';
      if (matchDate != null) {
        try {
          formattedDateStr = DateFormat('yyyy-MM-dd').format(matchDate);
        } catch (e) {
          // If formatting fails, try to use the date string we extracted
          if (dateStr.isNotEmpty && _isDate(dateStr)) {
            final parsed = _parseDate(dateStr);
            if (parsed != null) {
              formattedDateStr = DateFormat('yyyy-MM-dd').format(parsed);
            } else {
              formattedDateStr = dateStr; // Use original string if parsing fails
            }
          }
        }
      } else if (dateStr.isNotEmpty && _isDate(dateStr)) {
        // Try to parse the date string we extracted
        final parsed = _parseDate(dateStr);
        if (parsed != null) {
          formattedDateStr = DateFormat('yyyy-MM-dd').format(parsed);
        } else {
          formattedDateStr = dateStr; // Use original string if parsing fails
        }
      }

      // Create match if we have valid teams
      if (team1.isNotEmpty && team2.isNotEmpty) {
        final match = {
          'id': 'match_${matchCategory}_${_fixturesByCategory[matchCategory]!.length + 1}',
          'category': matchCategory,
          'matchNumber': _fixturesByCategory[matchCategory]!.length + 1,
          'team1': team1,
          'team2': team2,
          'date': formattedDateStr,
          'time': timeStr.isNotEmpty ? timeStr : 'TBD',
          'venue': 'Trooferz',
          'status': 'upcoming',
        };
        _fixturesByCategory[matchCategory]!.add(match);
      } else if (team1.isNotEmpty || team2.isNotEmpty) {
        // Handle single team (might be TBD or placeholder)
        final match = {
          'id': 'match_${matchCategory}_${_fixturesByCategory[matchCategory]!.length + 1}',
          'category': matchCategory,
          'matchNumber': _fixturesByCategory[matchCategory]!.length + 1,
          'team1': team1.isNotEmpty ? team1 : 'TBD',
          'team2': team2.isNotEmpty ? team2 : 'TBD',
          'date': formattedDateStr,
          'time': timeStr.isNotEmpty ? timeStr : 'TBD',
          'venue': 'Trooferz',
          'status': 'upcoming',
        };
        _fixturesByCategory[matchCategory]!.add(match);
      }
    }
  }

  void _parseSheetByStructure(
    excel.Sheet sheet,
    String category,
    Map<String, dynamic> structure,
  ) {
    // Parse based on the specific structure:
    // - Column A (index 0): Dates
    // - Column B (index 1): Times
    // - Column pairs: C&D (2,3), E&F (4,5), G&H (6,7) for team pairs
    // - Different date ranges use different column pairs
    
    // First pass: collect all dates from column A
    Map<int, DateTime> dateByRow = {}; // Store dates by row index
    DateTime? currentDate;
    
    for (var rowIndex = 0; rowIndex < sheet.maxRows; rowIndex++) {
      final row = sheet.rows[rowIndex];
      if (row.isEmpty || row.length == 0) continue;
      
      // Check column A (index 0) for date
      if (row[0] != null && row[0]!.value != null) {
        final dateValue = _getCellValue(row[0]!.value);
        if (dateValue != null) {
          DateTime? rowDate;
          if (dateValue is DateTime) {
            rowDate = dateValue;
          } else if (dateValue is double) {
            // Excel dates are stored as days since 1900-01-01
            // Dates are typically > 1, times are < 1
            if (dateValue > 1 && dateValue < 100000) {
              try {
                // Excel epoch is 1899-12-30 (Excel incorrectly treats 1900 as leap year)
                final excelEpoch = DateTime(1899, 12, 30);
                rowDate = excelEpoch.add(Duration(days: dateValue.toInt()));
              } catch (e) {
                // Not a valid date
              }
            }
          } else if (dateValue is int && dateValue > 1 && dateValue < 100000) {
            // Try parsing as Excel date serial number
            try {
              final excelEpoch = DateTime(1899, 12, 30);
              rowDate = excelEpoch.add(Duration(days: dateValue));
            } catch (e) {
              // Not a valid date
            }
          } else {
            final dateStr = dateValue.toString().trim();
            if (dateStr.isNotEmpty && _isDate(dateStr)) {
              rowDate = _parseDate(dateStr);
            }
          }
          
          if (rowDate != null) {
            dateByRow[rowIndex] = rowDate;
            currentDate = rowDate;
          }
        }
      }
      
      // Also propagate current date to rows that don't have explicit dates
      if (currentDate != null && !dateByRow.containsKey(rowIndex)) {
        // Check if this row has any data (teams, times, etc.) - if so, assign current date
        bool hasData = false;
        for (var i = 1; i < row.length && i < 10; i++) {
          if (row[i] != null && row[i]!.value != null) {
            final val = _getCellValue(row[i]!.value);
            if (val != null && val.toString().trim().isNotEmpty) {
              hasData = true;
              break;
            }
          }
        }
        if (hasData) {
          dateByRow[rowIndex] = currentDate;
        }
      }
    }
    
    // Second pass: parse matches from column pairs
    // Column pairs: C&D (2,3), E&F (4,5), G&H (6,7)
    final columnPairs = [
      {'cols': [2, 3], 'name': 'C&D'},  // Columns C & D
      {'cols': [4, 5], 'name': 'E&F'},  // Columns E & F
      {'cols': [6, 7], 'name': 'G&H'},  // Columns G & H
    ];
    
    for (var rowIndex = 0; rowIndex < sheet.maxRows; rowIndex++) {
      final row = sheet.rows[rowIndex];
      if (row.isEmpty) continue;
      
      // Get date for this row (check current row or find nearest date above)
      DateTime? rowDate = dateByRow[rowIndex];
      if (rowDate == null) {
        // Look for nearest date above this row
        for (var i = rowIndex - 1; i >= 0 && i >= rowIndex - 50; i--) {
          if (dateByRow.containsKey(i)) {
            rowDate = dateByRow[i];
            break;
          }
        }
      }
      
      // Don't skip rows without dates - we'll use a default date or skip only if no teams found
      
      // Get time from column B (index 1)
      String timeStr = '';
      if (row.length > 1 && row[1] != null && row[1]!.value != null) {
        final timeValue = _getCellValue(row[1]!.value);
        if (timeValue != null) {
          if (timeValue is double && timeValue < 1.0) {
            // Excel time format (fraction of day)
            final hours = (timeValue * 24).floor();
            final minutes = ((timeValue * 24 - hours) * 60).floor();
            final amPm = hours >= 12 ? 'PM' : 'AM';
            final displayHour = hours > 12 ? hours - 12 : (hours == 0 ? 12 : hours);
            timeStr = '${displayHour.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')} $amPm';
          } else {
            timeStr = timeValue.toString().trim();
          }
        }
      }
      
      // Parse matches from each column pair
      for (var pair in columnPairs) {
        final cols = pair['cols'] as List;
        final col1 = cols[0] as int;
        final col2 = cols[1] as int;
        
        // Check if row has enough columns
        if (row.length <= col2) continue;
        
        // Skip if both cells in the pair are empty
        bool hasData = false;
        if (row.length > col1 && row[col1] != null && row[col1]!.value != null) {
          final val = _getCellValue(row[col1]!.value);
          if (val != null && val.toString().trim().isNotEmpty) {
            hasData = true;
          }
        }
        if (!hasData && row.length > col2 && row[col2] != null && row[col2]!.value != null) {
          final val = _getCellValue(row[col2]!.value);
          if (val != null && val.toString().trim().isNotEmpty) {
            hasData = true;
          }
        }
        if (!hasData) continue;
        
        // Get team names from the column pair
        String team1 = '';
        String team2 = '';
        String matchCategory = category; // Default to sheet category
        String stage = '';
        
        // Try to get team names from both columns
        String col1Value = '';
        String col2Value = '';
        
        if (row[col1] != null && row[col1]!.value != null) {
          final cellValue = _getCellValue(row[col1]!.value);
          if (cellValue != null) {
            col1Value = cellValue.toString().trim();
          }
        }
        
        if (row[col2] != null && row[col2]!.value != null) {
          final cellValue = _getCellValue(row[col2]!.value);
          if (cellValue != null) {
            col2Value = cellValue.toString().trim();
          }
        }
        
        // Check if teams are in a single cell with "vs" or "v"
        if (col1Value.isNotEmpty && (col1Value.toLowerCase().contains(' vs ') || 
            col1Value.toLowerCase().contains(' v ') ||
            col1Value.toLowerCase().contains('vs.') ||
            col1Value.toLowerCase().contains('v.'))) {
          final parts = col1Value.split(RegExp(r'\s+vs\s+|\s+v\s+|vs\.|v\.', caseSensitive: false));
          if (parts.length >= 2) {
            team1 = parts[0].trim();
            team2 = parts[1].trim();
          } else if (parts.length == 1 && col2Value.isNotEmpty) {
            team1 = parts[0].trim();
            team2 = col2Value;
          }
        } else if (col2Value.isNotEmpty && (col2Value.toLowerCase().contains(' vs ') || 
            col2Value.toLowerCase().contains(' v '))) {
          final parts = col2Value.split(RegExp(r'\s+vs\s+|\s+v\s+', caseSensitive: false));
          if (parts.length >= 2) {
            team1 = parts[0].trim();
            team2 = parts[1].trim();
          } else if (parts.length == 1 && col1Value.isNotEmpty) {
            team1 = col1Value;
            team2 = parts[0].trim();
          }
        } else {
          // Teams are in separate cells
          team1 = col1Value;
          team2 = col2Value;
        }
        
        // Skip if no teams found or if cells contain only numbers/dates/times
        if (team1.isEmpty && team2.isEmpty) continue;
        
        // Skip if values look like dates, times, or numbers only
        if ((_isDate(team1) || _isTime(team1) || RegExp(r'^\d+$').hasMatch(team1)) &&
            (_isDate(team2) || _isTime(team2) || RegExp(r'^\d+$').hasMatch(team2))) {
          continue;
        }
        
        // Check if team names contain category identifiers or stage info
        final team1Lower = team1.toLowerCase();
        final team2Lower = team2.toLowerCase();
        
        // Check for category in team names - be careful not to remove valid team names
        // Only detect category if it appears as a standalone word or at the start/end
        bool isCategoryOnly = false;
        if (team1Lower == 'boys' || team1Lower == 'girls' || 
            team1Lower == 'men' || team1Lower == 'mens' ||
            team1Lower == 'women' || team1Lower == 'womens') {
          isCategoryOnly = true;
        }
        if (team2Lower == 'boys' || team2Lower == 'girls' || 
            team2Lower == 'men' || team2Lower == 'mens' ||
            team2Lower == 'women' || team2Lower == 'womens') {
          isCategoryOnly = true;
        }
        
        // Detect category but don't remove from team names unless it's category-only
        if (team1Lower.contains('boys') || team2Lower.contains('boys')) {
          matchCategory = 'boys';
          if (isCategoryOnly) {
            // Only remove if it's just the category word
            if (team1Lower == 'boys') team1 = '';
            if (team2Lower == 'boys') team2 = '';
          }
        } else if (team1Lower.contains('girls') || team2Lower.contains('girls')) {
          matchCategory = 'girls';
          if (isCategoryOnly) {
            if (team1Lower == 'girls') team1 = '';
            if (team2Lower == 'girls') team2 = '';
          }
        } else if (team1Lower.contains('women') || team2Lower.contains('women') ||
                   team1Lower.contains('womens') || team2Lower.contains('womens')) {
          matchCategory = 'womens';
          if (isCategoryOnly) {
            if (team1Lower == 'women' || team1Lower == 'womens') team1 = '';
            if (team2Lower == 'women' || team2Lower == 'womens') team2 = '';
          }
        } else if (team1Lower.contains('men') || team2Lower.contains('men') ||
                   team1Lower.contains('mens') || team2Lower.contains('mens')) {
          matchCategory = 'mens';
          if (isCategoryOnly) {
            if (team1Lower == 'men' || team1Lower == 'mens') team1 = '';
            if (team2Lower == 'men' || team2Lower == 'mens') team2 = '';
          }
        }
        
        // Check for stage information (Semi Final, Final, etc.)
        if (team1Lower.contains('semi final') || team1Lower.contains('semifinal') ||
            team1Lower.contains('final')) {
          stage = team1;
          team1 = '';
        }
        if (team2Lower.contains('semi final') || team2Lower.contains('semifinal') ||
            team2Lower.contains('final')) {
          stage = team2;
          team2 = '';
        }
        
        // Check nearby cells for stage information
        if (stage.isEmpty && row.length > col2 + 1) {
          for (var i = col2 + 1; i < row.length && i < col2 + 3; i++) {
            if (row[i] != null && row[i]!.value != null) {
              final cellValue = _getCellValue(row[i]!.value);
              if (cellValue != null) {
                final cellStr = cellValue.toString().toLowerCase().trim();
                if (cellStr.contains('semi final') || cellStr.contains('semifinal') ||
                    cellStr.contains('final')) {
                  stage = cellValue.toString().trim();
                  break;
                }
              }
            }
          }
        }
        
        // Skip if this is just a category/stage identifier without teams
        if (team1.isEmpty && team2.isEmpty) continue;
        
        // Handle case where only one team is present (might be a single team match or identifier)
        if (team1.isEmpty && team2.isNotEmpty) {
          // Check if team2 is actually a category identifier
          if (team2Lower.contains('boys') || team2Lower.contains('girls') ||
              team2Lower.contains('men') || team2Lower.contains('women')) {
            continue; // Skip category identifiers
          }
        }
        if (team2.isEmpty && team1.isNotEmpty) {
          // Check if team1 is actually a category identifier
          if (team1Lower.contains('boys') || team1Lower.contains('girls') ||
              team1Lower.contains('men') || team1Lower.contains('women')) {
            continue; // Skip category identifiers
          }
        }
        
        // Create match if we have valid teams
        if (team1.isNotEmpty && team2.isNotEmpty) {
          // Only create match if we have a date or at least one team name is substantial
          if (rowDate != null || team1.length > 2 || team2.length > 2) {
            final match = {
              'id': 'match_${matchCategory}_${_fixturesByCategory[matchCategory]!.length + 1}',
              'category': matchCategory,
              'matchNumber': _fixturesByCategory[matchCategory]!.length + 1,
              'team1': team1,
              'team2': team2,
              'date': rowDate != null ? DateFormat('yyyy-MM-dd').format(rowDate) : 'TBD',
              'time': timeStr.isNotEmpty ? timeStr : 'TBD',
              'venue': 'TBD',
              'status': 'upcoming',
              if (stage.isNotEmpty) 'stage': stage,
            };
            _fixturesByCategory[matchCategory]!.add(match);
          }
        }
      }
    }
  }

  Map<String, dynamic>? _parseMatchRow(
    List<excel.Data?> row,
    String category,
    excel.Sheet sheet,
    DateTime? defaultDate,
  ) {
    try {
      if (row.isEmpty) return null;

      // Column B (index 1) has match timings
      String timeStr = '';
      if (row.length > 1 && row[1] != null) {
        final cellValue = row[1]!.value;
        if (cellValue != null) {
          final timeValue = _getCellValue(cellValue);
          if (timeValue != null) {
            timeStr = timeValue.toString().trim();
            // Handle Excel time format (decimal)
            if (timeValue is double && timeValue < 1.0) {
              // Excel time is stored as fraction of day
              final hours = (timeValue * 24).floor();
              final minutes = ((timeValue * 24 - hours) * 60).floor();
              final amPm = hours >= 12 ? 'PM' : 'AM';
              final displayHour = hours > 12 ? hours - 12 : (hours == 0 ? 12 : hours);
              timeStr = '${displayHour.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')} $amPm';
            }
          }
        }
      }

      // Find date - use defaultDate if provided, otherwise look in row
      DateTime? matchDate = defaultDate;
      String dateStr = '';
      
      // Check column A first (might override defaultDate)
      if (row.length > 0 && row[0] != null) {
        final cellValue = row[0]!.value;
        if (cellValue != null) {
          final dateValue = _getCellValue(cellValue);
          if (dateValue != null) {
            if (dateValue is DateTime) {
              matchDate = dateValue;
            } else if (dateValue is double && dateValue > 1) {
              // Excel date stored as number (days since 1900)
              try {
                // Excel epoch is 1900-01-01, but Excel incorrectly treats 1900 as leap year
                final excelEpoch = DateTime(1899, 12, 30);
                matchDate = excelEpoch.add(Duration(days: dateValue.toInt()));
              } catch (e) {
                // Try parsing as string
                dateStr = dateValue.toString();
              }
            } else {
              final cellStr = dateValue.toString().trim();
              if (_isDate(cellStr)) {
                dateStr = cellStr;
              }
            }
          }
        }
      }

      // If date not found in column A, search other columns (but skip column B)
      if (matchDate == null && dateStr.isEmpty) {
        for (var i = 0; i < row.length && i < 10; i++) {
          if (i == 1) continue; // Skip column B (time)
          if (row[i]?.value != null) {
            final cellValueObj = row[i]!.value;
            final cellValue = _getCellValue(cellValueObj)?.toString().trim() ?? '';
            if (cellValue.isNotEmpty && _isDate(cellValue)) {
              dateStr = cellValue;
              break;
            }
          }
        }
      }

      // Parse date string if we have one
      if (matchDate == null && dateStr.isNotEmpty) {
        matchDate = _parseDate(dateStr);
      }
      
      // Use defaultDate if still no date found
      if (matchDate == null) {
        matchDate = defaultDate;
      }

      // Extract team names - look for "Team1 vs Team2" pattern
      String team1 = '';
      String team2 = '';
      String venue = 'TBD';
      String stage = '';

      // Look for team names in columns after time (column B)
      // Common patterns: "Team1 vs Team2" or separate columns
      final teamCells = <String>[];
      for (var i = 2; i < row.length && i < 10; i++) {
        if (row[i]?.value != null) {
          final cellValueObj = row[i]!.value;
          final cellValue = _getCellValue(cellValueObj)?.toString().trim() ?? '';
          if (cellValue.isEmpty) continue;

          // Skip if it's "VS" or similar
          if (cellValue.toUpperCase().contains('VS') || 
              cellValue.toUpperCase().contains('V/S') ||
              cellValue == 'v' || cellValue == 'V') {
            continue;
          }

          // Skip if it's a match number
          if (cellValue.toLowerCase().contains('match') || 
              RegExp(r'^#?\d+$').hasMatch(cellValue)) {
            continue;
          }

          // Skip if it's a date or time
          if (_isDate(cellValue) || _isTime(cellValue)) {
            continue;
          }

          // Check if it contains "vs" (team names might be in one cell)
          if (cellValue.toLowerCase().contains(' vs ') || 
              cellValue.toLowerCase().contains(' v ')) {
            final parts = cellValue.split(RegExp(r'\s+vs\s+|\s+v\s+', caseSensitive: false));
            if (parts.length >= 2) {
              team1 = parts[0].trim();
              team2 = parts[1].trim();
              break;
            }
          } else {
            teamCells.add(cellValue);
          }
        }
      }

      // If teams not found in combined format, use separate cells
      if (team1.isEmpty || team2.isEmpty) {
        if (teamCells.length >= 2) {
          team1 = teamCells[0];
          team2 = teamCells[1];
          if (teamCells.length > 2) {
            venue = teamCells[2];
          }
        }
      }

      if (team1.isEmpty || team2.isEmpty) return null;

      return {
        'id': 'match_${category}_${_fixturesByCategory[category]!.length + 1}',
        'category': category,
        'matchNumber': _fixturesByCategory[category]!.length + 1,
        'team1': team1,
        'team2': team2,
        'date': matchDate != null ? DateFormat('yyyy-MM-dd').format(matchDate) : '',
        'time': timeStr.isNotEmpty ? timeStr : 'TBD',
        'venue': venue,
        'status': 'upcoming',
        if (stage.isNotEmpty) 'stage': stage,
      };
    } catch (e) {
      return null;
    }
  }

  bool _isDate(String value) {
    if (value.isEmpty) return false;
    // Check for common date patterns
    if (RegExp(r'^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$').hasMatch(value)) return true;
    if (RegExp(r'^\d{4}[/-]\d{1,2}[/-]\d{1,2}$').hasMatch(value)) return true;
    if (value.toLowerCase().contains('jan') || 
        value.toLowerCase().contains('feb') ||
        value.toLowerCase().contains('mar') ||
        value.toLowerCase().contains('apr') ||
        value.toLowerCase().contains('may') ||
        value.toLowerCase().contains('jun') ||
        value.toLowerCase().contains('jul') ||
        value.toLowerCase().contains('aug') ||
        value.toLowerCase().contains('sep') ||
        value.toLowerCase().contains('oct') ||
        value.toLowerCase().contains('nov') ||
        value.toLowerCase().contains('dec')) {
      return true;
    }
    return false;
  }

  bool _isTime(String value) {
    if (value.isEmpty) return false;
    // Check for time patterns like "09:00 AM", "14:30", etc.
    if (RegExp(r'^\d{1,2}:\d{2}(\s*(AM|PM|am|pm))?$').hasMatch(value)) return true;
    return false;
  }

  DateTime? _parseDate(String dateStr) {
    try {
      // Try different date formats
      if (dateStr.contains('/')) {
        final parts = dateStr.split('/');
        if (parts.length == 3) {
          // Try DD/MM/YYYY or MM/DD/YYYY
          final day = int.tryParse(parts[0]);
          final month = int.tryParse(parts[1]);
          final year = int.tryParse(parts[2]);
          if (day != null && month != null && year != null) {
            // Assume DD/MM/YYYY format
            if (day > 12) {
              return DateTime(year, month, day);
            } else {
              // Could be either format, try DD/MM/YYYY first
              try {
                return DateTime(year, month, day);
              } catch (e) {
                return DateTime(year, day, month);
              }
            }
          }
        }
      } else if (dateStr.contains('-')) {
        final parts = dateStr.split('-');
        if (parts.length == 3) {
          final year = int.tryParse(parts[0]);
          final month = int.tryParse(parts[1]);
          final day = int.tryParse(parts[2]);
          if (year != null && month != null && day != null) {
            return DateTime(year, month, day);
          }
        }
      }
      
      // Try standard DateTime parse
      return DateTime.parse(dateStr);
    } catch (e) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    final theme = Theme.of(context);

    return Column(
      children: [
        _buildHeader(context),
        Container(
          color: theme.colorScheme.primary.withOpacity(0.05),
          child: TabBar(
            controller: _tabController,
            labelColor: theme.colorScheme.primary,
            unselectedLabelColor: Colors.grey,
            indicatorColor: theme.colorScheme.primary,
            indicatorWeight: 3,
            tabs: const [
              Tab(text: 'Groups'),
              Tab(text: 'Points Table'),
              Tab(text: 'Fixtures'),
            ],
          ),
        ),
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              _buildGroupsTab(context),
              _buildPointsTableTab(context),
              _buildFixturesTab(context),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPointsTableTab(BuildContext context) {
    final theme = Theme.of(context);
    final categories = (_scheduleData?['categories'] as List<dynamic>? ?? [])
        .cast<Map<String, dynamic>>();

    if (categories.isEmpty || _pointsTableByCategory.isEmpty) {
      return _buildComingSoon(context, 'Points Table', Icons.leaderboard);
    }

    return DefaultTabController(
      length: categories.length,
      child: Column(
        children: [
          Container(
            color: theme.colorScheme.primary.withOpacity(0.05),
            child: TabBar(
              isScrollable: true,
              labelColor: theme.colorScheme.primary,
              unselectedLabelColor: Colors.grey,
              indicatorColor: theme.colorScheme.primary,
              tabs: [
                for (final cat in categories)
                  Tab(text: (cat['name'] ?? cat['id']) as String),
              ],
            ),
          ),
          Expanded(
            child: TabBarView(
              children: [
                for (final cat in categories)
                  _buildPointsTableForCategory(
                    context,
                    (cat['id'] as String?) ?? '',
                    cat,
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPointsTableForCategory(
      BuildContext context, String categoryId, Map<String, dynamic> category) {
    final teams = _pointsTableByCategory[categoryId] ?? [];
    if (teams.isEmpty) {
      return Center(
        child: Text(
          'No points table available',
          style: Theme.of(context)
              .textTheme
              .bodyMedium
              ?.copyWith(color: Colors.grey[600]),
        ),
      );
    }

    // Special handling for Men's category: split by group A/B
    if (categoryId == 'mens') {
      final groupA =
          teams.where((t) => (t['group'] ?? '').toString().toUpperCase() == 'A').toList();
      final groupB =
          teams.where((t) => (t['group'] ?? '').toString().toUpperCase() == 'B').toList();

      return SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (groupA.isNotEmpty) ...[
              Text(
                'Group A',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 8),
              _buildPointsTableDataTable(context, groupA),
              const SizedBox(height: 24),
            ],
            if (groupB.isNotEmpty) ...[
              Text(
                'Group B',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 8),
              _buildPointsTableDataTable(context, groupB),
            ],
          ],
        ),
      );
    }

    // Default single-table rendering for other categories
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      scrollDirection: Axis.vertical,
      child: _buildPointsTableDataTable(context, teams),
    );
  }

  Widget _buildPointsTableDataTable(
      BuildContext context, List<Map<String, dynamic>> teams) {
    return Card(
      elevation: 3,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          columns: const [
            DataColumn(label: Text('Team')),
            DataColumn(label: Text('P')),
            DataColumn(label: Text('W')),
            DataColumn(label: Text('L')),
            DataColumn(label: Text('Pts')),
            DataColumn(label: Text('NRR')),
          ],
          rows: teams.map((team) {
            final name = (team['name'] ?? '') as String;
            final played = (team['played'] ?? 0) as int;
            final won = (team['won'] ?? 0) as int;
            final lost = (team['lost'] ?? 0) as int;
            final nrr = (team['nrr'] ?? 0.0) as num;
            // Use points from JSON if available, otherwise calculate (won * 2)
            final points = (team['points'] ?? (won * 2)) as num;

            return DataRow(cells: [
              DataCell(Text(name)),
              DataCell(Text('$played')),
              DataCell(Text('$won')),
              DataCell(Text('$lost')),
              DataCell(Text('${points.toInt()}')),
              DataCell(Text(nrr.toStringAsFixed(2))),
            ]);
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildGroupsTab(BuildContext context) {
    final theme = Theme.of(context);
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 8),
          // Group A Section
          _buildGroupSection(context, 'Group A', _groupA, Colors.blue),
          const SizedBox(height: 24),
          // Group B Section
          _buildGroupSection(context, 'Group B', _groupB, Colors.green),
        ],
      ),
    );
  }

  Widget _buildGroupSection(
    BuildContext context,
    String title,
    List<Map<String, dynamic>> teams,
    Color color,
  ) {
    final theme = Theme.of(context);
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              color.withOpacity(0.08),
              color.withOpacity(0.03),
            ],
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Enhanced Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    color.withOpacity(0.25),
                    color.withOpacity(0.15),
                  ],
                ),
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(20),
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [color, color.withOpacity(0.8)],
                      ),
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: color.withOpacity(0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        title.split(' ').last,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 20,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: color,
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${teams.length} Teams',
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey.shade600,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    Icons.group,
                    color: color.withOpacity(0.7),
                    size: 28,
                  ),
                ],
              ),
            ),
            // Teams List - Full Width Cards
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: teams.asMap().entries.map((entry) {
                  final index = entry.key;
                  final team = entry.value;
                  final isEven = index % 2 == 0;
                  
                  return Container(
                    width: double.infinity,
                    margin: EdgeInsets.only(
                      bottom: index < teams.length - 1 ? 12 : 0,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isEven 
                            ? color.withOpacity(0.2)
                            : color.withOpacity(0.15),
                        width: 1.5,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: color.withOpacity(0.08),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                          spreadRadius: 0,
                        ),
                      ],
                    ),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        borderRadius: BorderRadius.circular(16),
                        onTap: () {
                          // Navigate to Teams tab
                          if (widget.onNavigateToTab != null) {
                            widget.onNavigateToTab!(1); // Teams tab is at index 1
                          }
                        },
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 18,
                            vertical: 16,
                          ),
                          child: Row(
                            children: [
                              // Team Name - Full Width
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      team['name'] as String,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 16,
                                        letterSpacing: 0.3,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                              // Arrow Icon
                              Icon(
                                Icons.arrow_forward_ios,
                                color: color.withOpacity(0.4),
                                size: 18,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFixturesTab(BuildContext context) {
    final theme = Theme.of(context);
    final categories = _scheduleData?['categories'] as List? ?? [];
    
    return Column(
      children: [
        Container(
          color: theme.colorScheme.primary.withOpacity(0.05),
          child: TabBar(
            controller: _fixturesTabController,
            labelColor: theme.colorScheme.primary,
            unselectedLabelColor: Colors.grey,
            indicatorColor: theme.colorScheme.primary,
            indicatorWeight: 3,
            isScrollable: true,
            tabs: categories.map((cat) {
              final category = cat as Map<String, dynamic>;
              return Tab(
                text: category['name'] ?? category['id'],
              );
            }).toList(),
          ),
        ),
        Expanded(
          child: TabBarView(
            controller: _fixturesTabController,
            children: categories.map((cat) {
              final category = cat as Map<String, dynamic>;
              final categoryId = category['id'] as String;
              return _buildCategoryFixtures(context, categoryId, category);
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildCategoryFixtures(
    BuildContext context,
    String categoryId,
    Map<String, dynamic> category,
  ) {
    final fixtures = _fixturesByCategory[categoryId] ?? [];
    final categoryColor = Color(int.parse(
      category['color']?.toString().replaceFirst('#', '0xFF') ?? '0xFF1565C0',
    ));

    if (fixtures.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.calendar_today,
              size: 64,
              color: Colors.grey.shade400,
            ),
            const SizedBox(height: 16),
            Text(
              'No fixtures available',
              style: TextStyle(
                fontSize: 18,
                color: Colors.grey.shade600,
              ),
            ),
          ],
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 8),
          ...fixtures.asMap().entries.map((entry) {
            final index = entry.key;
            final fixture = entry.value;
            return _buildFixtureCard(context, fixture, categoryColor, index + 1);
          }).toList(),
        ],
      ),
    );
  }

  Widget _buildFixtureCard(
    BuildContext context,
    Map<String, dynamic> fixture,
    Color categoryColor,
    int matchNumber,
  ) {
    final theme = Theme.of(context);
    final team1 = fixture['team1'] as String? ?? 'TBD';
    final team2 = fixture['team2'] as String? ?? 'TBD';
    final date = fixture['date'] as String? ?? '';
    final time = fixture['time'] as String? ?? 'TBD';
    final venue = fixture['venue'] as String? ?? 'TBD';
    final stage = fixture['stage'] as String?;
    final status = fixture['status'] as String? ?? 'upcoming';

    // Parse date for display
    String formattedDate = date.isNotEmpty ? date : 'TBD';
    try {
      if (date.isNotEmpty && date != 'TBD') {
        // Try parsing as yyyy-MM-dd format first
        if (date.contains('-') && date.length >= 10) {
        final dateTime = DateTime.parse(date);
        formattedDate = DateFormat('MMM dd, yyyy').format(dateTime);
        } else if (_isDate(date)) {
          // Try parsing other date formats
          final parsedDate = _parseDate(date);
          if (parsedDate != null) {
            formattedDate = DateFormat('MMM dd, yyyy').format(parsedDate);
          }
        }
      }
    } catch (e) {
      // Keep original date string if parsing fails
      formattedDate = date.isNotEmpty ? date : 'TBD';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            categoryColor.withOpacity(0.1),
            categoryColor.withOpacity(0.05),
          ],
        ),
        border: Border.all(
          color: categoryColor.withOpacity(0.2),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: categoryColor.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with match number and stage
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: categoryColor.withOpacity(0.15),
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(16),
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: categoryColor,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'Match $matchNumber',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
                if (stage != null && stage.isNotEmpty) ...[
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      stage,
                      style: TextStyle(
                        color: categoryColor,
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ],
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: status == 'completed'
                        ? Colors.green
                        : status == 'live'
                            ? Colors.red
                            : Colors.orange,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    status.toUpperCase(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 10,
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Match details
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Teams
                Row(
                  children: [
                    Expanded(
                      child: _buildTeamCard(team1, categoryColor, true),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: Text(
                        'VS',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: categoryColor,
                        ),
                      ),
                    ),
                    Expanded(
                      child: _buildTeamCard(team2, categoryColor, false),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                // Date, Time, Venue
                Row(
                  children: [
                    Expanded(
                      child: _buildInfoItem(
                        Icons.calendar_today,
                        formattedDate,
                        categoryColor,
                      ),
                    ),
                    Expanded(
                      child: _buildInfoItem(
                        Icons.access_time,
                        time,
                        categoryColor,
                      ),
                    ),
                    Expanded(
                      child: _buildInfoItem(
                        Icons.location_on,
                        venue,
                        categoryColor,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTeamCard(String teamName, Color color, bool isLeft) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: color.withOpacity(0.2),
          width: 1.5,
        ),
      ),
      child: Column(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              shape: BoxShape.circle,
              border: Border.all(
                color: color.withOpacity(0.3),
                width: 2,
              ),
            ),
            child: Center(
              child: Text(
                teamName.isNotEmpty ? teamName[0].toUpperCase() : 'T',
                style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            teamName,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 13,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildInfoItem(IconData icon, String text, Color color) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(icon, size: 16, color: color.withOpacity(0.7)),
        const SizedBox(width: 4),
        Flexible(
          child: Text(
            text,
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey.shade700,
              fontWeight: FontWeight.w500,
            ),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Widget _buildComingSoon(BuildContext context, String title, IconData icon) {
    final theme = Theme.of(context);
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(height: 20),
          // Icon
          Container(
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  theme.colorScheme.primary.withOpacity(0.15),
                  theme.colorScheme.secondary.withOpacity(0.15),
                ],
              ),
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: theme.colorScheme.primary.withOpacity(0.2),
                  blurRadius: 20,
                  spreadRadius: 5,
                ),
              ],
            ),
            child: Icon(
              icon,
              size: 70,
              color: theme.colorScheme.primary,
            ),
          ),
          const SizedBox(height: 28),
          // Coming Soon Text
          ShaderMask(
            shaderCallback: (bounds) => LinearGradient(
              colors: [
                theme.colorScheme.primary,
                theme.colorScheme.secondary,
              ],
            ).createShader(bounds),
            child: Text(
              'Coming Soon!',
              style: const TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            title,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              color: Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    final tournament = _scheduleData?['tournament'] as Map<String, dynamic>?;
    final theme = Theme.of(context);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            theme.colorScheme.primary,
            theme.colorScheme.secondary,
          ],
        ),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.calendar_month, color: Colors.white, size: 28),
              const SizedBox(width: 12),
              Text(
                'Schedule',
                style: theme.textTheme.headlineSmall?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          if (tournament != null) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '${tournament['startDate']} - ${tournament['endDate']}',
                style: const TextStyle(color: Colors.white, fontSize: 13),
              ),
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.location_on, color: Colors.white70, size: 16),
                const SizedBox(width: 4),
                Text(
                  tournament['venue'] ?? 'TBD',
                  style: const TextStyle(color: Colors.white70, fontSize: 13),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

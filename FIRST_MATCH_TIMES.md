# First Match Times by Day

## How to Find First Match Times

The first match times for each day are determined from the Excel schedule file (`assets/JCPL 3 Schedule V3 (1).xlsx`). 

### Method 1: Check Browser Console
When the app loads, the `FixtureTournamentService` (with debug enabled) logs:
- Date buckets and number of matches per day
- Match details including dates and times

**To view:**
1. Open the app in Chrome
2. Press F12 to open DevTools
3. Go to Console tab
4. Look for logs starting with `[FixtureTournamentService]`
5. The logs will show dates and match information

### Method 2: Check Excel File Directly
Open `assets/JCPL 3 Schedule V3 (1).xlsx` and:
1. Look at the **Date** column (Column A)
2. Look at the **Time** column (Column B)
3. For each unique date, find the earliest time
4. That's the first match time for that day

### Method 3: Check in App
When you select a tournament/day in the Predictor Game:
- The freeze check uses the earliest match time for that day
- If current time < first match time → Game is FROZEN
- If current time >= first match time → Game is NOT FROZEN

## Default Behavior
- If a match has **no time** or **"TBD"** → defaults to **9:00 AM**
- The freeze check finds the **earliest match time** across all matches on that day

## Example
If a day has matches at:
- 2:00 PM (Mens)
- 9:00 AM (Boys) ← **First match**
- 11:00 AM (Womens)

The first match time is **9:00 AM**, so:
- Before 9:00 AM → FROZEN ❄️
- At or after 9:00 AM → NOT FROZEN ✅

## Notes
- Times are parsed from Excel in formats like:
  - `09:00 AM` / `9:00 AM`
  - `09:00` / `9:00` (24-hour)
  - `02:30 PM` / `2:30 PM`
- Excel decimal time format is also supported (fraction of day)


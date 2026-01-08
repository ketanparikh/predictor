# Testing Day Grey-Out Functionality

## How to Test

1. **Open the app in Chrome** (should be running on http://localhost:8080)

2. **Navigate to Predictor Game**:
   - Click on "Predictor Game" tab
   - Click "Play Game" button
   - You should see the "Select Day" screen

3. **Check the Browser Console**:
   - Press F12 to open Developer Tools
   - Go to the "Console" tab
   - Look for debug logs starting with `[GameProvider]`

4. **What to Look For**:

   **Days that SHOULD be greyed out:**
   - Days where the first match has already started
   - These will show:
     - 50% opacity (greyed out)
     - Grey background
     - Lock icon instead of trophy icon
     - "Started" badge with orange background
     - Disabled (not clickable)

   **Days that SHOULD NOT be greyed out:**
   - Days where the first match hasn't started yet
   - These will show:
     - Full opacity (normal)
     - Normal colors
     - Trophy icon
     - Clickable

5. **Console Logs to Check**:
   ```
   [GameProvider] Tournament "Jan 10, 2026" (2026-01-10): FIRST MATCH PAST
     First match: 2026-01-10 07:00:00.000
     Current time: 2026-01-10 08:30:00.000
   ```

6. **Expected Behavior**:
   - If current time is **after** the first match start time → Day is greyed out
   - If current time is **before** the first match start time → Day is NOT greyed out
   - If current time is **exactly** at the first match start time → Day is greyed out

## Troubleshooting

If days are not greying out properly:

1. **Check console logs** for:
   - Date parsing errors
   - Time parsing errors
   - "No valid match time found" messages

2. **Verify date format**:
   - Dates should be in `yyyy-MM-dd` format (e.g., "2026-01-10")
   - Check console logs to see what date format is being used

3. **Verify time format**:
   - Times can be: "07:00 AM", "07AM - 08AM", "07AM", etc.
   - Check console logs to see what time format is being parsed

4. **Check current time**:
   - Make sure your system clock is correct
   - Console logs will show the current time being compared

## Test Scenarios

### Scenario 1: Past Day
- Set a match time to 2 hours ago
- Expected: Day should be greyed out

### Scenario 2: Future Day
- Set a match time to 2 hours in the future
- Expected: Day should NOT be greyed out

### Scenario 3: Time Range Format
- Use "07AM - 08AM" format
- Expected: Should extract "07AM" and compare correctly

### Scenario 4: Multiple Matches
- Day with matches at 7 AM, 9 AM, 2 PM
- Expected: Should use 7 AM (earliest) for comparison

### Scenario 5: No Time Specified
- Match with no time or "TBD"
- Expected: Should default to 9:00 AM


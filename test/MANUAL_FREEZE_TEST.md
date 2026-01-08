# Manual Freeze Functionality Test Guide

## Quick Test Checklist

### Prerequisites
1. Ensure Excel file has Time column with valid times (e.g., "09:00 AM", "02:00 PM")
2. Ensure Date column has valid dates (e.g., "2026-01-15")
3. Start the app and navigate to Predictor Game

### Test Scenarios

#### Test 1: Before First Match (Should be FROZEN)
1. **Setup**: Set your device time to **8:00 AM** on a tournament day
2. **Action**: 
   - Select a tournament/day
   - Select a match
   - Try to answer questions
   - Try to submit
3. **Expected Result**:
   - ✅ Orange banner appears: "Game is frozen until the first match of the day starts"
   - ✅ "Next Question" / "Submit" button is **disabled**
   - ✅ You can still select answers (but can't submit)

#### Test 2: After First Match (Should NOT be FROZEN)
1. **Setup**: Set your device time to **11:00 AM** (after first match at 10:00 AM)
2. **Action**:
   - Select the same tournament/day
   - Select a match
   - Answer questions
   - Submit
3. **Expected Result**:
   - ✅ No freeze banner
   - ✅ "Next Question" / "Submit" button is **enabled**
   - ✅ Submission succeeds

#### Test 3: Exactly at First Match Time
1. **Setup**: Set device time to **10:00 AM** (exactly at first match)
2. **Action**: Try to submit
3. **Expected Result**:
   - ✅ NOT frozen (submission allowed)
   - ✅ Button enabled

#### Test 4: Multiple Matches - Find Earliest
1. **Setup**: Tournament has matches at:
   - 2:00 PM
   - 9:00 AM (earliest)
   - 11:00 AM
2. **Test at 8:00 AM**: Should be FROZEN (before 9 AM)
3. **Test at 9:30 AM**: Should NOT be FROZEN (after 9 AM)

#### Test 5: No Time Specified
1. **Setup**: Match has no time or "TBD" in Excel
2. **Expected**: Defaults to 9:00 AM
3. **Test at 8:00 AM**: Should be FROZEN
4. **Test at 9:30 AM**: Should NOT be FROZEN

#### Test 6: Different Time Formats
Verify these formats work:
- `09:00 AM` ✅
- `9:00 AM` ✅
- `09:00` (24-hour) ✅
- `02:30 PM` ✅
- `2:30 PM` ✅

## Browser Console Checks

Open browser DevTools console and check for:
1. Time parsing logs (if debug enabled)
2. No errors when selecting matches
3. Freeze status logged correctly

## Edge Cases to Verify

1. **Empty tournament** - Should not crash
2. **Invalid time format** - Should default to 9:00 AM
3. **Past tournament date** - Should NOT be frozen
4. **Future tournament date** - Should be frozen if before first match

## Critical Verification Points

- [ ] Freeze check runs when match is selected
- [ ] UI updates correctly (banner shows/hides)
- [ ] Button state changes correctly
- [ ] Submission blocked when frozen
- [ ] Submission allowed when not frozen
- [ ] Time parsing handles all formats
- [ ] Default time (9 AM) works correctly
- [ ] Multiple matches handled correctly

## Production Monitoring

After deployment, monitor:
1. User reports of incorrect freeze behavior
2. Console errors related to time parsing
3. Edge cases in production data


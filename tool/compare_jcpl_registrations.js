#!/usr/bin/env node
/**
 * Compare JCPL 3 vs JCPL 4 Google Form registrations in /assets.
 *
 * Usage:
 *   node tool/compare_jcpl_registrations.js
 *   node tool/compare_jcpl_registrations.js --csv
 *
 * Writes assets/JCPL 3 not registered in JCPL 4.xlsx
 * Default report: people who registered in JCPL 3 but not JCPL 4.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const XLSX = require(path.join(ROOT, 'cricket-auction-app/node_modules/xlsx'));

const FILE_S3 = path.join(ROOT, 'assets/JCPL 3 Registration Form (Responses) (4).xlsx');
const FILE_S4 = path.join(ROOT, 'assets/JCPL 4 Registeration (Responses).xlsx');

function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/['’]s\b/g, '')
    .replace(/\((c|wk|vc)\)/gi, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(name) {
  return normalizeName(name).split(' ').filter(Boolean);
}

function col(row, test) {
  const key = Object.keys(row).find((k) => test(k.toLowerCase()));
  return key ? String(row[key] ?? '').trim() : '';
}

function readSheet(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}`);
  }
  const wb = XLSX.readFile(filePath);
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
    defval: '',
    raw: false,
  });
}

function parseS3(rows) {
  const latest = new Map();
  for (const row of rows) {
    const name = col(row, (k) => k === 'name');
    if (!name) continue;
    const building = col(row, (k) => k === 'building' || k === 'tower');
    const flat = col(row, (k) => k.includes('flat'));
    const rec = {
      name,
      season: 3,
      gender: col(row, (k) => k === 'gender'),
      age: col(row, (k) => k === 'age'),
      category: '',
      skill: col(row, (k) => k.includes('primary') && k.includes('skill')),
      building,
      flat,
      phone: col(row, (k) => k.includes('phone')),
      timestamp: col(row, (k) => k === 'timestamp'),
    };
    latest.set(`${normalizeName(name)}|${normalizeName(building)}|${normalizeName(flat)}`, rec);
  }
  return [...latest.values()];
}

function parseS4(rows) {
  const latest = new Map();
  for (const row of rows) {
    const name = col(row, (k) => k === 'name');
    if (!name) continue;
    const building = col(row, (k) => k === 'tower' || k === 'building');
    const flat = col(row, (k) => k.includes('flat'));
    const rec = {
      name,
      season: 4,
      gender: '',
      age: '',
      category: col(row, (k) => k === 'category'),
      skill: col(row, (k) => k.includes('primary') && k.includes('skill')),
      building,
      flat,
      phone: col(row, (k) => k.includes('contact') || k.includes('phone')),
      timestamp: col(row, (k) => k === 'timestamp'),
    };
    latest.set(`${normalizeName(name)}|${normalizeName(building)}|${normalizeName(flat)}`, rec);
  }
  return [...latest.values()];
}

function namesMatch(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.length || !tb.length) return false;
  const lastA = ta[ta.length - 1];
  const lastB = tb[tb.length - 1];
  const firstA = ta[0];
  const firstB = tb[0];
  const lastClose =
    lastA === lastB || lastA + 's' === lastB || lastB + 's' === lastA;
  if (lastClose && (firstA === firstB || firstA[0] === firstB[0])) {
    return true;
  }
  if (ta.length === 1 && tb.includes(ta[0])) return true;
  if (tb.length === 1 && ta.includes(tb[0])) return true;
  return false;
}

function findIn(list, person) {
  return list.find((other) => namesMatch(person.name, other.name)) || null;
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function main() {
  const writeCsv = process.argv.includes('--csv');
  const s3 = parseS3(readSheet(FILE_S3));
  const s4 = parseS4(readSheet(FILE_S4));

  const missingFromS4 = s3.filter((p) => !findIn(s4, p));
  const newInS4 = s4.filter((p) => !findIn(s3, p));

  missingFromS4.sort((a, b) => a.name.localeCompare(b.name));
  newInS4.sort((a, b) => a.name.localeCompare(b.name));

  console.log('JCPL 3 registrations (unique):', s3.length);
  console.log('JCPL 4 registrations (unique):', s4.length);
  console.log('Registered in JCPL 3 but NOT in JCPL 4:', missingFromS4.length);
  console.log('Registered in JCPL 4 but not in JCPL 3:', newInS4.length);
  console.log('');
  console.log('=== JCPL 3 players who have not registered for JCPL 4 ===');
  for (const [i, p] of missingFromS4.entries()) {
    const loc = [p.building, p.flat].filter(Boolean).join('-');
    console.log(
      `${String(i + 1).padStart(3, ' ')}. ${p.name.padEnd(28)}  ${String(p.gender || '-').padEnd(8)} ${String(p.age || '-').padEnd(4)} ${p.skill || '-'}  ${loc}`,
    );
  }

  const toSheetRows = (people) =>
    people.map((p, i) => ({
      '#': i + 1,
      Name: p.name,
      Gender: p.gender,
      Age: p.age,
      Category: p.category,
      Skill: p.skill,
      Building: p.building,
      Flat: p.flat,
      Phone: p.phone,
      Timestamp: p.timestamp,
    }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(toSheetRows(missingFromS4)),
    'JCPL3 not in JCPL4',
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(toSheetRows(newInS4)),
    'JCPL4 new players',
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet([
      { Metric: 'JCPL 3 unique registrations', Count: s3.length },
      { Metric: 'JCPL 4 unique registrations', Count: s4.length },
      { Metric: 'JCPL 3 but not JCPL 4', Count: missingFromS4.length },
      { Metric: 'JCPL 4 but not JCPL 3', Count: newInS4.length },
    ]),
    'Summary',
  );

  const xlsPath = path.join(ROOT, 'assets/JCPL 3 not registered in JCPL 4.xlsx');
  XLSX.writeFile(workbook, xlsPath);
  console.log('\nWrote', xlsPath);

  if (writeCsv) {
    const outDir = path.join(ROOT, 'cricheroes_data');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'jcpl3_not_registered_in_jcpl4.csv');
    const header = ['name', 'gender', 'age', 'skill', 'building', 'flat', 'phone', 'jcpl3_timestamp'];
    const lines = [
      header.join(','),
      ...missingFromS4.map((p) =>
        [p.name, p.gender, p.age, p.skill, p.building, p.flat, p.phone, p.timestamp]
          .map(csvEscape)
          .join(','),
      ),
    ];
    fs.writeFileSync(outPath, lines.join('\n'));
    console.log('Wrote', outPath);
  }
}

main();

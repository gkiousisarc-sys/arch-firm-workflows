#!/usr/bin/env node
/**
 * IMPORT SCRIPT — Peristeri project programme → Construction Platform
 *
 * Run from inside: construction-platform/
 *   node import_peristeri.js           ← dry-run / schema inspection
 *   node import_peristeri.js --commit  ← actually insert
 *
 * Inserts:
 *   - 12 zones (Greek names → label column)
 *   - 23 subcontractors (deduplicated)
 *   - 77 phases with planned_start/planned_end, multi-zone assignments
 *   - 5 dashboard tasks (inserted into phases table, responsible in notes)
 *
 * SAFE TO RE-RUN: skips zones/subs that already exist by name;
 *                 skips phases/tasks that already exist by name.
 */

const fs = require('fs');
const path = require('path');

// ---- locate the database -------------------------------------------------
const CANDIDATES = [
  'backend/data/construction.db',
  'backend/construction.db',
  'data/construction.db',
  'construction.db',
];
let DB_PATH = CANDIDATES.find(p => fs.existsSync(p));
if (!DB_PATH) {
  console.error('❌ Could not find construction.db. Looked in:', CANDIDATES);
  console.error('   Run this from inside the construction-platform/ folder.');
  process.exit(1);
}
console.log('✓ Using database:', DB_PATH);

// ---- open with node:sqlite (built into Node 22+) -------------------------
let DatabaseSync;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch (e) {
  console.error('❌ node:sqlite not available. Node 22+ is required.');
  process.exit(1);
}
const db = new DatabaseSync(DB_PATH);

// ---- load data -----------------------------------------------------------
const data = JSON.parse(fs.readFileSync('import_data.json', 'utf8'));

// ---- inspect schema ------------------------------------------------------
function cols(table) {
  try {
    return db.prepare(`PRAGMA table_info(${table})`).all().map(r => r.name);
  } catch { return null; }
}
function tableExists(t) {
  const r = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
  ).get(t);
  return !!r;
}

console.log('\n--- Tables found in DB ---');
const tables = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table'"
).all().map(r => r.name);
console.log(tables.join(', '));

const T = {
  zones:      tables.find(t => /zone/i.test(t) && !/phase/i.test(t)),
  subs:       tables.find(t => /sub|contractor/i.test(t)),
  phases:     tables.find(t => /phase/i.test(t) && !/zone|task|log/i.test(t)),
  phaseZones: tables.find(t => /phase.*zone|zone.*phase/i.test(t)),
};
console.log('\n--- Mapped tables ---');
console.log(T);
console.log('\nColumn details:');
for (const [k, t] of Object.entries(T)) {
  if (t) console.log(`  ${k} (${t}): ${cols(t).join(', ')}`);
}

// ---- schema assertions (printed so mismatches are obvious) ---------------
console.log('\n--- Schema checks ---');
const zCols   = cols(T.zones)      || [];
const pCols   = cols(T.phases)     || [];
const pzCols  = cols(T.phaseZones) || [];
const sCols   = cols(T.subs)       || [];

const check = (label, cond) =>
  console.log(`  ${cond ? '✓' : '✗'} ${label}`);

check('zones.label exists',           zCols.includes('label'));
check('zones.code exists',            zCols.includes('code'));
check('phases.planned_start exists',  pCols.includes('planned_start'));
check('phases.planned_end exists',    pCols.includes('planned_end'));
check('phases.subcontractor_id exists', pCols.includes('subcontractor_id'));
check('phase_zones.zone exists',      pzCols.includes('zone'));
check('phase_zones.phase_id exists',  pzCols.includes('phase_id'));
check('subcontractors.name exists',   sCols.includes('name'));

console.log('\n⚠️  This is a DRY RUN inspection. Review the above.');
console.log('To actually insert, run:  node import_peristeri.js --commit\n');

if (!process.argv.includes('--commit')) process.exit(0);

// ==========================================================================
// COMMIT MODE
// ==========================================================================
console.log('▶ Inserting data...\n');

db.exec('BEGIN');
try {

  // 1) ZONES  (zones.label = Greek name)
  const zoneCodes = new Set();
  for (const [code, label] of Object.entries(data.zones)) {
    const existing = db.prepare(
      `SELECT id FROM ${T.zones} WHERE code=? OR label=?`
    ).get(code, label);
    if (existing) {
      console.log(`  zones: skip "${code}" (already exists)`);
    } else {
      db.prepare(
        `INSERT INTO ${T.zones} (code, label) VALUES (?, ?)`
      ).run(code, label);
    }
    zoneCodes.add(code);
  }
  console.log(`✓ Zones ready: ${Object.keys(data.zones).length}`);

  // 2) SUBCONTRACTORS (from phases + task responsible parties)
  const subId = {};
  const allSubs = [
    ...new Set([
      ...data.phases.map(p => p.subcontractor),
      ...data.tasks.map(t => t.responsible),
    ])
  ].filter(s => s);
  for (const name of allSubs) {
    const existing = db.prepare(`SELECT id FROM ${T.subs} WHERE name=?`).get(name);
    if (existing) {
      subId[name] = existing.id;
    } else {
      const info = db.prepare(
        `INSERT INTO ${T.subs} (name, trade) VALUES (?, ?)`
      ).run(name, name);
      subId[name] = info.lastInsertRowid;
    }
  }
  console.log(`✓ Subcontractors ready: ${Object.keys(subId).length}`);

  // helper: insert or skip a phase, return its id
  function upsertPhase(name, subId, start, end, notes) {
    const existing = db.prepare(
      `SELECT id FROM ${T.phases} WHERE name=?`
    ).get(name);
    if (existing) {
      console.log(`  phases: skip "${name}" (already exists)`);
      return existing.id;
    }
    const info = db.prepare(
      `INSERT INTO ${T.phases}
         (name, subcontractor_id, planned_start, planned_end, status, progress, notes)
       VALUES (?, ?, ?, ?, 'Not Started', 0, ?)`
    ).run(name, subId, start, end, notes || null);
    return info.lastInsertRowid;
  }

  // helper: link a phase to a zone code (phase_zones.zone stores the code string)
  function linkZone(phaseId, zoneCode) {
    if (!zoneCodes.has(zoneCode)) return;
    const existing = db.prepare(
      `SELECT id FROM ${T.phaseZones} WHERE phase_id=? AND zone=?`
    ).get(phaseId, zoneCode);
    if (!existing) {
      db.prepare(
        `INSERT INTO ${T.phaseZones} (phase_id, zone, status) VALUES (?, ?, 'Not Started')`
      ).run(phaseId, zoneCode);
    }
  }

  // 3) PHASES (77 construction phases)
  let pCount = 0, zCount = 0;
  for (const ph of data.phases) {
    const sid = subId[ph.subcontractor] || null;
    const pid = upsertPhase(ph.name, sid, ph.start, ph.end, null);
    pCount++;
    for (const zc of ph.zones) {
      linkZone(pid, zc);
      zCount++;
    }
  }
  console.log(`✓ Phases inserted/verified: ${pCount}  |  zone-links: ${zCount}`);

  // 4) DASHBOARD TASKS (5 items — stored as phases; responsible mapped to subcontractor_id)
  let tCount = 0;
  for (const t of data.tasks) {
    const sid = subId[t.responsible] || null;
    const notes = t.group || null;
    upsertPhase(t.task, sid, t.start, t.end, notes);
    tCount++;
  }
  console.log(`✓ Dashboard tasks inserted/verified: ${tCount}`);

  db.exec('COMMIT');
  console.log('\n✅ Import committed successfully.');
} catch (e) {
  db.exec('ROLLBACK');
  console.error('\n❌ Import failed, rolled back:', e.message);
  process.exit(1);
}

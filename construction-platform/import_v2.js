'use strict';
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');

const DRY_RUN  = !process.argv.includes('--run');
const DB_PATH  = path.join(__dirname, 'backend', 'data', 'construction.db');
const JSON_PATH = path.join(__dirname, 'import_data_v2.json.txt');

const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

// ── Collect unique subcontractors from phases + tasks ─────────────────────
const subGroups = new Map(); // name -> id (filled after insert)
for (const p of data.phases) {
  if (!subGroups.has(p.group)) subGroups.set(p.group, null);
}
for (const t of data.tasks) {
  if (!subGroups.has(t.group)) subGroups.set(t.group, null);
}

console.log('\n══════════════════════════════════════════════════════════');
console.log(DRY_RUN ? '  DRY RUN  (pass --run to apply)' : '  IMPORTING DATA');
console.log('══════════════════════════════════════════════════════════\n');

// ── Dry-run: schema check ─────────────────────────────────────────────────
if (DRY_RUN) {
  const db = new DatabaseSync(DB_PATH);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
  console.log('DB tables found:', tables.join(', '));

  const phaseCols = db.prepare('PRAGMA table_info(phases)').all().map(c => c.name);
  console.log('phases columns :', phaseCols.join(', '));
  console.log('critical col   :', phaseCols.includes('critical') ? 'EXISTS' : 'MISSING — will be added');

  const zoneRows = db.prepare('SELECT code, label FROM zones ORDER BY id').all();
  console.log('\nExisting zones:');
  for (const z of zoneRows) console.log(`  ${z.code.padEnd(16)} ${z.label}`);

  const missing = Object.keys(data.zones).filter(code => !zoneRows.find(z => z.code === code));
  if (missing.length) console.log('\nMissing zones (will insert):', missing.join(', '));
  else console.log('\nAll zones present.');

  console.log('\n── Subcontractors to create (' + subGroups.size + ') ──');
  for (const name of subGroups.keys()) console.log('  ·', name);

  console.log('\n── Phases to import (' + data.phases.length + ') ──');
  for (const p of data.phases) {
    const crit  = p.critical ? ' ★ CRITICAL' : '';
    const dates = (p.start && p.end) ? `${p.start} → ${p.end}` : '(no dates)';
    console.log(`  [${p.group}] ${p.name}${crit}`);
    console.log(`    dates: ${dates}  zones: ${p.zones.join(', ')}`);
    if (p.note) console.log(`    note:  ${p.note}`);
  }

  console.log('\n── Milestone tasks to import (' + data.tasks.length + ') ──');
  for (const t of data.tasks) {
    console.log(`  [${t.group}] ${t.task}  ${t.start} → ${t.end}${t.critical ? ' ★' : ''}`);
    if (t.note) console.log(`    note: ${t.note}`);
  }

  console.log('\n→ Run with --run to apply.\n');
  process.exit(0);
}

// ── ACTUAL IMPORT ─────────────────────────────────────────────────────────
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');

// Migration: add critical column if missing
const phaseCols = db.prepare('PRAGMA table_info(phases)').all().map(c => c.name);
if (!phaseCols.includes('critical')) {
  db.exec('ALTER TABLE phases ADD COLUMN critical INTEGER DEFAULT 0');
  console.log('✓ Added critical column to phases');
}

// Wipe old data (order matters for FK integrity)
db.exec(`
  DELETE FROM phase_logs;
  DELETE FROM phase_tasks;
  DELETE FROM phase_zones;
  DELETE FROM phases;
  DELETE FROM subcontractors;
`);
console.log('✓ Cleared phases, phase_zones, phase_tasks, phase_logs, subcontractors');

// Update / insert zone labels
for (const [code, label] of Object.entries(data.zones)) {
  const existing = db.prepare('SELECT id FROM zones WHERE code=?').get(code);
  if (existing) {
    db.prepare('UPDATE zones SET label=? WHERE code=?').run(label, code);
  } else {
    db.prepare('INSERT INTO zones (code, label) VALUES (?, ?)').run(code, label);
    console.log(`✓ Inserted zone ${code}: ${label}`);
  }
}
console.log('✓ Zone labels updated');

// Create subcontractors
const insertSub = db.prepare('INSERT INTO subcontractors (name, trade, active) VALUES (?, ?, 1)');
for (const name of subGroups.keys()) {
  const r = insertSub.run(name, '');
  subGroups.set(name, Number(r.lastInsertRowid));
}
console.log(`✓ Created ${subGroups.size} subcontractors`);

// Import phases
const insertPhase = db.prepare(`
  INSERT INTO phases (subcontractor_id, name, planned_start, planned_end, status, progress, sort_order, notes, critical)
  VALUES (?, ?, ?, ?, 'not_started', 0, ?, ?, ?)
`);
const insertPZ = db.prepare(`INSERT INTO phase_zones (phase_id, zone, status) VALUES (?, ?, 'not_started')`);

const sortCounters = {};

for (const p of data.phases) {
  const subId = subGroups.get(p.group);
  if (!(subId in sortCounters)) sortCounters[subId] = 0;
  const so = sortCounters[subId]++;

  const r = insertPhase.run(subId, p.name, p.start || '', p.end || '', so, p.note || '', p.critical ? 1 : 0);
  const phaseId = Number(r.lastInsertRowid);

  for (const zone of p.zones) {
    insertPZ.run(phaseId, zone);
  }
}
console.log(`✓ Imported ${data.phases.length} phases`);

// Import milestone tasks
for (const t of data.tasks) {
  const subId = subGroups.get(t.group);
  if (!(subId in sortCounters)) sortCounters[subId] = 0;
  const so = sortCounters[subId]++;

  insertPhase.run(subId, t.task, t.start || '', t.end || '', so, t.note || '', t.critical ? 1 : 0);
}
console.log(`✓ Imported ${data.tasks.length} milestone tasks`);

console.log('\n✓ Import complete.\n');

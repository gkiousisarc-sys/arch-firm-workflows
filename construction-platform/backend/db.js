const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs   = require('fs');
const HOLIDAYS = require('./holidays');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'construction.db'));
db.exec('PRAGMA journal_mode = WAL');

function initDB() {
  // ── Core tables ──────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS project (
      id          INTEGER PRIMARY KEY,
      name        TEXT    DEFAULT '',
      address     TEXT    DEFAULT '',
      start_date  TEXT    DEFAULT '',
      budget      REAL    DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS zones (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      code             TEXT NOT NULL,
      label            TEXT NOT NULL,
      floor_area       REAL DEFAULT 0,
      ceiling_height   REAL DEFAULT 0,
      slab_area        REAL DEFAULT 0,
      materials_notes  TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS subcontractors (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT NOT NULL,
      trade          TEXT DEFAULT '',
      contact_person TEXT DEFAULT '',
      phone          TEXT DEFAULT '',
      contract_type  TEXT DEFAULT 'Daily Rate',
      rate           REAL DEFAULT 0,
      assigned_zones TEXT DEFAULT '[]',
      planned_start  TEXT DEFAULT '',
      planned_end    TEXT DEFAULT '',
      delay_buffer   REAL DEFAULT 10,
      active         INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS holidays (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      date  TEXT UNIQUE NOT NULL,
      name  TEXT NOT NULL,
      type  TEXT DEFAULT 'fixed'
    );

    CREATE TABLE IF NOT EXISTS phases (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      subcontractor_id INTEGER NOT NULL,
      name             TEXT NOT NULL,
      zone             TEXT DEFAULT '',
      planned_start    TEXT DEFAULT '',
      planned_end      TEXT DEFAULT '',
      status           TEXT DEFAULT 'not_started',
      progress         INTEGER DEFAULT 0,
      sort_order       INTEGER DEFAULT 0,
      notes            TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS phase_zones (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      phase_id INTEGER NOT NULL,
      zone     TEXT NOT NULL,
      status   TEXT DEFAULT 'not_started',
      UNIQUE(phase_id, zone)
    );

    CREATE TABLE IF NOT EXISTS phase_tasks (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      phase_id  INTEGER NOT NULL,
      task_type TEXT NOT NULL,
      done      INTEGER DEFAULT 0,
      UNIQUE(phase_id, task_type)
    );

    CREATE TABLE IF NOT EXISTS order_tasks (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id  INTEGER NOT NULL,
      task_type TEXT NOT NULL,
      done      INTEGER DEFAULT 0,
      UNIQUE(order_id, task_type)
    );

    CREATE TABLE IF NOT EXISTS phase_logs (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      phase_id  INTEGER NOT NULL,
      log_date  TEXT NOT NULL,
      progress  INTEGER DEFAULT 0,
      notes     TEXT DEFAULT '',
      workers   INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT NOT NULL,
      category       TEXT DEFAULT 'Other',
      contact_person TEXT DEFAULT '',
      phone          TEXT DEFAULT '',
      email          TEXT DEFAULT '',
      payment_terms  TEXT DEFAULT '',
      notes          TEXT DEFAULT '',
      active         INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS orders (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      material           TEXT NOT NULL DEFAULT '',
      supplier_id        INTEGER,
      subcontractor_id   INTEGER,
      quantity           TEXT DEFAULT '',
      unit               TEXT DEFAULT '',
      unit_price         REAL DEFAULT 0,
      order_date         TEXT DEFAULT '',
      confirmed_delivery TEXT DEFAULT '',
      actual_delivery    TEXT DEFAULT '',
      installation_start TEXT DEFAULT '',
      status             TEXT DEFAULT 'Ordered',
      notes              TEXT DEFAULT '',
      active             INTEGER DEFAULT 1
    );
  `);

  // ── Migrations: add columns to phases if missing ────────────────────────────
  const phaseCols = db.prepare('PRAGMA table_info(phases)').all().map(c => c.name);
  if (!phaseCols.includes('notes')) {
    db.exec("ALTER TABLE phases ADD COLUMN notes TEXT DEFAULT ''");
  }
  if (!phaseCols.includes('critical')) {
    db.exec('ALTER TABLE phases ADD COLUMN critical INTEGER DEFAULT 0');
  }

  // ── Migrations: add columns to orders if schema was created before Phase 2 ─
  const orderCols = db.prepare("PRAGMA table_info(orders)").all().map(c => c.name);
  if (!orderCols.includes('material')) {
    db.exec("ALTER TABLE orders ADD COLUMN material TEXT NOT NULL DEFAULT ''");
  }
  if (!orderCols.includes('quantity')) {
    db.exec("ALTER TABLE orders ADD COLUMN quantity TEXT DEFAULT ''");
  }
  if (!orderCols.includes('unit')) {
    db.exec("ALTER TABLE orders ADD COLUMN unit TEXT DEFAULT ''");
  }
  if (!orderCols.includes('unit_price')) {
    db.exec('ALTER TABLE orders ADD COLUMN unit_price REAL DEFAULT 0');
  }

  // ── Seed single project row ──────────────────────────────────────────────
  if (!db.prepare('SELECT id FROM project WHERE id = 1').get()) {
    db.prepare('INSERT INTO project (id) VALUES (1)').run();
  }

  // ── Seed base zones ──────────────────────────────────────────────────────
  const zoneCount = db.prepare('SELECT COUNT(*) AS c FROM zones').get().c;
  if (zoneCount === 0) {
    const baseZones = [
      { code: 'B0',    label: 'Basement'  },
      { code: 'L1',    label: 'Level 1'   },
      { code: 'L2',    label: 'Level 2'   },
      { code: 'L3',    label: 'Level 3'   },
      { code: 'L4',    label: 'Level 4'   },
      { code: 'STAIR', label: 'Staircase' },
      { code: 'LIFT',  label: 'Elevator'  },
      { code: 'ROOF',  label: 'Roof'      },
    ];
    const ins = db.prepare('INSERT INTO zones (code, label) VALUES (?, ?)');
    for (const z of baseZones) ins.run(z.code, z.label);
  }

  // ── Add extra zones if missing ────────────────────────────────────────────
  for (const z of [
    { code: 'EXTERIOR-FRONT', label: 'Πιλοτή' },
    { code: 'EXTERIOR-BACK',  label: 'Ακάλυπτος' },
    { code: 'FACADE',         label: 'Όψη Ναούσης/Ιωαννίνων' },
    { code: 'BALCONIES',      label: 'Εξώστες' },
  ]) {
    if (!db.prepare('SELECT id FROM zones WHERE code = ?').get(z.code)) {
      db.prepare('INSERT INTO zones (code, label) VALUES (?, ?)').run(z.code, z.label);
    }
  }

  // ── Seed holidays ────────────────────────────────────────────────────────
  if (db.prepare('SELECT COUNT(*) AS c FROM holidays').get().c === 0) {
    const ins = db.prepare('INSERT OR IGNORE INTO holidays (date, name, type) VALUES (?, ?, ?)');
    for (const h of HOLIDAYS) ins.run(h.date, h.name, h.type);
  }
}

module.exports = { db, initDB };

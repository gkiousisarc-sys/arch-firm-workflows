const express = require('express');
const router  = express.Router();
const { db }  = require('../db');

const DEFAULT_PHASES = {
  'Concrete & Formwork':  ['Excavation & Groundwork', 'Foundation Concrete', 'Slab Formwork & Pour', 'Column & Beam Formwork', 'Column & Beam Pour', 'Stripping & Cleanup'],
  'Steel Reinforcement':  ['Cut & Bend', 'Foundation Rebar', 'Slab Rebar', 'Column & Beam Rebar', 'Inspection & Sign-off'],
  'Masonry':              ['External Block Walls', 'Internal Partition Walls', 'Final Infill & Lintels'],
  'Plumbing':             ['Below-slab Drainage', 'Supply Pipe Rough-in', 'Second Fix', 'Sanitary Fixtures'],
  'Electrical':           ['Conduit & Cable Rough-in', 'Distribution Board', 'Second Fix Wiring', 'Sockets & Switches', 'Final Testing'],
  'Plastering':           ['Surface Preparation', 'Scratch Coat', 'Base Coat', 'Finish Coat'],
  'Tiling':               ['Floor Screed', 'Floor Tiling', 'Wall Tiling', 'Grouting & Sealing'],
  'Carpentry':            ['Door Frames', 'Internal Doors', 'Built-ins & Wardrobes', 'Skirting & Trim'],
  'Aluminum Works':       ['Window Frames', 'Window Glazing', 'Exterior Doors', 'Balcony Railings & Sealing'],
  'Marble & Stone':       ['Base Preparation', 'Floor Marble', 'Stair Marble', 'Wall Cladding', 'Final Polish & Sealing'],
  'Waterproofing':        ['Surface Preparation', 'Primer Application', 'Primary Membrane', 'Secondary Layer', 'Testing & Inspection'],
  'Elevator':             ['Shaft Preparation', 'Guide Rail Installation', 'Drive Mechanism', 'Cabin Installation', 'Testing & Certification'],
  'Painting':             ['Surface Preparation', 'Primer', 'First Coat', 'Final Coat & Touch-up'],
  'Insulation':           ['External Wall Insulation', 'Internal Wall Insulation', 'Roof & Floor Insulation'],
  'Other':                ['Phase 1', 'Phase 2', 'Phase 3'],
};

// List phases — all or filtered by subcontractor
router.get('/phases', (req, res) => {
  const { subcontractor_id } = req.query;
  const rows = subcontractor_id
    ? db.prepare('SELECT * FROM phases WHERE subcontractor_id = ? ORDER BY sort_order, id').all(Number(subcontractor_id))
    : db.prepare('SELECT * FROM phases ORDER BY subcontractor_id, sort_order, id').all();
  res.json(rows);
});

// Create a phase
router.post('/phases', (req, res) => {
  const { subcontractor_id, name, zone = '', planned_start = '', planned_end = '',
          status = 'not_started', progress = 0, sort_order = 0 } = req.body;
  const result = db.prepare(`
    INSERT INTO phases (subcontractor_id, name, zone, planned_start, planned_end, status, progress, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(Number(subcontractor_id), name, zone, planned_start, planned_end, status, Number(progress), Number(sort_order));
  res.json({ id: Number(result.lastInsertRowid) });
});

// Generate default phases for a subcontractor (idempotent — skips if phases exist)
router.post('/phases/generate/:subcontractor_id', (req, res) => {
  const subId = Number(req.params.subcontractor_id);
  const sub = db.prepare('SELECT * FROM subcontractors WHERE id = ?').get(subId);
  if (!sub) return res.status(404).json({ error: 'Subcontractor not found' });

  const existing = db.prepare('SELECT COUNT(*) AS c FROM phases WHERE subcontractor_id = ?').get(subId).c;
  if (existing > 0) {
    return res.json(db.prepare('SELECT * FROM phases WHERE subcontractor_id = ? ORDER BY sort_order, id').all(subId));
  }

  const names = DEFAULT_PHASES[sub.trade] || DEFAULT_PHASES['Other'];
  const ins   = db.prepare(
    'INSERT INTO phases (subcontractor_id, name, zone, planned_start, planned_end, status, progress, sort_order) VALUES (?,?,?,?,?,?,?,?)'
  );

  const startD = sub.planned_start ? new Date(sub.planned_start) : null;
  const endD   = sub.planned_end   ? new Date(sub.planned_end)   : null;

  names.forEach((name, i) => {
    let pStart = '', pEnd = '';
    if (startD && endD) {
      const totalMs  = endD - startD;
      const sliceMs  = totalMs / names.length;
      const s = new Date(startD.getTime() + sliceMs * i);
      const e = new Date(startD.getTime() + sliceMs * (i + 1) - 86400000);
      pStart = s.toISOString().slice(0, 10);
      pEnd   = e.toISOString().slice(0, 10);
    }
    ins.run(subId, name, '', pStart, pEnd, 'not_started', 0, i);
  });

  const phases = db.prepare('SELECT * FROM phases WHERE subcontractor_id = ? ORDER BY sort_order, id').all(subId);
  res.json(phases);
});

// Update a phase
router.put('/phases/:id', (req, res) => {
  const { name, zone = '', planned_start = '', planned_end = '',
          status = 'not_started', progress = 0, sort_order = 0, notes = '' } = req.body;
  db.prepare(`
    UPDATE phases SET name=?, zone=?, planned_start=?, planned_end=?, status=?, progress=?, sort_order=?, notes=?
    WHERE id=?
  `).run(name, zone, planned_start, planned_end, status, Number(progress), Number(sort_order), notes, Number(req.params.id));
  res.json({ ok: true });
});

// Patch notes only
router.patch('/phases/:id/notes', (req, res) => {
  db.prepare('UPDATE phases SET notes=? WHERE id=?').run(req.body.notes || '', Number(req.params.id));
  res.json({ ok: true });
});

// ── Zone assignments ──────────────────────────────────────────────────────────

router.get('/phases/:id/zones', (req, res) => {
  res.json(db.prepare('SELECT * FROM phase_zones WHERE phase_id=? ORDER BY zone').all(Number(req.params.id)));
});

router.post('/phases/:id/zones', (req, res) => {
  const phaseId = Number(req.params.id);
  const zones   = req.body.zones || [];
  db.prepare('DELETE FROM phase_zones WHERE phase_id=?').run(phaseId);
  const ins = db.prepare('INSERT INTO phase_zones (phase_id, zone, status) VALUES (?,?,?)');
  for (const z of zones) ins.run(phaseId, z.zone, z.status || 'not_started');
  res.json({ ok: true });
});

router.put('/phases/:id/zones/:zone', (req, res) => {
  const phaseId = Number(req.params.id);
  db.prepare('INSERT OR REPLACE INTO phase_zones (phase_id, zone, status) VALUES (?,?,?)').run(phaseId, req.params.zone, req.body.status || 'not_started');
  res.json({ ok: true });
});

// ── Task checkboxes ───────────────────────────────────────────────────────────
const TASK_TYPES = ['blueprint', 'approval', 'order_delivery', 'deal', 'contract'];

router.get('/phases/:id/tasks', (req, res) => {
  const phaseId  = Number(req.params.id);
  const existing = db.prepare('SELECT task_type, done FROM phase_tasks WHERE phase_id=?').all(phaseId);
  const map = {};
  for (const r of existing) map[r.task_type] = r.done;
  res.json(TASK_TYPES.map(t => ({ task_type: t, done: map[t] ?? 0 })));
});

router.put('/phases/:id/tasks/:type', (req, res) => {
  const phaseId = Number(req.params.id);
  db.prepare('INSERT OR REPLACE INTO phase_tasks (phase_id, task_type, done) VALUES (?,?,?)').run(phaseId, req.params.type, req.body.done ? 1 : 0);
  res.json({ ok: true });
});

// ── All phase-zone rows (for GanttBySpace) ────────────────────────────────────

router.get('/phase-zones', (req, res) => {
  const rows = db.prepare(`
    SELECT pz.id, pz.phase_id, pz.zone, pz.status,
           p.name AS phase_name, p.planned_start, p.planned_end, p.progress, p.notes,
           p.subcontractor_id, sc.name AS sub_name, sc.trade
    FROM phase_zones pz
    JOIN phases p ON pz.phase_id = p.id
    JOIN subcontractors sc ON p.subcontractor_id = sc.id
    ORDER BY pz.zone, p.planned_start
  `).all();
  res.json(rows);
});

// ── Pending tasks (Dashboard) ─────────────────────────────────────────────────

router.get('/tasks/pending', (req, res) => {
  const phases = db.prepare(`
    SELECT p.id, p.name, p.planned_start, p.subcontractor_id,
           sc.name AS sub_name,
           GROUP_CONCAT(DISTINCT pz.zone) AS zones
    FROM phases p
    JOIN subcontractors sc ON p.subcontractor_id = sc.id
    LEFT JOIN phase_zones pz ON pz.phase_id = p.id
    WHERE p.planned_start IS NOT NULL AND p.planned_start != ''
    GROUP BY p.id
    ORDER BY p.planned_start
  `).all();

  const doneTasks = db.prepare('SELECT phase_id, task_type FROM phase_tasks WHERE done=1').all();
  const doneSet   = new Set(doneTasks.map(r => `${r.phase_id}::${r.task_type}`));

  const result = [];
  for (const phase of phases) {
    for (const t of TASK_TYPES) {
      if (!doneSet.has(`${phase.id}::${t}`)) {
        result.push({
          phase_id: phase.id,
          phase_name: phase.name,
          sub_name: phase.sub_name,
          planned_start: phase.planned_start,
          zones: phase.zones || '',
          task_type: t,
        });
      }
    }
  }
  res.json(result);
});

// Delete a phase (also deletes its logs)
router.delete('/phases/:id', (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM phase_logs WHERE phase_id = ?').run(id);
  db.prepare('DELETE FROM phases WHERE id = ?').run(id);
  res.json({ ok: true });
});

// Get logs for a phase
router.get('/phases/:id/logs', (req, res) => {
  const logs = db.prepare('SELECT * FROM phase_logs WHERE phase_id = ? ORDER BY log_date DESC, id DESC').all(Number(req.params.id));
  res.json(logs);
});

// Add a log entry — also syncs phase progress + status
router.post('/phases/:id/logs', (req, res) => {
  const phaseId = Number(req.params.id);
  const { log_date, progress = 0, notes = '', workers = 0 } = req.body;

  const result = db.prepare(`
    INSERT INTO phase_logs (phase_id, log_date, progress, notes, workers) VALUES (?,?,?,?,?)
  `).run(phaseId, log_date, Number(progress), notes, Number(workers));

  // Sync phase progress + status from latest log
  const newStatus = progress >= 100 ? 'complete' : progress > 0 ? 'in_progress' : 'not_started';
  db.prepare('UPDATE phases SET progress=?, status=? WHERE id=?').run(Number(progress), newStatus, phaseId);

  res.json({ id: Number(result.lastInsertRowid) });
});

// Delete a log entry
router.delete('/phase-logs/:id', (req, res) => {
  db.prepare('DELETE FROM phase_logs WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

module.exports = router;

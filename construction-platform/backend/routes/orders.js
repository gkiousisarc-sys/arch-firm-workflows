const express = require('express');
const router  = express.Router();
const { db }  = require('../db');

const ORDER_TASK_TYPES = ['order', 'resources', 'payment', 'delivery'];

function enrich(row) {
  const days_late =
    row.actual_delivery && row.confirmed_delivery && row.actual_delivery > row.confirmed_delivery
      ? Math.round((new Date(row.actual_delivery) - new Date(row.confirmed_delivery)) / 86400000)
      : 0;
  const delivery_alert =
    !!(row.confirmed_delivery && row.installation_start &&
       row.confirmed_delivery > row.installation_start &&
       row.status !== 'Delivered' && row.status !== 'Installed');
  return { ...row, days_late, delivery_alert };
}

// ── Pending tasks (specific routes before :id) ────────────────────────────

router.get('/orders/tasks/pending', (req, res) => {
  const orders = db.prepare(`
    SELECT o.id, o.material, o.confirmed_delivery,
           s.name AS supplier_name
    FROM orders o
    LEFT JOIN suppliers s ON o.supplier_id = s.id
    WHERE o.active = 1
      AND o.confirmed_delivery IS NOT NULL
      AND o.confirmed_delivery != ''
    ORDER BY o.confirmed_delivery
  `).all();

  const doneTasks = db.prepare('SELECT order_id, task_type FROM order_tasks WHERE done=1').all();
  const doneSet   = new Set(doneTasks.map(r => `${r.order_id}::${r.task_type}`));

  const result = [];
  for (const o of orders) {
    for (const t of ORDER_TASK_TYPES) {
      if (!doneSet.has(`${o.id}::${t}`)) {
        result.push({
          order_id:           o.id,
          material:           o.material,
          supplier_name:      o.supplier_name || '',
          confirmed_delivery: o.confirmed_delivery,
          task_type:          t,
        });
      }
    }
  }
  res.json(result);
});

// ── Per-order tasks ───────────────────────────────────────────────────────

router.get('/orders/:id/tasks', (req, res) => {
  const orderId  = Number(req.params.id);
  const existing = db.prepare('SELECT task_type, done FROM order_tasks WHERE order_id=?').all(orderId);
  const map = {};
  for (const r of existing) map[r.task_type] = r.done;
  res.json(ORDER_TASK_TYPES.map(t => ({ task_type: t, done: map[t] ?? 0 })));
});

router.put('/orders/:id/tasks/:type', (req, res) => {
  const orderId = Number(req.params.id);
  db.prepare('INSERT OR REPLACE INTO order_tasks (order_id, task_type, done) VALUES (?,?,?)').run(orderId, req.params.type, req.body.done ? 1 : 0);
  res.json({ ok: true });
});

router.patch('/orders/:id/notes', (req, res) => {
  db.prepare('UPDATE orders SET notes=? WHERE id=?').run(req.body.notes || '', Number(req.params.id));
  res.json({ ok: true });
});

// ── Orders CRUD ───────────────────────────────────────────────────────────

router.get('/orders', (req, res) => {
  const rows = db.prepare(`
    SELECT o.*,
           s.name  AS supplier_name,
           sc.name AS subcontractor_name
    FROM orders o
    LEFT JOIN suppliers      s  ON o.supplier_id      = s.id
    LEFT JOIN subcontractors sc ON o.subcontractor_id = sc.id
    WHERE o.active = 1
    ORDER BY o.id DESC
  `).all();
  res.json(rows.map(enrich));
});

router.post('/orders', (req, res) => {
  const { material = '', supplier_id = null, subcontractor_id = null,
          quantity = '', unit = '', unit_price = 0,
          order_date = '', confirmed_delivery = '', actual_delivery = '',
          installation_start = '', status = 'Ordered', notes = '' } = req.body;
  const r = db.prepare(`
    INSERT INTO orders
      (material, supplier_id, subcontractor_id, quantity, unit, unit_price,
       order_date, confirmed_delivery, actual_delivery, installation_start, status, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(material, supplier_id, subcontractor_id, quantity, unit, Number(unit_price),
         order_date, confirmed_delivery, actual_delivery, installation_start, status, notes);
  res.json({ id: Number(r.lastInsertRowid) });
});

router.put('/orders/:id', (req, res) => {
  const { material = '', supplier_id = null, subcontractor_id = null,
          quantity = '', unit = '', unit_price = 0,
          order_date = '', confirmed_delivery = '', actual_delivery = '',
          installation_start = '', status = 'Ordered', notes = '' } = req.body;
  db.prepare(`
    UPDATE orders
    SET material=?, supplier_id=?, subcontractor_id=?, quantity=?, unit=?, unit_price=?,
        order_date=?, confirmed_delivery=?, actual_delivery=?, installation_start=?, status=?, notes=?
    WHERE id=?
  `).run(material, supplier_id, subcontractor_id, quantity, unit, Number(unit_price),
         order_date, confirmed_delivery, actual_delivery, installation_start, status, notes,
         Number(req.params.id));
  res.json({ ok: true });
});

router.delete('/orders/:id', (req, res) => {
  db.prepare('UPDATE orders SET active=0 WHERE id=?').run(Number(req.params.id));
  res.json({ ok: true });
});

module.exports = router;

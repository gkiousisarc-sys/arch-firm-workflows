const express = require('express');
const router  = express.Router();
const { db }  = require('../db');

const parse = row => ({ ...row, assigned_zones: JSON.parse(row.assigned_zones || '[]') });

router.get('/subcontractors', (req, res) => {
  const rows = db.prepare('SELECT * FROM subcontractors WHERE active=1 ORDER BY id').all();
  res.json(rows.map(parse));
});

router.post('/subcontractors', (req, res) => {
  const {
    name, trade = '', contact_person = '', phone = '',
    contract_type = 'Daily Rate', rate = 0,
    assigned_zones = [], planned_start = '', planned_end = '',
    delay_buffer = 10,
  } = req.body;

  const result = db.prepare(`
    INSERT INTO subcontractors
      (name, trade, contact_person, phone, contract_type, rate,
       assigned_zones, planned_start, planned_end, delay_buffer)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(name, trade, contact_person, phone, contract_type, rate,
         JSON.stringify(assigned_zones), planned_start, planned_end, delay_buffer);

  res.json({ id: Number(result.lastInsertRowid) });
});

router.put('/subcontractors/:id', (req, res) => {
  const {
    name, trade = '', contact_person = '', phone = '',
    contract_type = 'Daily Rate', rate = 0,
    assigned_zones = [], planned_start = '', planned_end = '',
    delay_buffer = 10,
  } = req.body;

  db.prepare(`
    UPDATE subcontractors
    SET name=?, trade=?, contact_person=?, phone=?, contract_type=?, rate=?,
        assigned_zones=?, planned_start=?, planned_end=?, delay_buffer=?
    WHERE id=?
  `).run(name, trade, contact_person, phone, contract_type, rate,
         JSON.stringify(assigned_zones), planned_start, planned_end, delay_buffer,
         req.params.id);

  res.json({ ok: true });
});

router.delete('/subcontractors/:id', (req, res) => {
  db.prepare('UPDATE subcontractors SET active=0 WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;

const express = require('express');
const router  = express.Router();
const { db }  = require('../db');

router.get('/suppliers', (req, res) => {
  res.json(db.prepare('SELECT * FROM suppliers WHERE active=1 ORDER BY name').all());
});

router.post('/suppliers', (req, res) => {
  const { name, category = 'Other', contact_person = '', phone = '', email = '',
          payment_terms = '', notes = '' } = req.body;
  const r = db.prepare(`
    INSERT INTO suppliers (name, category, contact_person, phone, email, payment_terms, notes)
    VALUES (?,?,?,?,?,?,?)
  `).run(name, category, contact_person, phone, email, payment_terms, notes);
  res.json({ id: Number(r.lastInsertRowid) });
});

router.put('/suppliers/:id', (req, res) => {
  const { name, category = 'Other', contact_person = '', phone = '', email = '',
          payment_terms = '', notes = '' } = req.body;
  db.prepare(`
    UPDATE suppliers SET name=?, category=?, contact_person=?, phone=?, email=?, payment_terms=?, notes=?
    WHERE id=?
  `).run(name, category, contact_person, phone, email, payment_terms, notes, Number(req.params.id));
  res.json({ ok: true });
});

router.delete('/suppliers/:id', (req, res) => {
  db.prepare('UPDATE suppliers SET active=0 WHERE id=?').run(Number(req.params.id));
  res.json({ ok: true });
});

module.exports = router;

const express = require('express');
const router  = express.Router();
const { db }  = require('../db');

router.get('/project', (req, res) => {
  const project = db.prepare('SELECT * FROM project WHERE id = 1').get();
  const zones   = db.prepare('SELECT * FROM zones ORDER BY id').all();
  res.json({ ...project, zones });
});

router.put('/project', (req, res) => {
  const { name = '', address = '', start_date = '', budget = 0 } = req.body;
  db.prepare(
    'UPDATE project SET name=?, address=?, start_date=?, budget=? WHERE id=1'
  ).run(name, address, start_date, budget);
  res.json({ ok: true });
});

router.put('/project/zones', (req, res) => {
  const { zones = [] } = req.body;
  const upd = db.prepare(
    'UPDATE zones SET floor_area=?, ceiling_height=?, slab_area=?, materials_notes=? WHERE id=?'
  );
  for (const z of zones) {
    upd.run(z.floor_area || 0, z.ceiling_height || 0, z.slab_area || 0, z.materials_notes || '', z.id);
  }
  res.json({ ok: true });
});

module.exports = router;

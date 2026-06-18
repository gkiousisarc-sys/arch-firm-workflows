const express = require('express');
const router  = express.Router();
const { db }  = require('../db');

router.get('/holidays', (req, res) => {
  const holidays = db.prepare('SELECT * FROM holidays ORDER BY date').all();
  res.json(holidays);
});

module.exports = router;

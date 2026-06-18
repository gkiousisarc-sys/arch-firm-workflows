const express = require('express');
const cors    = require('cors');
const { initDB } = require('./db');

const projectRoutes       = require('./routes/project');
const subcontractorRoutes = require('./routes/subcontractors');
const holidayRoutes       = require('./routes/holidays');
const phasesRoutes        = require('./routes/phases');
const suppliersRoutes     = require('./routes/suppliers');
const ordersRoutes        = require('./routes/orders');

const app  = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.use('/api', projectRoutes);
app.use('/api', subcontractorRoutes);
app.use('/api', holidayRoutes);
app.use('/api', phasesRoutes);
app.use('/api', suppliersRoutes);
app.use('/api', ordersRoutes);

initDB();

app.listen(PORT, () => {
  console.log(`\n  Construction Platform API  →  http://localhost:${PORT}\n`);
});

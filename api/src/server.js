require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const db = require('./db');

const app = express();
app.use(helmet(), cors(), express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/health/db', async (req, res) => {
  try {
    const r = await db.query('SELECT COUNT(*) FROM medications');
    res.json({ database: 'connected', medications: Number(r.rows[0].count) });
  } catch (e) {
    res.status(500).json({ database: 'error', message: e.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('API running on port ' + port));
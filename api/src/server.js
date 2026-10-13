require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const db = require('./db');
const { requireAuth } = require('./auth');
const v = require('./validators');

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

const api = express.Router();
api.use(requireAuth);

api.post('/auth/sync', async (req, res) => {
  const email = req.firebaseUser.email;
  const parts = (req.firebaseUser.name || email.split('@')[0]).split(' ');
  const first = (req.body.first_name || parts[0]).trim();
  const last = (req.body.last_name || parts.slice(1).join(' ') || '-').trim();
  const { rows } = await db.query(
    `INSERT INTO users (firebase_uid, email, first_name, last_name)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (firebase_uid) DO UPDATE SET email = EXCLUDED.email
     RETURNING user_id, email, first_name, last_name, phone_number, role`,
    [req.firebaseUser.uid, email, first, last]);
  await db.query('INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [rows[0].user_id]);
  res.json(rows[0]);
});

api.get('/users/me', (req, res) => {
  if (!req.user) return res.status(404).json({ error: 'Call /auth/sync first' });
  const { user_id, email, first_name, last_name, phone_number, role } = req.user;
  res.json({ user_id, email, first_name, last_name, phone_number, role });
});

api.put('/users/me', async (req, res) => {
  if (!req.user) return res.status(404).json({ error: 'Call /auth/sync first' });
  const errors = v.validateProfile(req.body);
  if (errors.length) return res.status(400).json({ errors });
  const b = req.body;
  const { rows } = await db.query(
    `UPDATE users SET first_name=$1, last_name=$2, phone_number=$3 WHERE user_id=$4
     RETURNING user_id, email, first_name, last_name, phone_number, role`,
    [b.first_name.trim(), b.last_name.trim(), b.phone_number ? b.phone_number.trim() : null, req.user.user_id]);
  res.json(rows[0]);
});

api.get('/users/me/settings', async (req, res) => {
  if (!req.user) return res.status(404).json({ error: 'Call /auth/sync first' });
  const { rows } = await db.query(
    'SELECT notifications_enabled, dark_mode, language FROM user_settings WHERE user_id=$1', [req.user.user_id]);
  res.json(rows[0]);
});

api.put('/users/me/settings', async (req, res) => {
  if (!req.user) return res.status(404).json({ error: 'Call /auth/sync first' });
  const { notifications_enabled, dark_mode, language } = req.body;
  if (typeof notifications_enabled !== 'boolean' || typeof dark_mode !== 'boolean'
      || !['en', 'zu', 'af', 'st'].includes(language))
    return res.status(400).json({ errors: ['Invalid settings'] });
  const { rows } = await db.query(
    `UPDATE user_settings SET notifications_enabled=$1, dark_mode=$2, language=$3
     WHERE user_id=$4 RETURNING notifications_enabled, dark_mode, language`,
    [notifications_enabled, dark_mode, language, req.user.user_id]);
  res.json(rows[0]);
});

app.use('/api', api);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('API running on port ' + port));
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const db = require('./db');
const { requireAuth, requireRole } = require('./auth');
const v = require('./validators');

const app = express();
app.use(helmet(), cors(), express.json());

const STAFF = ['receptionist', 'doctor', 'nurse', 'pharmacist', 'billing_clerk', 'manager', 'admin'];
const CAN_EDIT_PATIENTS = ['receptionist', 'doctor', 'nurse', 'admin'];

// ---------- Public health checks ----------
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/health/db', async (req, res) => {
  try {
    const r = await db.query('SELECT COUNT(*) FROM medications');
    res.json({ database: 'connected', medications: Number(r.rows[0].count) });
  } catch (e) {
    res.status(500).json({ database: 'error', message: e.message });
  }
});

// ---------- Everything below needs a valid login ----------
const api = express.Router();
api.use(requireAuth);

// Creates the users row the first time someone logs in
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

// ---------- Profile ----------
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

// ---------- Settings ----------
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

// ---------- Patients ----------
api.get('/patients', requireRole(...STAFF), async (req, res) => {
  const q = `%${(req.query.search || '').trim()}%`;
  const { rows } = await db.query(
    `SELECT * FROM patients
     WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR phone_number ILIKE $1
     ORDER BY patient_id DESC`, [q]);
  res.json(rows);
});

api.get('/patients/:id', requireRole(...STAFF), async (req, res) => {
  const { rows } = await db.query('SELECT * FROM patients WHERE patient_id = $1', [req.params.id]);
  rows[0] ? res.json(rows[0]) : res.status(404).json({ error: 'Patient not found' });
});

api.post('/patients', requireRole(...CAN_EDIT_PATIENTS), async (req, res) => {
  const errors = v.validatePatient(req.body);
  if (errors.length) return res.status(400).json({ errors });
  const b = req.body;
  const { rows } = await db.query(
    `INSERT INTO patients (first_name, last_name, gender, date_of_birth, phone_number, address, medical_aid)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [b.first_name.trim(), b.last_name.trim(), b.gender, b.date_of_birth,
     b.phone_number.trim(), b.address.trim(), b.medical_aid || null]);
  res.status(201).json(rows[0]);
});

api.put('/patients/:id', requireRole(...CAN_EDIT_PATIENTS), async (req, res) => {
  const errors = v.validatePatient(req.body);
  if (errors.length) return res.status(400).json({ errors });
  const b = req.body;
  const { rows } = await db.query(
    `UPDATE patients SET first_name=$1, last_name=$2, gender=$3, date_of_birth=$4,
       phone_number=$5, address=$6, medical_aid=$7
     WHERE patient_id=$8 RETURNING *`,
    [b.first_name.trim(), b.last_name.trim(), b.gender, b.date_of_birth,
     b.phone_number.trim(), b.address.trim(), b.medical_aid || null, req.params.id]);
  rows[0] ? res.json(rows[0]) : res.status(404).json({ error: 'Patient not found' });
});

api.delete('/patients/:id', requireRole('admin'), async (req, res) => {
  try {
    const r = await db.query('DELETE FROM patients WHERE patient_id = $1', [req.params.id]);
    r.rowCount ? res.status(204).end() : res.status(404).json({ error: 'Patient not found' });
  } catch (e) {
    if (e.code === '23503') return res.status(409).json({ error: 'Patient has records and cannot be deleted' });
    throw e;
  }
});

// ---------- Lookup lists (for drop-downs, with prices) ----------
api.get('/doctors', requireRole(...STAFF), async (req, res) => {
  res.json((await db.query(
    'SELECT doctor_id, full_name, specialisation, availability FROM doctors ORDER BY full_name')).rows);
});
api.get('/medications', requireRole(...STAFF), async (req, res) => {
  res.json((await db.query(
    'SELECT medication_id, name, strength, unit_price, stock_qty FROM medications ORDER BY name')).rows);
});
api.get('/services', requireRole(...STAFF), async (req, res) => {
  res.json((await db.query('SELECT service_id, name, price FROM services ORDER BY name')).rows);
});

// ---------- Appointments ----------
api.get('/appointments', requireRole(...STAFF), async (req, res) => {
  res.json((await db.query(
    `SELECT a.*, p.first_name || ' ' || p.last_name AS patient_name, d.full_name AS doctor_name
     FROM appointments a JOIN patients p USING (patient_id) JOIN doctors d USING (doctor_id)
     ORDER BY appointment_date DESC, appointment_time`)).rows);
});

api.post('/appointments', requireRole('receptionist', 'doctor', 'admin'), async (req, res) => {
  const errors = v.validateAppointment(req.body);
  if (errors.length) return res.status(400).json({ errors });
  const b = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time,
         appointment_type, ward_allocation, status)
       VALUES ($1,$2,$3,$4,$5,$6,'Confirmed') RETURNING *`,
      [b.patient_id, b.doctor_id, b.appointment_date, b.appointment_time,
       b.appointment_type || 'Consultation', b.ward_allocation || null]);
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'That doctor is already booked at that time' });
    if (e.code === '23503') return res.status(400).json({ error: 'Unknown patient or doctor' });
    throw e;
  }
});

api.put('/appointments/:id/status', requireRole('receptionist', 'doctor', 'admin'), async (req, res) => {
  if (!['Pending', 'Confirmed', 'Cancelled', 'Completed'].includes(req.body.status))
    return res.status(400).json({ errors: ['Invalid status'] });
  const { rows } = await db.query(
    'UPDATE appointments SET status=$1 WHERE appointment_id=$2 RETURNING *', [req.body.status, req.params.id]);
  rows[0] ? res.json(rows[0]) : res.status(404).json({ error: 'Appointment not found' });
});

// ---------- Prescriptions: creating one also creates the priced invoice ----------
api.get('/prescriptions', requireRole('doctor', 'nurse', 'pharmacist', 'manager', 'admin'), async (req, res) => {
  res.json((await db.query(
    `SELECT pr.prescription_id, pr.prescription_date, pr.status,
            p.first_name || ' ' || p.last_name AS patient_name, d.full_name AS doctor_name,
            (SELECT json_agg(json_build_object('medication', m.name, 'quantity', i.quantity,
                              'dosage', i.dosage, 'unit_price', i.unit_price))
             FROM prescription_items i JOIN medications m USING (medication_id)
             WHERE i.prescription_id = pr.prescription_id) AS items
     FROM prescriptions pr JOIN patients p USING (patient_id) JOIN doctors d USING (doctor_id)
     ORDER BY pr.prescription_id DESC`)).rows);
});

api.post('/prescriptions', requireRole('doctor', 'admin'), async (req, res) => {
  const errors = v.validatePrescription(req.body);
  if (errors.length) return res.status(400).json({ errors });
  const { patient_id, doctor_id, service_id, items, notes } = req.body;

  const client = await db.getClient();
  try {
    await client.query('BEGIN');                              // all or nothing

    const rx = (await client.query(
      'INSERT INTO prescriptions (patient_id, doctor_id, notes) VALUES ($1,$2,$3) RETURNING prescription_id',
      [patient_id, doctor_id, notes || null])).rows[0];

    const inv = (await client.query(
      `INSERT INTO invoices (invoice_number, patient_id, prescription_id)
       VALUES ('TEMP-' || floor(random()*1000000000)::text, $1, $2) RETURNING invoice_id`,
      [patient_id, rx.prescription_id])).rows[0];
    await client.query(
      "UPDATE invoices SET invoice_number = 'INV-' || lpad(invoice_id::text, 5, '0') WHERE invoice_id = $1",
      [inv.invoice_id]);

    // Consultation line: the price comes from the database, never from the app
       const svc = await client.query(
      `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price)
       SELECT $1, name, 1, price FROM services WHERE service_id = $2
       RETURNING invoice_item_id`,
      [inv.invoice_id, service_id]);
    if (svc.rowCount === 0) throw Object.assign(new Error('Unknown service'), { status: 400 });

    // Each medication: price looked up on the server
    for (const it of items) {
      const med = (await client.query(
        'SELECT name, strength, unit_price, stock_qty FROM medications WHERE medication_id = $1',
        [it.medication_id])).rows[0];
      if (!med) throw Object.assign(new Error('Unknown medication'), { status: 400 });
      if (med.stock_qty < it.quantity)
        throw Object.assign(new Error(`Not enough stock for ${med.name}`), { status: 409 });

       
      await client.query(
        `INSERT INTO prescription_items (prescription_id, medication_id, quantity, dosage, unit_price)
         VALUES ($1,$2,$3,$4,$5)`,
        [rx.prescription_id, it.medication_id, it.quantity, it.dosage.trim(), med.unit_price]);
      await client.query(
        'INSERT INTO invoice_items (invoice_id, description, quantity, unit_price) VALUES ($1,$2,$3,$4)',
        [inv.invoice_id, `${med.name} ${med.strength || ''}`.trim(), it.quantity, med.unit_price]);
    }

    // Tell the patient (if they have a login) and the admin / billing staff
    await client.query(
      `INSERT INTO notifications (user_id, message)
       SELECT user_id, 'A new bill has been created for you' FROM patients
         WHERE patient_id = $1 AND user_id IS NOT NULL
       UNION ALL
       SELECT user_id, 'New invoice awaiting payment' FROM users WHERE role IN ('admin','billing_clerk')`,
      [patient_id]);

    await client.query('COMMIT');

    const lines = (await db.query(
      'SELECT description, quantity, unit_price, quantity * unit_price AS line_total FROM invoice_items WHERE invoice_id=$1 ORDER BY invoice_item_id',
      [inv.invoice_id])).rows;
    const total = (await db.query('SELECT total FROM invoice_totals WHERE invoice_id=$1', [inv.invoice_id])).rows[0].total;
    const number = (await db.query('SELECT invoice_number FROM invoices WHERE invoice_id=$1', [inv.invoice_id])).rows[0].invoice_number;
    res.status(201).json({ prescription_id: rx.prescription_id, invoice_id: inv.invoice_id,
                           invoice_number: number, lines, total });
  } catch (e) {
    await client.query('ROLLBACK');
    if (e.status) return res.status(e.status).json({ error: e.message });
    if (e.code === '23503') return res.status(400).json({ error: 'Unknown patient or doctor' });
    throw e;
  } finally {
    client.release();
  }
});

// ---------- Invoices ----------
// All invoices (admin / billing / manager)
api.get('/invoices', requireRole('billing_clerk', 'manager', 'admin'), async (req, res) => {
  res.json((await db.query(
    `SELECT i.invoice_id, i.invoice_number, i.billing_date, i.payment_status, t.total,
            p.first_name || ' ' || p.last_name AS patient_name
     FROM invoices i JOIN patients p USING (patient_id) LEFT JOIN invoice_totals t USING (invoice_id)
     ORDER BY i.invoice_id DESC`)).rows);
});

// The logged-in patient's own bills (must be declared before /invoices/:id)
api.get('/invoices/mine', async (req, res) => {
  if (!req.user) return res.status(404).json({ error: 'Call /auth/sync first' });
  res.json((await db.query(
    `SELECT i.invoice_id, i.invoice_number, i.billing_date, i.payment_status, t.total
     FROM invoices i JOIN patients p USING (patient_id) LEFT JOIN invoice_totals t USING (invoice_id)
     WHERE p.user_id = $1 ORDER BY i.invoice_id DESC`, [req.user.user_id])).rows);
});

// One invoice with its lines: staff, or the patient it belongs to
api.get('/invoices/:id', async (req, res) => {
  if (!req.user) return res.status(404).json({ error: 'Call /auth/sync first' });
  const inv = (await db.query(
    `SELECT i.invoice_id, i.invoice_number, i.billing_date, i.payment_status, p.user_id AS owner_id,
            p.first_name || ' ' || p.last_name AS patient_name
     FROM invoices i JOIN patients p USING (patient_id) WHERE i.invoice_id = $1`, [req.params.id])).rows[0];
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });
  const isOwner = inv.owner_id === req.user.user_id;
  if (!isOwner && !['billing_clerk', 'manager', 'admin'].includes(req.user.role))
    return res.status(403).json({ error: 'Not allowed for your role' });
  const lines = (await db.query(
    `SELECT description, quantity, unit_price, quantity * unit_price AS line_total
     FROM invoice_items WHERE invoice_id = $1 ORDER BY invoice_item_id`, [req.params.id])).rows;
  const total = lines.reduce((s, l) => s + Number(l.line_total), 0);
  delete inv.owner_id;
  res.json({ ...inv, lines, total });
});

// The patient pays (simulated payment, no card details are ever stored)
api.post('/invoices/:id/pay', async (req, res) => {
  if (!req.user) return res.status(404).json({ error: 'Call /auth/sync first' });
  const method = req.body.payment_method;
  if (!['Card', 'EFT', 'Medical Aid'].includes(method))
    return res.status(400).json({ errors: ['payment_method must be Card, EFT or Medical Aid'] });

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const inv = (await client.query(
      `SELECT i.invoice_id, i.invoice_number, i.payment_status
       FROM invoices i JOIN patients p USING (patient_id)
       WHERE i.invoice_id = $1 AND p.user_id = $2 FOR UPDATE OF i`,
      [req.params.id, req.user.user_id])).rows[0];        // locks the row: no double payment
    if (!inv) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Invoice not found' }); }
    if (inv.payment_status === 'Paid') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Already paid' }); }

    const total = (await client.query('SELECT total FROM invoice_totals WHERE invoice_id=$1', [inv.invoice_id])).rows[0].total;
    await client.query(
      'INSERT INTO payments (invoice_id, payment_method, payment_date, amount_paid) VALUES ($1,$2,CURRENT_DATE,$3)',
      [inv.invoice_id, method, total]);
    await client.query("UPDATE invoices SET payment_status='Paid', payment_method_placeholder=NULL WHERE invoice_id=$1".replace(', payment_method_placeholder=NULL', ''), [inv.invoice_id]);
       await client.query("UPDATE invoices SET payment_status='Paid' WHERE invoice_id=$1", [inv.invoice_id]);
    await client.query('COMMIT');
    res.json({ message: 'Payment successful', invoice_number: inv.invoice_number, amount_paid: total });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

// ---------- Notifications ----------
api.get('/notifications', async (req, res) => {
  if (!req.user) return res.status(404).json({ error: 'Call /auth/sync first' });
  res.json((await db.query(
    'SELECT notification_id, message, is_read, created_at FROM notifications WHERE user_id=$1 ORDER BY notification_id DESC',
    [req.user.user_id])).rows);
});

api.put('/notifications/:id/read', async (req, res) => {
  if (!req.user) return res.status(404).json({ error: 'Call /auth/sync first' });
  const r = await db.query('UPDATE notifications SET is_read = TRUE WHERE notification_id=$1 AND user_id=$2',
    [req.params.id, req.user.user_id]);
  r.rowCount ? res.json({ ok: true }) : res.status(404).json({ error: 'Notification not found' });
});

// ---------- Reports ----------
api.get('/reports/summary', requireRole('manager', 'admin', 'doctor'), async (req, res) => {
  const n = async sql => Number((await db.query(sql)).rows[0].c);
  res.json({
    patients: await n('SELECT COUNT(*) c FROM patients'),
    appointments: await n('SELECT COUNT(*) c FROM appointments'),
    prescriptions: await n('SELECT COUNT(*) c FROM prescriptions'),
    revenue: await n('SELECT COALESCE(SUM(amount_paid),0) c FROM payments'),
    outstanding: await n(`SELECT COALESCE(SUM(t.total),0) c FROM invoices i
                          JOIN invoice_totals t USING (invoice_id) WHERE i.payment_status <> 'Paid'`),
  });
});

// ---------- Mount, error handler, start ----------
app.use('/api', api);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

const port = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(port, () => console.log('API running on port ' + port));
}
module.exports = app;
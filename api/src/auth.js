const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const db = require('./db');

function initFirebase() {
  if (getApps().length) return;
  const credentials = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : require('../' + process.env.FIREBASE_SERVICE_ACCOUNT_PATH.replace('./', ''));
  initializeApp({ credential: cert(credentials) });
}

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
    initFirebase();
    const decoded = await getAuth().verifyIdToken(header.slice(7));
    req.firebaseUser = decoded;
    const { rows } = await db.query('SELECT * FROM users WHERE firebase_uid = $1', [decoded.uid]);
    req.user = rows[0] || null;
    next();
  } catch (e) {
    console.error('AUTH ERROR:', e.message);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

const requireRole = (...roles) => (req, res, next) =>
  !req.user ? res.status(403).json({ error: 'Account not registered' })
  : !roles.includes(req.user.role) ? res.status(403).json({ error: 'Not allowed for your role' })
  : next();

module.exports = { requireAuth, requireRole };
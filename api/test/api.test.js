// Fake Firebase so the tests run anywhere (no keys needed)
process.env.FIREBASE_SERVICE_ACCOUNT = '{}';
jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(), cert: jest.fn(), getApps: () => []
}));
jest.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken: jest.fn().mockRejectedValue(new Error('bad token')) })
}));

const request = require('supertest');
const app = require('../src/server');

describe('public endpoints', () => {
  test('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('protected endpoints need a login', () => {
  test('patients without a token returns 401', async () => {
    const res = await request(app).get('/api/patients');
    expect(res.status).toBe(401);
  });
  test('invoices without a token returns 401', async () => {
    const res = await request(app).get('/api/invoices/mine');
    expect(res.status).toBe(401);
  });
  test('a fake token is rejected with 401', async () => {
    const res = await request(app).get('/api/patients').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });
});
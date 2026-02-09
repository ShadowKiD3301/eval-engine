const request = require('supertest');

/**
 * Hidden test suite for the "jwt-middleware" challenge.
 *
 * Contract:
 * - app is exported from src/app.js as module.exports = app
 * - app uses express.json() for JSON bodies
 * - /login issues JWT tokens for valid credentials
 * - /profile and /admin are protected by JWT middleware
 */

describe('JWT Middleware Challenge', () => {
  let app;

  beforeAll(() => {
    // Import the user's app. Any syntax / import errors should
    // be surfaced as a clean engine-level error.
    // The engine will wrap this require in a try/catch.
    app = require('../../src/app');
  });

  test('login returns a JWT token for valid credentials', async () => {
    const res = await request(app)
      .post('/login')
      .send({ username: 'test', password: 'password123' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.length).toBeGreaterThan(10);
  });

  test('login returns 401 for invalid credentials', async () => {
    const res = await request(app)
      .post('/login')
      .send({ username: 'wrong', password: 'nope' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('profile returns 401 when Authorization header is missing', async () => {
    const res = await request(app).get('/profile');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('profile returns user info when provided a valid token', async () => {
    // First, log in to obtain a token
    const login = await request(app)
      .post('/login')
      .send({ username: 'test', password: 'password123' })
      .set('Accept', 'application/json');

    expect(login.status).toBe(200);
    const token = login.body.token;

    const res = await request(app)
      .get('/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('username', 'test');
  });

  test('public route is accessible without a token', async () => {
    const res = await request(app).get('/public');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  test('admin returns 403 for non-admin user', async () => {
    // Token without admin role
    const login = await request(app)
      .post('/login')
      .send({ username: 'test', password: 'password123' })
      .set('Accept', 'application/json');

    expect(login.status).toBe(200);
    const userToken = login.body.token;

    const res = await request(app)
      .get('/admin')
      .set('Authorization', `Bearer ${userToken}`);

    // For non-admin users, expect 403
    // (Starter template will likely issue non-admin token here.)
    expect([401, 403]).toContain(res.status);
  });
});

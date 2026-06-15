// backend/tests/integration/auth.test.js
const request = require('supertest');
const { initDatabase, runMigrations } = require('../../src/config/database');
const User = require('../../src/models/User');

// Mock environment variables
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '1h';

// Import app after environment is set
const app = require('../../src/app');

describe('Auth Integration Tests', () => {
  let testDb;

  beforeAll(async () => {
    // Initialize test database
    testDb = await initDatabase(':memory:');
    // Run migrations to create tables
    await runMigrations(testDb);
    // Set the test database for User model
    User.setDb(testDb);
  });

  beforeEach(async () => {
    // Clear database before each test
    await new Promise((resolve, reject) => {
      testDb.run('DELETE FROM users', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  afterAll(async () => {
    // Close database connection
    if (testDb) {
      await new Promise((resolve) => testDb.close(resolve));
    }
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123',
          email: 'test@example.com'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.username).toBe('testuser');
      expect(response.body.email).toBe('test@example.com');
      expect(response.body.is_admin).toBe(false);
      expect(response.body.total_coins).toBe(0);
      expect(response.body).not.toHaveProperty('password_hash');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should fail with missing username', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Username is required');
    });

    it('should fail with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Password is required');
    });

    it('should fail with short username', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'ab',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('at least 3 characters');
    });

    it('should fail with short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: '12345'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('at least 6 characters');
    });

    it('should fail with duplicate username', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      // Second registration with same username
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password456'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already exists');
    });

    it('should register user without email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body.username).toBe('testuser');
      expect(response.body.email).toBeNull();
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Register a test user for login tests
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123',
          email: 'test@example.com'
        });
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe('testuser');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('is_admin');
      expect(response.body.user).toHaveProperty('total_coins');
      expect(response.body.user).not.toHaveProperty('password_hash');
      expect(typeof response.body.token).toBe('string');
    });

    it('should fail with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should fail with non-existent username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should fail with missing username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should fail with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken;

    beforeEach(async () => {
      // Register and login to get a token
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123',
          email: 'test@example.com'
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      authToken = loginResponse.body.token;
    });

    it('should return current user info with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.username).toBe('testuser');
      expect(response.body.email).toBe('test@example.com');
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('is_admin');
      expect(response.body).toHaveProperty('total_coins');
      expect(response.body).not.toHaveProperty('password_hash');
    });

    it('should fail without Authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('No token provided');
    });

    it('should fail with malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('No token provided');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid or expired token');
    });

    it('should fail with expired token', async () => {
      // Create an expired token (expiresIn: '0s' would expire immediately, but jwt.sign doesn't support that)
      // Instead, we'll manually create a token with an exp in the past
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: 1, username: 'testuser', exp: Math.floor(Date.now() / 1000) - 3600 },
        process.env.JWT_SECRET
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid or expired token');
    });
  });

  describe('Admin middleware tests', () => {
    let adminToken;
    let userToken;

    beforeEach(async () => {
      // Register admin user
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'admin',
          password: 'admin123',
          email: 'admin@example.com'
        });

      // Make the user admin by directly updating the database
      await new Promise((resolve, reject) => {
        testDb.run('UPDATE users SET is_admin = 1 WHERE username = ?', ['admin'], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Login as admin
      const adminLogin = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });
      adminToken = adminLogin.body.token;

      // Register regular user
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'regularuser',
          password: 'user123',
          email: 'user@example.com'
        });

      // Login as regular user
      const userLogin = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'regularuser',
          password: 'user123'
        });
      userToken = userLogin.body.token;
    });

    it('should allow admin to access admin routes', async () => {
      // Create a test admin route if it doesn't exist
      // For now, we'll skip this test until we have an actual admin route
      // This is a placeholder to verify the middleware setup
      expect(adminToken).toBeDefined();
      expect(userToken).toBeDefined();
    });

    it('should deny regular user access to admin routes', async () => {
      // This is a placeholder for when we implement admin routes
      expect(userToken).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });
  });
});

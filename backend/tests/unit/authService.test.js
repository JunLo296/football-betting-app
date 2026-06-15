// backend/tests/unit/authService.test.js
const authService = require('../../src/services/authService');
const User = require('../../src/models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock the User model and crypto libraries
jest.mock('../../src/models/User');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('Authentication Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key-for-testing';
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'newuser',
        password: 'password123',
        email: 'newuser@example.com'
      };

      const hashedPassword = 'hashed_password_123';
      const createdUser = {
        id: 1,
        username: userData.username,
        email: userData.email,
        is_admin: false,
        total_coins: 0
      };

      // Mock bcrypt hash
      bcrypt.hash.mockResolvedValue(hashedPassword);

      // Mock User.findByUsername to return null (user doesn't exist)
      User.findByUsername.mockResolvedValue(null);

      // Mock User.create to return the new user object
      User.create.mockResolvedValue(createdUser);

      const result = await authService.register(userData);

      expect(result).toEqual(createdUser);

      expect(User.findByUsername).toHaveBeenCalledWith(userData.username);
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
      expect(User.create).toHaveBeenCalledWith({
        username: userData.username,
        password_hash: hashedPassword,
        email: userData.email,
        is_admin: false
      });
    });

    it('should register a new admin user when is_admin is true', async () => {
      const userData = {
        username: 'adminuser',
        password: 'password123',
        email: 'admin@example.com',
        is_admin: true
      };

      const hashedPassword = 'hashed_password_123';
      const createdUser = {
        id: 2,
        username: userData.username,
        email: userData.email,
        is_admin: true,
        total_coins: 0
      };

      // Mock bcrypt hash
      bcrypt.hash.mockResolvedValue(hashedPassword);

      // Mock User.findByUsername to return null (user doesn't exist)
      User.findByUsername.mockResolvedValue(null);

      // Mock User.create to return the new user object
      User.create.mockResolvedValue(createdUser);

      const result = await authService.register(userData);

      expect(result).toEqual(createdUser);

      expect(User.findByUsername).toHaveBeenCalledWith(userData.username);
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
      expect(User.create).toHaveBeenCalledWith({
        username: userData.username,
        password_hash: hashedPassword,
        email: userData.email,
        is_admin: true
      });
    });

    it('should default is_admin to false when not provided', async () => {
      const userData = {
        username: 'regularuser',
        password: 'password123',
        email: 'regular@example.com'
      };

      const hashedPassword = 'hashed_password_123';
      const createdUser = {
        id: 3,
        username: userData.username,
        email: userData.email,
        is_admin: false,
        total_coins: 0
      };

      // Mock bcrypt hash
      bcrypt.hash.mockResolvedValue(hashedPassword);

      // Mock User.findByUsername to return null (user doesn't exist)
      User.findByUsername.mockResolvedValue(null);

      // Mock User.create to return the new user object
      User.create.mockResolvedValue(createdUser);

      const result = await authService.register(userData);

      expect(result.is_admin).toBe(false);

      expect(User.create).toHaveBeenCalledWith({
        username: userData.username,
        password_hash: hashedPassword,
        email: userData.email,
        is_admin: false
      });
    });

    it('should reject if username already exists', async () => {
      const userData = {
        username: 'existinguser',
        password: 'password123',
        email: 'existing@example.com'
      };

      // Mock User.findByUsername to return existing user
      User.findByUsername.mockResolvedValue({
        id: 1,
        username: 'existinguser'
      });

      await expect(authService.register(userData)).rejects.toThrow('Username already exists');

      expect(User.findByUsername).toHaveBeenCalledWith(userData.username);
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(User.create).not.toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      await expect(authService.register({ password: 'pass' })).rejects.toThrow('Username is required');
      await expect(authService.register({ username: 'user' })).rejects.toThrow('Password is required');
    });

    it('should validate username length', async () => {
      await expect(authService.register({
        username: 'ab',
        password: 'password123'
      })).rejects.toThrow('Username must be at least 3 characters');
    });

    it('should validate password length', async () => {
      await expect(authService.register({
        username: 'validuser',
        password: '12345'
      })).rejects.toThrow('Password must be at least 6 characters');
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const credentials = {
        username: 'testuser',
        password: 'password123'
      };

      const mockUser = {
        id: 1,
        username: 'testuser',
        password_hash: 'hashed_password',
        email: 'test@example.com',
        is_admin: 0,
        total_coins: 100
      };

      const mockToken = 'jwt_token_123';

      // Mock User.findByUsername to return user
      User.findByUsername.mockResolvedValue(mockUser);

      // Mock bcrypt compare to return true
      bcrypt.compare.mockResolvedValue(true);

      // Mock jwt.sign to return token
      jwt.sign.mockReturnValue(mockToken);

      const result = await authService.login(credentials);

      expect(result).toEqual({
        token: mockToken,
        user: {
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
          is_admin: mockUser.is_admin,
          total_coins: mockUser.total_coins
        }
      });

      expect(User.findByUsername).toHaveBeenCalledWith(credentials.username);
      expect(bcrypt.compare).toHaveBeenCalledWith(credentials.password, mockUser.password_hash);
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: mockUser.id, username: mockUser.username },
        'test-secret-key-for-testing',
        { expiresIn: '7d' }
      );
    });

    it('should reject if user not found', async () => {
      const credentials = {
        username: 'nonexistent',
        password: 'password123'
      };

      // Mock User.findByUsername to return null
      User.findByUsername.mockResolvedValue(null);

      await expect(authService.login(credentials)).rejects.toThrow('Invalid credentials');

      expect(User.findByUsername).toHaveBeenCalledWith(credentials.username);
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('should reject if password is incorrect', async () => {
      const credentials = {
        username: 'testuser',
        password: 'wrongpassword'
      };

      const mockUser = {
        id: 1,
        username: 'testuser',
        password_hash: 'hashed_password'
      };

      // Mock User.findByUsername to return user
      User.findByUsername.mockResolvedValue(mockUser);

      // Mock bcrypt compare to return false
      bcrypt.compare.mockResolvedValue(false);

      await expect(authService.login(credentials)).rejects.toThrow('Invalid credentials');

      expect(User.findByUsername).toHaveBeenCalledWith(credentials.username);
      expect(bcrypt.compare).toHaveBeenCalledWith(credentials.password, mockUser.password_hash);
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      await expect(authService.login({ password: 'pass' })).rejects.toThrow('Username and password are required');
      await expect(authService.login({ username: 'user' })).rejects.toThrow('Username and password are required');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token and return user', async () => {
      const token = 'valid_jwt_token';
      const decoded = {
        userId: 1,
        username: 'testuser'
      };

      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        is_admin: 0,
        total_coins: 100
      };

      // Mock jwt.verify to return decoded token
      jwt.verify.mockReturnValue(decoded);

      // Mock User.findById to return user
      User.findById.mockResolvedValue(mockUser);

      const result = await authService.verifyToken(token);

      expect(result).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        is_admin: mockUser.is_admin,
        total_coins: mockUser.total_coins
      });

      expect(jwt.verify).toHaveBeenCalledWith(token, 'test-secret-key-for-testing');
      expect(User.findById).toHaveBeenCalledWith(decoded.userId);
    });

    it('should reject if token is invalid', async () => {
      const token = 'invalid_token';

      // Mock jwt.verify to throw error
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.verifyToken(token)).rejects.toThrow('Invalid token');

      expect(jwt.verify).toHaveBeenCalledWith(token, 'test-secret-key-for-testing');
      expect(User.findById).not.toHaveBeenCalled();
    });

    it('should reject if user no longer exists', async () => {
      const token = 'valid_jwt_token';
      const decoded = {
        userId: 999,
        username: 'deleteduser'
      };

      // Mock jwt.verify to return decoded token
      jwt.verify.mockReturnValue(decoded);

      // Mock User.findById to return null
      User.findById.mockResolvedValue(null);

      await expect(authService.verifyToken(token)).rejects.toThrow('User not found');

      expect(jwt.verify).toHaveBeenCalledWith(token, 'test-secret-key-for-testing');
      expect(User.findById).toHaveBeenCalledWith(decoded.userId);
    });

    it('should reject if token is not provided', async () => {
      await expect(authService.verifyToken()).rejects.toThrow('Token is required');
      await expect(authService.verifyToken('')).rejects.toThrow('Token is required');
      await expect(authService.verifyToken(null)).rejects.toThrow('Token is required');
    });
  });

  describe('generateToken', () => {
    it('should generate a JWT token with payload', () => {
      const payload = {
        userId: 1,
        username: 'testuser'
      };

      const mockToken = 'generated_jwt_token';

      // Mock jwt.sign to return token
      jwt.sign.mockReturnValue(mockToken);

      const token = authService.generateToken(payload);

      expect(token).toBe(mockToken);
      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        'test-secret-key-for-testing',
        { expiresIn: '7d' }
      );
    });

    it('should use custom JWT_EXPIRES_IN if set', () => {
      process.env.JWT_EXPIRES_IN = '24h';

      const payload = {
        userId: 2,
        username: 'anotheruser'
      };

      const mockToken = 'another_jwt_token';

      // Mock jwt.sign to return token
      jwt.sign.mockReturnValue(mockToken);

      const token = authService.generateToken(payload);

      expect(token).toBe(mockToken);
      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        'test-secret-key-for-testing',
        { expiresIn: '24h' }
      );

      // Clean up
      delete process.env.JWT_EXPIRES_IN;
    });

    it('should generate token with any payload structure', () => {
      const payload = {
        userId: 3,
        username: 'admin',
        isAdmin: true,
        customField: 'value'
      };

      const mockToken = 'custom_jwt_token';

      // Mock jwt.sign to return token
      jwt.sign.mockReturnValue(mockToken);

      const token = authService.generateToken(payload);

      expect(token).toBe(mockToken);
      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        'test-secret-key-for-testing',
        { expiresIn: '7d' }
      );
    });
  });
});

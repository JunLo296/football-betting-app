// backend/tests/unit/User.test.js
const User = require('../../src/models/User');
const { initDatabase } = require('../../src/config/database');

// Mock the database module
jest.mock('../../src/config/database');

describe('User Model', () => {
  let mockDb;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Create a mock database object
    mockDb = {
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn(),
    };

    // Mock initDatabase to return our mock db
    initDatabase.mockResolvedValue(mockDb);

    // Reset the User model's dbPromise between tests
    User.resetDb();
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        password_hash: 'hashedpassword123',
        email: 'test@example.com'
      };

      // Mock successful insert
      mockDb.run.mockImplementation((sql, params, callback) => {
        callback.call({ lastID: 1 }, null);
      });

      const userId = await User.create(userData);

      expect(userId).toBe(1);
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        [userData.username, userData.password_hash, userData.email],
        expect.any(Function)
      );
    });

    it('should reject duplicate username', async () => {
      const userData = {
        username: 'duplicate',
        password_hash: 'hashedpassword123',
        email: 'test@example.com'
      };

      // Mock constraint error
      mockDb.run.mockImplementation((sql, params, callback) => {
        const error = new Error('UNIQUE constraint failed: users.username');
        error.code = 'SQLITE_CONSTRAINT';
        callback.call({}, error);
      });

      await expect(User.create(userData)).rejects.toThrow('Username already exists');
      expect(mockDb.run).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const userData = {
        username: 'testuser',
        password_hash: 'hashedpassword123',
        email: 'test@example.com'
      };

      // Mock database error
      mockDb.run.mockImplementation((sql, params, callback) => {
        callback.call({}, new Error('Database connection failed'));
      });

      await expect(User.create(userData)).rejects.toThrow('Database connection failed');
    });
  });

  describe('findByUsername', () => {
    it('should find user by username', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        password_hash: 'hashedpassword123',
        email: 'test@example.com',
        is_admin: 0,
        total_coins: 0,
        created_at: new Date().toISOString()
      };

      mockDb.get.mockImplementation((sql, params, callback) => {
        callback(null, mockUser);
      });

      const user = await User.findByUsername('testuser');

      expect(user).toEqual(mockUser);
      expect(mockDb.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM users WHERE username = ?'),
        ['testuser'],
        expect.any(Function)
      );
    });

    it('should return null if user not found', async () => {
      mockDb.get.mockImplementation((sql, params, callback) => {
        callback(null, undefined);
      });

      const user = await User.findByUsername('nonexistent');

      expect(user).toBeNull();
      expect(mockDb.get).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockDb.get.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'));
      });

      await expect(User.findByUsername('testuser')).rejects.toThrow('Database error');
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        password_hash: 'hashedpassword123',
        email: 'test@example.com',
        is_admin: 0,
        total_coins: 0,
        created_at: new Date().toISOString()
      };

      mockDb.get.mockImplementation((sql, params, callback) => {
        callback(null, mockUser);
      });

      const user = await User.findById(1);

      expect(user).toEqual(mockUser);
      expect(mockDb.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM users WHERE id = ?'),
        [1],
        expect.any(Function)
      );
    });

    it('should return null if user not found', async () => {
      mockDb.get.mockImplementation((sql, params, callback) => {
        callback(null, undefined);
      });

      const user = await User.findById(999);

      expect(user).toBeNull();
      expect(mockDb.get).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockDb.get.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'));
      });

      await expect(User.findById(1)).rejects.toThrow('Database error');
    });
  });

  describe('updateCoins', () => {
    it('should update user coins successfully', async () => {
      // Mock successful update
      mockDb.run.mockImplementation((sql, params, callback) => {
        callback.call({ changes: 1 }, null);
      });

      const result = await User.updateCoins(1, 50);

      expect(result).toEqual({ changes: 1 });
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET total_coins = total_coins + ? WHERE id = ?'),
        [50, 1],
        expect.any(Function)
      );
    });

    it('should handle negative coin amounts', async () => {
      // Mock successful update
      mockDb.run.mockImplementation((sql, params, callback) => {
        callback.call({ changes: 1 }, null);
      });

      const result = await User.updateCoins(1, -25);

      expect(result).toEqual({ changes: 1 });
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET total_coins = total_coins + ? WHERE id = ?'),
        [-25, 1],
        expect.any(Function)
      );
    });

    it('should return changes: 0 if user not found', async () => {
      // Mock update with no changes
      mockDb.run.mockImplementation((sql, params, callback) => {
        callback.call({ changes: 0 }, null);
      });

      const result = await User.updateCoins(999, 50);

      expect(result).toEqual({ changes: 0 });
    });

    it('should handle database errors', async () => {
      mockDb.run.mockImplementation((sql, params, callback) => {
        callback.call({}, new Error('Database error'));
      });

      await expect(User.updateCoins(1, 50)).rejects.toThrow('Database error');
    });
  });

  describe('getAll', () => {
    it('should return all users without password_hash', async () => {
      const mockUsers = [
        {
          id: 1,
          username: 'user1',
          email: 'user1@example.com',
          is_admin: 0,
          total_coins: 100,
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          username: 'user2',
          email: 'user2@example.com',
          is_admin: 1,
          total_coins: 200,
          created_at: new Date().toISOString()
        }
      ];

      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, mockUsers);
      });

      const users = await User.getAll();

      expect(users).toEqual(mockUsers);
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, username, email, is_admin, total_coins, created_at FROM users'),
        [],
        expect.any(Function)
      );
    });

    it('should return empty array if no users exist', async () => {
      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      const users = await User.getAll();

      expect(users).toEqual([]);
      expect(mockDb.all).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'));
      });

      await expect(User.getAll()).rejects.toThrow('Database error');
    });
  });
});

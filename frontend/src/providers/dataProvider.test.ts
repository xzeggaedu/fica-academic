import { describe, it, expect, vi } from 'vitest';
import { dataProvider } from './dataProvider';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('DataProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getList', () => {
    it('should fetch list of resources successfully', async () => {
      const mockData = {
        data: [
          { id: 1, name: 'User 1', email: 'user1@example.com' },
          { id: 2, name: 'User 2', email: 'user2@example.com' },
        ],
        total_count: 2,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        json: () => Promise.resolve(mockData),
      });

      const result = await dataProvider.getList({
        resource: 'users',
        pagination: { current: 1, pageSize: 10 },
      });

      expect(result.data).toEqual(mockData.data);
      expect(result.total).toBe(2);
    });

    it('should handle API errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        json: () => Promise.resolve({ detail: 'Internal server error' }),
      });

      await expect(
        dataProvider.getList({
          resource: 'users',
          pagination: { current: 1, pageSize: 10 },
        })
      ).rejects.toThrow();
    });
  });

  describe('getOne', () => {
    it('should fetch single resource successfully', async () => {
      const mockData = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'USER',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        json: () => Promise.resolve(mockData),
      });

      const result = await dataProvider.getOne({
        resource: 'users',
        id: 1,
      });

      expect(result.data).toEqual(mockData);
    });
  });

  describe('create', () => {
    it('should create resource successfully', async () => {
      const mockData = {
        id: 1,
        name: 'New User',
        email: 'new@example.com',
        role: 'USER',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        json: () => Promise.resolve(mockData),
      });

      const result = await dataProvider.create({
        resource: 'users',
        variables: {
          name: 'New User',
          email: 'new@example.com',
          password: 'password123',
        },
      });

      expect(result.data).toEqual(mockData);
    });
  });

  describe('update', () => {
    it('should update resource successfully', async () => {
      const mockData = {
        id: 1,
        name: 'Updated User',
        email: 'updated@example.com',
        role: 'USER',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        json: () => Promise.resolve(mockData),
      });

      const result = await dataProvider.update({
        resource: 'users',
        id: 1,
        variables: {
          name: 'Updated User',
        },
      });

      expect(result.data).toEqual(mockData);
    });
  });

  describe('deleteOne', () => {
    it('should delete resource successfully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        json: () => Promise.resolve({ message: 'User deleted successfully' }),
      });

      const result = await dataProvider.deleteOne({
        resource: 'users',
        id: 1,
      });

      expect(result.data).toBeDefined();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { accessControlProvider } from './accessControlProvider';
import { UserRoleEnum } from '../types/auth';

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

describe('AccessControlProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('can', () => {
    it('should deny access when no token', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = await accessControlProvider.can({
        resource: 'users',
        action: 'list',
        params: {},
      });

      expect(result.can).toBe(false);
      expect(result.reason).toBe('No autenticado');
    });

    it('should allow admin to access all user resources', async () => {
      // Mock JWT token with admin role
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYWRtaW4ifQ.mock';
      localStorageMock.getItem.mockReturnValue(mockToken);

      // Mock atob to return the payload
      global.atob = vi.fn().mockReturnValue('{"role":"admin"}');

      const result = await accessControlProvider.can({
        resource: 'users',
        action: 'list',
        params: {},
      });

      expect(result.can).toBe(true);
    });

    it('should deny regular users from accessing user management', async () => {
      // Mock JWT token with user role
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoidXNlciJ9.mock';
      localStorageMock.getItem.mockReturnValue(mockToken);

      // Mock atob to return the payload
      global.atob = vi.fn().mockReturnValue('{"role":"user"}');

      const result = await accessControlProvider.can({
        resource: 'users',
        action: 'list',
        params: {},
      });

      expect(result.can).toBe(false);
      expect(result.reason).toBe('Solo los administradores pueden gestionar usuarios');
    });

    it('should allow all authenticated users to view tasks', async () => {
      // Mock JWT token with user role
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoidXNlciJ9.mock';
      localStorageMock.getItem.mockReturnValue(mockToken);

      // Mock atob to return the payload
      global.atob = vi.fn().mockReturnValue('{"role":"user"}');

      const result = await accessControlProvider.can({
        resource: 'tasks',
        action: 'list',
        params: {},
      });

      expect(result.can).toBe(true);
    });

    it('should deny regular users from managing tasks', async () => {
      // Mock JWT token with user role
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoidXNlciJ9.mock';
      localStorageMock.getItem.mockReturnValue(mockToken);

      // Mock atob to return the payload
      global.atob = vi.fn().mockReturnValue('{"role":"user"}');

      const result = await accessControlProvider.can({
        resource: 'tasks',
        action: 'create',
        params: {},
      });

      expect(result.can).toBe(false);
      expect(result.reason).toBe('Solo los administradores pueden gestionar tareas');
    });

    it('should handle invalid token gracefully', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-token');

      // Mock atob to throw an error for invalid token
      global.atob = vi.fn().mockImplementation(() => {
        throw new Error('Invalid base64');
      });

      const result = await accessControlProvider.can({
        resource: 'users',
        action: 'list',
        params: {},
      });

      expect(result.can).toBe(false);
      expect(result.reason).toBe('Token inválido');
    });
  });
});

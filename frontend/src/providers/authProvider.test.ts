import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authProvider } from './authProvider';

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

// Mock fetch
global.fetch = vi.fn();

// Mock window.dispatchEvent
const dispatchEventMock = vi.fn();
Object.defineProperty(window, 'dispatchEvent', {
  value: dispatchEventMock,
});

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('mock-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('login', () => {
    it('should login successfully without remember_me', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: 'mock-access-token',
          token_type: 'bearer'
        })
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await authProvider.login({
        username: 'testuser',
        password: 'testpass',
        remember_me: false
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/login'),
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData)
        })
      );

      // Verify FormData contains remember_me=false
      const fetchCall = (global.fetch as any).mock.calls[0];
      const formData = fetchCall[1].body as FormData;
      expect(formData.get('remember_me')).toBe('false');

      expect(result).toEqual({
        success: true,
        redirectTo: '/'
      });
      expect(localStorageMock.setItem).toHaveBeenCalledWith('fica-access-token', 'mock-access-token');
    });

    it('should login successfully with remember_me', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: 'mock-access-token-extended',
          token_type: 'bearer'
        })
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await authProvider.login({
        username: 'testuser',
        password: 'testpass',
        remember_me: true
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/login'),
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData)
        })
      );

      // Verify FormData contains remember_me=true
      const fetchCall = (global.fetch as any).mock.calls[0];
      const formData = fetchCall[1].body as FormData;
      expect(formData.get('remember_me')).toBe('true');

      expect(result).toEqual({
        success: true,
        redirectTo: '/'
      });
      expect(localStorageMock.setItem).toHaveBeenCalledWith('fica-access-token', 'mock-access-token-extended');
    });

    it('should handle login failure', async () => {
      const mockResponse = {
        ok: false,
        json: vi.fn().mockResolvedValue({
          detail: 'Invalid credentials'
        })
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await authProvider.login({
        username: 'testuser',
        password: 'wrongpass',
        remember_me: false
      });

      expect(result).toEqual({
        success: false,
        error: {
          name: 'LoginError',
          message: 'Invalid credentials'
        }
      });
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await authProvider.login({
        username: 'testuser',
        password: 'testpass',
        remember_me: false
      });

      expect(result).toEqual({
        success: false,
        error: {
          name: 'LoginError',
          message: 'Network error'
        }
      });
    });
  });

  describe('onError', () => {
    it('should remove token and dispatch session-expired event on 401 error', async () => {
      const error401 = {
        status: 401,
        message: 'Unauthorized'
      };

      const result = await authProvider.onError(error401);

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('fica-access-token');
      expect(dispatchEventMock).toHaveBeenCalledWith(new CustomEvent('session-expired'));
      expect(result).toEqual({
        error: error401
      });
    });

    it('should not remove token or dispatch event on non-401 errors', async () => {
      const error500 = {
        status: 500,
        message: 'Internal Server Error'
      };

      const result = await authProvider.onError(error500);

      expect(localStorageMock.removeItem).not.toHaveBeenCalled();
      expect(dispatchEventMock).not.toHaveBeenCalled();
      expect(result).toEqual({
        error: error500
      });
    });

    it('should handle errors without status code', async () => {
      const errorNoStatus = {
        message: 'Network Error'
      };

      const result = await authProvider.onError(errorNoStatus);

      expect(localStorageMock.removeItem).not.toHaveBeenCalled();
      expect(dispatchEventMock).not.toHaveBeenCalled();
      expect(result).toEqual({
        error: errorNoStatus
      });
    });
  });
});

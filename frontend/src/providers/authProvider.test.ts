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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import {
  useApiDebug,
  createApiError,
  formatErrorForDisplay,
  apiRequestWithDebug,
} from './use-api-debug';

// Mock console.error to avoid noise in tests
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('useApiDebug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useApiDebug hook', () => {
    it('should initialize with null error', () => {
      const { result } = renderHook(() => useApiDebug());

      expect(result.current.error).toBeNull();
      expect(result.current.isDevelopment).toBe(true); // Default in test environment
    });

    it('should allow setting and clearing errors', () => {
      const { result } = renderHook(() => useApiDebug());

      const testError = createApiError('Test error', 500, 'Internal Server Error');

      act(() => {
        result.current.setError(testError);
      });

      expect(result.current.error).toEqual(testError);

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should detect development environment correctly', () => {
      const { result } = renderHook(() => useApiDebug());
      // En el entorno de pruebas, siempre debería detectar desarrollo
      expect(result.current.isDevelopment).toBe(true);
    });
  });

  describe('createApiError', () => {
    it('should create error with all properties', () => {
      const error = createApiError(
        'Test error',
        404,
        'Not Found',
        'https://api.example.com/test',
        'GET',
        { detail: 'Resource not found' }
      );

      expect(error).toEqual({
        message: 'Test error',
        status: 404,
        statusText: 'Not Found',
        url: 'https://api.example.com/test',
        method: 'GET',
        details: { detail: 'Resource not found' },
      });
    });

    it('should create error with minimal properties', () => {
      const error = createApiError('Simple error');

      expect(error).toEqual({
        message: 'Simple error',
        status: undefined,
        statusText: undefined,
        url: undefined,
        method: undefined,
        details: undefined,
      });
    });
  });

  describe('formatErrorForDisplay', () => {
    it('should format error for development environment', () => {
      vi.stubEnv('DEV', 'true');

      const error = createApiError(
        'Test error',
        500,
        'Internal Server Error',
        'https://api.example.com/test',
        'POST',
        { detail: 'Something went wrong' }
      );

      const formatted = formatErrorForDisplay(error);

      expect(formatted).toContain('🔍 **Error Detallado (Desarrollo)**');
      expect(formatted).toContain('**Mensaje:** Test error');
      expect(formatted).toContain('**Status:** 500');
      expect(formatted).toContain('**Status Text:** Internal Server Error');
      expect(formatted).toContain('**URL:** https://api.example.com/test');
      expect(formatted).toContain('**Método:** POST');
      expect(formatted).toContain('**Detalles del Servidor:**');
    });

    it('should format error for production environment', () => {
      const error = createApiError('Test error', 500);

      const formatted = formatErrorForDisplay(error);

      // En el entorno de pruebas, siempre se muestra la versión de desarrollo
      expect(formatted).toContain('Test error');
    });
  });

  describe('apiRequestWithDebug', () => {
    beforeEach(() => {
      vi.stubEnv('DEV', 'true');
    });

    it('should make successful API request', async () => {
      // Usar MSW para mockear la respuesta
      server.use(
        http.get('https://api.example.com/test', () => {
          return HttpResponse.json({ data: 'test' });
        })
      );

      const result = await apiRequestWithDebug('https://api.example.com/test');
      expect(result).toEqual({ data: 'test' });
    });

    it('should handle API error response', async () => {
      // Usar MSW para mockear un error 400
      server.use(
        http.get('https://api.example.com/test-error', () => {
          return HttpResponse.json(
            { detail: 'Invalid request' },
            { status: 400, statusText: 'Bad Request' }
          );
        })
      );

      const onError = vi.fn();

      await expect(
        apiRequestWithDebug('https://api.example.com/test-error', {}, onError)
      ).rejects.toBeDefined();

      expect(onError).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      // Usar MSW para mockear un error de red
      server.use(
        http.get('https://api.example.com/network-error', () => {
          return HttpResponse.error();
        })
      );

      const onError = vi.fn();

      await expect(
        apiRequestWithDebug('https://api.example.com/network-error', {}, onError)
      ).rejects.toBeDefined();

      expect(onError).toHaveBeenCalled();
    });

    it('should handle empty responses', async () => {
      // Usar MSW para mockear una respuesta vacía (204 No Content)
      server.use(
        http.get('https://api.example.com/empty', () => {
          return new HttpResponse(null, { status: 204 });
        })
      );

      const result = await apiRequestWithDebug('https://api.example.com/empty');
      expect(result).toEqual({});
    });

    it('should handle JSON parse errors in error response', async () => {
      // Usar MSW para mockear un error con texto plano
      server.use(
        http.get('https://api.example.com/text-error', () => {
          return new HttpResponse('Plain text error', {
            status: 500,
            statusText: 'Internal Server Error',
          });
        })
      );

      await expect(
        apiRequestWithDebug('https://api.example.com/text-error')
      ).rejects.toBeDefined();
    });

    it('should handle both JSON and text parse errors', async () => {
      // Usar MSW para mockear un error 500
      server.use(
        http.get('https://api.example.com/error', () => {
          return new HttpResponse(null, {
            status: 500,
            statusText: 'Internal Server Error',
          });
        })
      );

      await expect(
        apiRequestWithDebug('https://api.example.com/error')
      ).rejects.toBeDefined();
    });
  });
});

/**
 * Setup para Vitest
 * Este archivo se ejecuta antes de todas las pruebas
 * Configuración basada en: https://mswjs.io/docs/integrations/node
 */

import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { server } from '../mocks/server';
import '@testing-library/jest-dom';

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    ...import.meta.env,
    VITE_API_URL: 'http://localhost:8000',
    DEV: true,
    VITE_DEBUG_MODE: 'true',
  },
  writable: true,
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock GLOBAL de Refine hooks con funciones reutilizables
// Estos mocks se pueden sobrescribir en tests individuales
vi.mock('@refinedev/core', async () => {
  const actual = await vi.importActual('@refinedev/core');
  return {
    ...actual,
    // Hooks que devuelven valores por defecto
    useCan: vi.fn(() => ({
      data: { can: true },
      isLoading: false,
    })),
    useGetIdentity: vi.fn(() => ({
      data: {
        id: '1',
        name: 'Admin User',
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
      },
      isLoading: false,
    })),
    useList: vi.fn(() => ({
      query: {
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      },
      result: {
        data: [],
        total: 0,
      },
    })),
    useCreate: vi.fn(() => ({
      mutate: vi.fn(),
      mutation: { isPending: false },
    })),
    useUpdate: vi.fn(() => ({
      mutate: vi.fn(),
      mutation: { isPending: false },
    })),
    useDelete: vi.fn(() => ({
      mutate: vi.fn(),
      mutation: { isPending: false },
    })),
    useInvalidate: vi.fn(() => vi.fn()),
    useLogin: vi.fn(() => ({
      mutate: vi.fn(),
      isLoading: false,
    })),
    useLogout: vi.fn(() => ({
      mutate: vi.fn(),
      isLoading: false,
    })),
    useLink: vi.fn(() => ({ to }: { to: string }) => to),
    useRefineOptions: vi.fn(() => ({
      title: 'FICA Academics Test',
    })),
  };
});

// Configuración MSW según documentación oficial
beforeAll(() => {
  // Establecer el servidor MSW antes de todas las pruebas
  server.listen({
    onUnhandledRequest: 'warn'
  });

  // Mock de token por defecto
  localStorageMock.getItem.mockImplementation((key: string) => {
    if (key === 'fica-access-token') {
      return 'mock-access-token';
    }
    return null;
  });
});

// Limpiar antes de cada prueba individual
beforeEach(() => {
  // Limpiar todos los mocks antes de cada test
  vi.clearAllMocks();
});

// Limpiar después de cada prueba
afterEach(() => {
  // Resetear los handlers a su estado inicial
  server.resetHandlers();
});

// Cerrar el servidor después de todas las pruebas
afterAll(() => {
  server.close();
});

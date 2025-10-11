/**
 * Setup para Vitest
 * Este archivo se ejecuta antes de todas las pruebas
 */

import { afterAll, afterEach, beforeAll, vi } from 'vitest';
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

// Mock global para el mutate function
const mockLoginMutate = vi.fn();
const mockLogoutMutate = vi.fn();

// Mock de Refine hooks que se usan en los componentes
vi.mock('@refinedev/core', async () => {
  const actual = await vi.importActual('@refinedev/core');
  return {
    ...actual,
    useLogin: () => ({
      mutate: mockLoginMutate,
      isLoading: false,
    }),
    useLogout: () => ({
      mutate: mockLogoutMutate,
      isLoading: false,
    }),
    useGetIdentity: () => ({
      data: {
        id: 1,
        name: 'Admin User',
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
      },
      isLoading: false,
    }),
    useLink: () => {
      return ({ to }: { to: string }) => to;
    },
    useRefineOptions: () => ({
      title: 'Test App',
    }),
  };
});

// Exportar los mocks para que puedan ser accedidos en los tests
export { mockLoginMutate, mockLogoutMutate };

// Mock token por defecto para las pruebas
beforeAll(() => {
  // Establecer el servidor MSW antes de todas las pruebas
  server.listen({ onUnhandledRequest: 'warn' });

  // Mock de token por defecto
  localStorageMock.getItem.mockImplementation((key: string) => {
    if (key === 'fica-access-token') {
      return 'mock-access-token';
    }
    return null;
  });
});

// Limpiar después de cada prueba
afterEach(() => {
  // Resetear los handlers a su estado inicial
  server.resetHandlers();

  // Limpiar los mocks
  vi.clearAllMocks();
});

// Cerrar el servidor después de todas las pruebas
afterAll(() => {
  server.close();
});

/**
 * Utilidades para pruebas
 * Provee wrappers y helpers para facilitar las pruebas de componentes
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock de AuthProvider para las pruebas
const mockAuthProvider = {
  login: vi.fn().mockResolvedValue({ success: true }),
  logout: vi.fn().mockResolvedValue({ success: true }),
  check: vi.fn().mockResolvedValue({ authenticated: true }),
  onError: vi.fn().mockResolvedValue({}),
  getPermissions: vi.fn().mockResolvedValue(['admin']),
  getIdentity: vi.fn().mockResolvedValue({
    id: 1,
    name: 'Admin User',
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin',
  }),
};

// Mock de DataProvider para las pruebas
const mockDataProvider = {
  getList: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  getOne: vi.fn().mockResolvedValue({ data: {} }),
  getMany: vi.fn().mockResolvedValue({ data: [] }),
  create: vi.fn().mockResolvedValue({ data: {} }),
  update: vi.fn().mockResolvedValue({ data: {} }),
  deleteOne: vi.fn().mockResolvedValue({ data: {} }),
  getApiUrl: vi.fn().mockReturnValue('http://localhost:8000'),
  custom: vi.fn().mockResolvedValue({ data: {} }),
};

interface AllTheProvidersProps {
  children: React.ReactNode;
}

/**
 * Wrapper simple que provee solo el MemoryRouter para las pruebas
 */
export const AllTheProviders: React.FC<AllTheProvidersProps> = ({ children }) => {
  return <MemoryRouter>{children}</MemoryRouter>;
};

/**
 * Función helper para renderizar componentes con todos los providers
 */
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, { wrapper: AllTheProviders, ...options });
};

/**
 * Re-exportar todo de @testing-library/react
 */
export * from '@testing-library/react';

/**
 * Exportar los mocks para que puedan ser usados en las pruebas
 */
export { mockAuthProvider, mockDataProvider };

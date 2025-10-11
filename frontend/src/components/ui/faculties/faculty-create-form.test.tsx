import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { FacultyCreateForm } from './faculty-create-form';
import { renderWithProviders } from '@/test/test-utils';

// Mock de sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock de hooks
vi.mock('@/hooks/use-api-debug', () => ({
  useApiDebug: vi.fn(() => ({
    error: null,
    setError: vi.fn(),
    clearError: vi.fn(),
    isDevelopment: false,
  })),
  createApiError: vi.fn(),
  apiRequestWithDebug: vi.fn(),
}));

vi.mock('@/components/ui/debug/error-debug-panel', () => ({
  ErrorDebugPanel: () => null,
}));

describe('FacultyCreateForm - Renderizado Básico', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('fica-access-token', 'test-token');
  });

  it('debería renderizar los campos del formulario', () => {
    renderWithProviders(<FacultyCreateForm />);
    // Verificar que los labels existan
    expect(screen.getByLabelText(/Nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Acrónimo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Estado/i)).toBeInTheDocument();
  });

  it('debería tener campos de entrada para nombre y acrónimo', () => {
    renderWithProviders(<FacultyCreateForm />);
    expect(screen.getByPlaceholderText('Ej: Facultad de Ingeniería y Arquitectura')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ej: FICA')).toBeInTheDocument();
  });

  it('debería tener un formulario con id correcto', () => {
    renderWithProviders(<FacultyCreateForm />);
    // Verificar que el formulario existe con el id correcto
    const form = document.getElementById('faculty-create-form');
    expect(form).toBeInTheDocument();
    expect(form?.tagName).toBe('FORM');
  });

  it('debería renderizar un select para el estado', () => {
    renderWithProviders(<FacultyCreateForm />);
    // Verificar que el select de estado exista con sus opciones
    expect(screen.getByRole('combobox', { name: /Estado/i })).toBeInTheDocument();
  });
});

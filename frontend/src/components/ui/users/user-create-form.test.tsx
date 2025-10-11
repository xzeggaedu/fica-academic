import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { UserCreateForm } from './user-create-form';
import { renderWithProviders } from '@/test/test-utils';

// Mock de sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('UserCreateForm - Renderizado Básico', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('fica-access-token', 'test-token');
  });

  it('debería renderizar los labels del formulario', () => {
    renderWithProviders(<UserCreateForm />);
    // Verificar que los labels existan
    expect(screen.getByLabelText(/Nombre Completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Usuario/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo Electrónico/i)).toBeInTheDocument();
  });

  it('debería tener campos de entrada básicos', () => {
    renderWithProviders(<UserCreateForm />);
    expect(screen.getByPlaceholderText('Ingrese el nombre de usuario')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ingrese el nombre completo')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ingrese el correo electrónico')).toBeInTheDocument();
  });

  it('debería tener un formulario con id correcto', () => {
    renderWithProviders(<UserCreateForm />);
    // Verificar que el formulario existe con el id correcto
    const form = document.getElementById('user-create-form');
    expect(form).toBeInTheDocument();
    expect(form?.tagName).toBe('FORM');
  });

  it('debería renderizar al menos un select/combobox', () => {
    renderWithProviders(<UserCreateForm />);
    // Verificar que exista al menos un combobox (rol)
    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes.length).toBeGreaterThan(0);
  });
});

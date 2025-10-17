import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { CoordinationFormSheet } from './coordination-form-sheet';
import { renderWithProviders } from '@/test/test-utils';

// Mock de sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock de Refine hooks
vi.mock('@refinedev/core', () => ({
  useList: vi.fn(() => ({ result: { data: [] } })),
}));

// Mock data
const mockFaculties = [
  { id: 1, name: 'Facultad de Ingeniería', acronym: 'FICA', is_active: true },
  { id: 2, name: 'Facultad de Ciencias', acronym: 'FC', is_active: true },
];

const mockProfessors = [
  { id: 1, professor_id: 'P001', professor_name: 'Juan Pérez', is_active: true },
  { id: 2, professor_id: 'P002', professor_name: 'María García', is_active: true },
];

const mockCoordination = {
  id: 1,
  code: 'RED',
  name: 'Redes',
  description: 'Coordinación de redes',
  faculty_id: 1,
  coordinator_professor_id: 1,
  is_active: true,
  deleted: false,
  deleted_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('CoordinationFormSheet - Renderizado Básico', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    editingCoordination: null,
    formData: {
      code: '',
      name: '',
      description: '',
      faculty_id: null,
      coordinator_professor_id: null,
      is_active: true,
    },
    onFormChange: vi.fn(),
    onSubmit: vi.fn(),
    isSubmitting: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('fica-access-token', 'test-token');
  });

  it('debería renderizar el título correcto en modo crear', () => {
    renderWithProviders(<CoordinationFormSheet {...defaultProps} />);
    expect(screen.getByText('Crear Coordinación')).toBeInTheDocument();
  });

  it('debería renderizar el título correcto en modo editar', () => {
    const props = { ...defaultProps, editingCoordination: mockCoordination };
    renderWithProviders(<CoordinationFormSheet {...props} />);
    expect(screen.getByText('Editar Coordinación')).toBeInTheDocument();
  });

  it('debería renderizar todos los campos del formulario', () => {
    renderWithProviders(<CoordinationFormSheet {...defaultProps} />);

    expect(screen.getByPlaceholderText('Ej: RED')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ej: Coordinación de Redes')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Área de conocimiento que agrupa la coordinación...')).toBeInTheDocument();
    expect(screen.getAllByRole('combobox')).toHaveLength(2);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('debería renderizar los placeholders correctos', () => {
    renderWithProviders(<CoordinationFormSheet {...defaultProps} />);

    expect(screen.getByPlaceholderText('Ej: RED')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ej: Coordinación de Redes')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Área de conocimiento que agrupa la coordinación...')).toBeInTheDocument();
  });

  it('debería renderizar los botones de acción', () => {
    renderWithProviders(<CoordinationFormSheet {...defaultProps} />);

    expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Crear/i })).toBeInTheDocument();
  });

  it('debería mostrar "Actualizar" en modo editar', () => {
    const props = { ...defaultProps, editingCoordination: mockCoordination };
    renderWithProviders(<CoordinationFormSheet {...props} />);

    expect(screen.getByRole('button', { name: /Actualizar/i })).toBeInTheDocument();
  });

  it('debería deshabilitar el botón Crear cuando el formulario no es válido', () => {
    renderWithProviders(<CoordinationFormSheet {...defaultProps} />);

    const createButton = screen.getByRole('button', { name: /Crear/i });
    expect(createButton).toBeDisabled();
  });

  it('debería deshabilitar el botón cuando isSubmitting es true', () => {
    const props = { ...defaultProps, isSubmitting: true };
    renderWithProviders(<CoordinationFormSheet {...props} />);

    const createButton = screen.getByRole('button', { name: /Guardando/i });
    expect(createButton).toBeDisabled();
  });
});

describe('CoordinationFormSheet - Modo Edición', () => {
  const editingProps = {
    isOpen: true,
    onClose: vi.fn(),
    editingCoordination: mockCoordination,
    formData: {
      code: 'RED',
      name: 'Redes',
      description: 'Coordinación de redes',
      faculty_id: 1,
      coordinator_professor_id: 1,
      is_active: true,
    },
    onFormChange: vi.fn(),
    onSubmit: vi.fn(),
    isSubmitting: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('fica-access-token', 'test-token');
  });

  it('debería mostrar los valores actuales en modo edición', () => {
    renderWithProviders(<CoordinationFormSheet {...editingProps} />);

    expect(screen.getByDisplayValue('RED')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Redes')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Coordinación de redes')).toBeInTheDocument();
  });

  it('debería mostrar el botón Actualizar en modo edición', () => {
    renderWithProviders(<CoordinationFormSheet {...editingProps} />);

    expect(screen.getByRole('button', { name: /Actualizar/i })).toBeInTheDocument();
  });
});

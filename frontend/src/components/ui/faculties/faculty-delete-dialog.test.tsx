import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FacultyDeleteDialog } from './faculty-delete-dialog';

// Mock de sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

global.fetch = vi.fn();

describe('FacultyDeleteDialog - Funcionalidad Básica', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  const defaultProps = {
    facultyId: 1,
    facultyName: 'Facultad de Ciencias Aplicadas',
    isOpen: true,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('fica-access-token', 'test-token');
  });

  it('debería renderizar el diálogo de eliminación', () => {
    render(<FacultyDeleteDialog {...defaultProps} />);
    expect(screen.getByText('Eliminar Facultad')).toBeInTheDocument();
  });

  it('debería mostrar el nombre de la facultad', () => {
    render(<FacultyDeleteDialog {...defaultProps} />);
    expect(screen.getByText(/Facultad de Ciencias Aplicadas/)).toBeInTheDocument();
  });

  it('debería tener botones de acción', () => {
    render(<FacultyDeleteDialog {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Eliminar/i })).toBeInTheDocument();
  });

  it('debería llamar onClose al cancelar', () => {
    render(<FacultyDeleteDialog {...defaultProps} />);
    const cancelButton = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('no debería renderizar cuando está cerrado', () => {
    render(<FacultyDeleteDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Eliminar Facultad')).not.toBeInTheDocument();
  });

  it('debería mostrar advertencia de eliminación en cascada', () => {
    render(<FacultyDeleteDialog {...defaultProps} />);
    expect(screen.getByText(/eliminará también todas las escuelas/i)).toBeInTheDocument();
  });
});

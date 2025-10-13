import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { toast } from 'sonner';

import { ScheduleDeleteDialog } from './schedule-delete-dialog';

// Mock de sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock de localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock de fetch
global.fetch = vi.fn();

describe('ScheduleDeleteDialog', () => {
  const defaultProps = {
    scheduleId: 1,
    scheduleRange: '08:00 a.m. a 10:00 a.m.',
    dayGroupName: 'Lu-Vi',
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('test-token');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('debería renderizar el diálogo de eliminación', () => {
    render(<ScheduleDeleteDialog {...defaultProps} />);
    
    expect(screen.getByText('Eliminar Horario')).toBeInTheDocument();
    expect(screen.getByText(/¿Estás seguro de que deseas eliminar el horario/)).toBeInTheDocument();
    expect(screen.getByText(/Lu-Vi de 08:00 a.m. a 10:00 a.m./)).toBeInTheDocument();
    expect(screen.getByText(/Esta acción no se puede deshacer/)).toBeInTheDocument();
  });

  it('debería mostrar el nombre del grupo de días y el rango de tiempo', () => {
    render(<ScheduleDeleteDialog {...defaultProps} />);
    
    expect(screen.getByText(/Lu-Vi de 08:00 a.m. a 10:00 a.m./)).toBeInTheDocument();
  });

  it('debería tener botones de acción', () => {
    render(<ScheduleDeleteDialog {...defaultProps} />);
    
    expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Eliminar/i })).toBeInTheDocument();
  });

  it('debería cerrar el diálogo al hacer clic en Cancelar', () => {
    render(<ScheduleDeleteDialog {...defaultProps} />);
    
    const cancelButton = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelButton);
    
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('no debería renderizar cuando está cerrado', () => {
    render(<ScheduleDeleteDialog {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Eliminar Horario')).not.toBeInTheDocument();
  });

  it('debería mostrar advertencia de eliminación', () => {
    render(<ScheduleDeleteDialog {...defaultProps} />);
    
    expect(screen.getByText(/Esta acción no se puede deshacer/)).toBeInTheDocument();
  });

  it('debería eliminar el horario exitosamente', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });
    global.fetch = mockFetch;

    render(<ScheduleDeleteDialog {...defaultProps} />);
    
    const deleteButton = screen.getByRole('button', { name: /Eliminar/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/catalog/schedule-times/1',
        {
          method: 'DELETE',
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Horario eliminado exitosamente', {
        description: 'El horario "Lu-Vi - 08:00 a.m. a 10:00 a.m." ha sido eliminado correctamente.',
        richColors: true,
      });
    });

    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalled();
      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });
  });

  it('debería mostrar estado de carga durante la eliminación', async () => {
    const mockFetch = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({}),
      }), 100))
    );
    global.fetch = mockFetch;

    render(<ScheduleDeleteDialog {...defaultProps} />);
    
    const deleteButton = screen.getByRole('button', { name: /Eliminar/i });
    fireEvent.click(deleteButton);

    // Verificar que el botón muestra estado de carga
    expect(screen.getByText('Eliminando...')).toBeInTheDocument();
    expect(deleteButton).toBeDisabled();

    // Verificar que el botón de cancelar está deshabilitado
    const cancelButton = screen.getByRole('button', { name: /Cancelar/i });
    expect(cancelButton).toBeDisabled();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('debería manejar errores de eliminación', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.resolve({ detail: 'Horario no encontrado' }),
    });
    global.fetch = mockFetch;

    render(<ScheduleDeleteDialog {...defaultProps} />);
    
    const deleteButton = screen.getByRole('button', { name: /Eliminar/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error al eliminar horario', {
        description: 'Horario no encontrado',
        richColors: true,
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Horario no encontrado')).toBeInTheDocument();
    });

    // Verificar que el diálogo no se cerró
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('debería manejar errores de red', async () => {
    const mockFetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
    global.fetch = mockFetch;

    render(<ScheduleDeleteDialog {...defaultProps} />);
    
    const deleteButton = screen.getByRole('button', { name: /Eliminar/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error al eliminar horario', {
        description: 'Network error',
        richColors: true,
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('debería manejar falta de token de autenticación', async () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    render(<ScheduleDeleteDialog {...defaultProps} />);
    
    const deleteButton = screen.getByRole('button', { name: /Eliminar/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error al eliminar horario', {
        description: 'No se encontró el token de autenticación',
        richColors: true,
      });
    });

    await waitFor(() => {
      expect(screen.getByText('No se encontró el token de autenticación')).toBeInTheDocument();
    });
  });

  it('debería manejar respuestas de error sin JSON válido', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.reject(new Error('Invalid JSON')),
    });
    global.fetch = mockFetch;

    render(<ScheduleDeleteDialog {...defaultProps} />);
    
    const deleteButton = screen.getByRole('button', { name: /Eliminar/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error al eliminar horario', {
        description: 'Error 500: Internal Server Error',
        richColors: true,
      });
    });
  });

  it('no debería permitir cerrar durante la eliminación', async () => {
    const mockFetch = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({}),
      }), 100))
    );
    global.fetch = mockFetch;

    render(<ScheduleDeleteDialog {...defaultProps} />);
    
    const deleteButton = screen.getByRole('button', { name: /Eliminar/i });
    fireEvent.click(deleteButton);

    // Intentar cerrar durante la eliminación
    const cancelButton = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelButton);

    // No debería llamar onClose durante la eliminación
    expect(defaultProps.onClose).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('debería cerrar el diálogo al hacer clic fuera del modal', () => {
    render(<ScheduleDeleteDialog {...defaultProps} />);
    
    // Simular clic en el overlay (onOpenChange)
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog.closest('[role="dialog"]') as Element);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('debería mostrar diferentes grupos de días correctamente', () => {
    const propsWithDifferentDayGroup = {
      ...defaultProps,
      dayGroupName: 'Ma-Ju-Sá',
      scheduleRange: '02:00 p.m. a 04:00 p.m.',
    };

    render(<ScheduleDeleteDialog {...propsWithDifferentDayGroup} />);
    
    expect(screen.getByText(/Ma-Ju-Sá de 02:00 p.m. a 04:00 p.m./)).toBeInTheDocument();
  });

  it('debería mostrar horario de día único correctamente', () => {
    const propsWithSingleDay = {
      ...defaultProps,
      dayGroupName: 'Sá',
      scheduleRange: '09:00 a.m. a 12:00 p.m.',
    };

    render(<ScheduleDeleteDialog {...propsWithSingleDay} />);
    
    expect(screen.getByText(/Sá de 09:00 a.m. a 12:00 p.m./)).toBeInTheDocument();
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useNotification } from '@refinedev/core';

import ScheduleTimesList from './list';

// Mock de useNotification
vi.mock('@refinedev/core', () => ({
  useNotification: vi.fn(),
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

describe('ScheduleTimesList', () => {
  const mockOpen = vi.fn();
  const mockScheduleTimes = [
    {
      id: 1,
      days_array: [0, 4], // Lunes y Viernes
      day_group_name: 'Lu-Vi',
      range_text: '08:00 a.m. a 10:00 a.m.',
      start_time: '08:00:00',
      end_time: '10:00:00',
      duration_min: 120,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      days_array: [1, 3], // Martes y Jueves
      day_group_name: 'Ma-Ju',
      range_text: '02:00 p.m. a 04:00 p.m.',
      start_time: '14:00:00',
      end_time: '16:00:00',
      duration_min: 120,
      is_active: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 3,
      days_array: [5], // Sábado
      day_group_name: 'Sá',
      range_text: '09:00 a.m. a 12:00 p.m.',
      start_time: '09:00:00',
      end_time: '12:00:00',
      duration_min: 180,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('test-token');
    (useNotification as any).mockReturnValue({ open: mockOpen });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('debería renderizar el componente correctamente', () => {
    render(<ScheduleTimesList />);
    
    expect(screen.getByText('Configuración de Horarios')).toBeInTheDocument();
    expect(screen.getByText('Agregar Nuevo Horario')).toBeInTheDocument();
  });

  it('debería mostrar estado de carga inicialmente', () => {
    render(<ScheduleTimesList />);
    
    expect(screen.getByText('Cargando horarios...')).toBeInTheDocument();
  });

  it('debería cargar y mostrar los horarios', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockScheduleTimes),
    });
    global.fetch = mockFetch;

    render(<ScheduleTimesList />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/catalog/schedule-times/active',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Lu-Vi')).toBeInTheDocument();
      expect(screen.getByText('Ma-Ju')).toBeInTheDocument();
      expect(screen.getByText('Sá')).toBeInTheDocument();
    });
  });

  it('debería manejar errores de carga', async () => {
    const mockFetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
    global.fetch = mockFetch;

    render(<ScheduleTimesList />);

    await waitFor(() => {
      expect(mockOpen).toHaveBeenCalledWith({
        type: 'error',
        message: 'Error',
        description: 'Network error',
      });
    });
  });

  describe('Formulario de agregar horario', () => {
    beforeEach(async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockScheduleTimes),
      });
      global.fetch = mockFetch;

      render(<ScheduleTimesList />);
      
      await waitFor(() => {
        expect(screen.getByText('Lu-Vi')).toBeInTheDocument();
      });
    });

    it('debería permitir seleccionar días de la semana', async () => {
      const daySelector = screen.getByText('Seleccionar días');
      fireEvent.click(daySelector);

      await waitFor(() => {
        expect(screen.getByText('Lunes')).toBeInTheDocument();
        expect(screen.getByText('Martes')).toBeInTheDocument();
        expect(screen.getByText('Miércoles')).toBeInTheDocument();
      });

      // Seleccionar Lunes y Viernes
      const mondayCheckbox = screen.getByLabelText('Lunes');
      const fridayCheckbox = screen.getByLabelText('Viernes');
      
      fireEvent.click(mondayCheckbox);
      fireEvent.click(fridayCheckbox);

      expect(mondayCheckbox).toBeChecked();
      expect(fridayCheckbox).toBeChecked();
    });

    it('debería permitir ingresar horas de inicio y fin', () => {
      const startTimeInput = screen.getByLabelText('Hora Inicio');
      const endTimeInput = screen.getByLabelText('Hora Fin');

      fireEvent.change(startTimeInput, { target: { value: '08:00' } });
      fireEvent.change(endTimeInput, { target: { value: '10:00' } });

      expect(startTimeInput).toHaveValue('08:00');
      expect(endTimeInput).toHaveValue('10:00');
    });

    it('debería mostrar el rango de tiempo generado', async () => {
      const startTimeInput = screen.getByLabelText('Hora Inicio');
      const endTimeInput = screen.getByLabelText('Hora Fin');

      fireEvent.change(startTimeInput, { target: { value: '08:00' } });
      fireEvent.change(endTimeInput, { target: { value: '10:00' } });

      await waitFor(() => {
        expect(screen.getByText('Rango de tiempo generado:')).toBeInTheDocument();
        expect(screen.getByText('08:00 a.m. a 10:00 a.m.')).toBeInTheDocument();
      });
    });

    it('debería crear un nuevo horario', async () => {
      // Seleccionar días
      const daySelector = screen.getByText('Seleccionar días');
      fireEvent.click(daySelector);
      
      await waitFor(() => {
        const mondayCheckbox = screen.getByLabelText('Lunes');
        fireEvent.click(mondayCheckbox);
      });

      // Ingresar horas
      const startTimeInput = screen.getByLabelText('Hora Inicio');
      const endTimeInput = screen.getByLabelText('Hora Fin');
      fireEvent.change(startTimeInput, { target: { value: '08:00' } });
      fireEvent.change(endTimeInput, { target: { value: '10:00' } });

      // Mock de la respuesta de creación
      const mockCreateFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 4,
          days_array: [0],
          day_group_name: 'Lu',
          range_text: '08:00 a.m. a 10:00 a.m.',
          start_time: '08:00:00',
          end_time: '10:00:00',
          duration_min: 120,
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
        }),
      });
      global.fetch = mockCreateFetch;

      const addButton = screen.getByText('Agregar');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(mockCreateFetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/v1/catalog/schedule-times',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Authorization': 'Bearer test-token',
            }),
            body: expect.stringContaining('"days_array":[0]'),
          })
        );
      });
    });
  });

  describe('Vista de tabla', () => {
    beforeEach(async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockScheduleTimes),
      });
      global.fetch = mockFetch;

      render(<ScheduleTimesList />);
      
      await waitFor(() => {
        expect(screen.getByText('Lu-Vi')).toBeInTheDocument();
      });
    });

    it('debería mostrar la vista de tabla por defecto', () => {
      expect(screen.getByText('Tabla')).toBeInTheDocument();
      expect(screen.getByText('Grupo de Días')).toBeInTheDocument();
      expect(screen.getByText('Horarios')).toBeInTheDocument();
      expect(screen.getByText('Duración')).toBeInTheDocument();
      expect(screen.getByText('Estado')).toBeInTheDocument();
      expect(screen.getByText('Acciones')).toBeInTheDocument();
    });

    it('debería permitir cambiar a vista agrupada', async () => {
      const groupedButton = screen.getByText('Agrupada');
      fireEvent.click(groupedButton);

      await waitFor(() => {
        expect(screen.getByText('Grupo de Días')).toBeInTheDocument();
        expect(screen.getByText('Horarios')).toBeInTheDocument();
        expect(screen.getByText('Duración')).toBeInTheDocument();
        expect(screen.getByText('Estado')).toBeInTheDocument();
        expect(screen.getByText('Acciones')).toBeInTheDocument();
      });
    });

    it('debería mostrar los horarios ordenados por días', () => {
      const tableRows = screen.getAllByRole('row');
      // Primera fila es el header, luego las filas de datos
      expect(tableRows).toHaveLength(4); // 1 header + 3 data rows
    });

    it('debería permitir editar horarios inline', async () => {
      const firstStartTime = screen.getByText('08:00:00');
      fireEvent.click(firstStartTime);

      await waitFor(() => {
        const timeInput = screen.getByDisplayValue('08:00:00');
        expect(timeInput).toBeInTheDocument();
      });

      fireEvent.change(screen.getByDisplayValue('08:00:00'), { 
        target: { value: '09:00:00' } 
      });
      fireEvent.blur(screen.getByDisplayValue('09:00:00'));

      // Verificar que se llamó la API de actualización
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/catalog/schedule-times/1'),
          expect.objectContaining({
            method: 'PATCH',
          })
        );
      });
    });

    it('debería permitir cambiar el estado con el switch', async () => {
      const switches = screen.getAllByRole('switch');
      const firstSwitch = switches[0];
      
      expect(firstSwitch).toBeChecked(); // El primer horario está activo

      fireEvent.click(firstSwitch);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/v1/catalog/schedule-times/1',
          expect.objectContaining({
            method: 'PATCH',
            body: expect.stringContaining('"is_active":false'),
          })
        );
      });
    });

    it('debería abrir el modal de confirmación al eliminar', async () => {
      const deleteButtons = screen.getAllByRole('button', { name: '' });
      const firstDeleteButton = deleteButtons.find(button => 
        button.querySelector('svg') // Botón con ícono de basura
      );
      
      if (firstDeleteButton) {
        fireEvent.click(firstDeleteButton);

        await waitFor(() => {
          expect(screen.getByText('Eliminar Horario')).toBeInTheDocument();
          expect(screen.getByText(/¿Estás seguro de que deseas eliminar el horario/)).toBeInTheDocument();
          expect(screen.getByText(/Lu-Vi de 08:00 a.m. a 10:00 a.m./)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Vista agrupada', () => {
    beforeEach(async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockScheduleTimes),
      });
      global.fetch = mockFetch;

      render(<ScheduleTimesList />);
      
      await waitFor(() => {
        expect(screen.getByText('Lu-Vi')).toBeInTheDocument();
      });

      // Cambiar a vista agrupada
      const groupedButton = screen.getByText('Agrupada');
      fireEvent.click(groupedButton);
    });

    it('debería mostrar los horarios agrupados por día', async () => {
      await waitFor(() => {
        expect(screen.getByText('Lu-Vi')).toBeInTheDocument();
        expect(screen.getByText('Ma-Ju')).toBeInTheDocument();
        expect(screen.getByText('Sá')).toBeInTheDocument();
      });
    });

    it('debería mostrar la duración en columna separada', () => {
      expect(screen.getByText('120 min')).toBeInTheDocument();
      expect(screen.getByText('180 min')).toBeInTheDocument();
    });

    it('debería mostrar el estado en columna separada', () => {
      const switches = screen.getAllByRole('switch');
      expect(switches).toHaveLength(3);
    });

    it('debería mostrar las acciones en columna separada', () => {
      const deleteButtons = screen.getAllByRole('button', { name: '' });
      const deleteButtonsWithIcon = deleteButtons.filter(button => 
        button.querySelector('svg')
      );
      expect(deleteButtonsWithIcon).toHaveLength(3);
    });
  });

  describe('Utilidades de horarios', () => {
    beforeEach(async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockScheduleTimes),
      });
      global.fetch = mockFetch;

      render(<ScheduleTimesList />);
      
      await waitFor(() => {
        expect(screen.getByText('Lu-Vi')).toBeInTheDocument();
      });
    });

    it('debería generar nombres de grupos de días correctamente', async () => {
      const daySelector = screen.getByText('Seleccionar días');
      fireEvent.click(daySelector);

      await waitFor(() => {
        const mondayCheckbox = screen.getByLabelText('Lunes');
        const fridayCheckbox = screen.getByLabelText('Viernes');
        
        fireEvent.click(mondayCheckbox);
        fireEvent.click(fridayCheckbox);
      });

      // Verificar que se muestra "Lu-Vi"
      expect(screen.getByText('Lu-Vi')).toBeInTheDocument();
    });

    it('debería generar rangos de tiempo correctamente', async () => {
      const startTimeInput = screen.getByLabelText('Hora Inicio');
      const endTimeInput = screen.getByLabelText('Hora Fin');

      fireEvent.change(startTimeInput, { target: { value: '08:00' } });
      fireEvent.change(endTimeInput, { target: { value: '10:00' } });

      await waitFor(() => {
        expect(screen.getByText('08:00 a.m. a 10:00 a.m.')).toBeInTheDocument();
      });
    });

    it('debería ordenar horarios por días de la semana', () => {
      const tableRows = screen.getAllByRole('row');
      // Verificar que los horarios están ordenados por days_array
      // Lu-Vi (días [0,4]) debería aparecer antes que Ma-Ju (días [1,3])
      expect(tableRows[1]).toHaveTextContent('Lu-Vi');
      expect(tableRows[2]).toHaveTextContent('Ma-Ju');
    });
  });

  describe('Manejo de errores', () => {
    it('debería manejar errores de creación', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockScheduleTimes),
      });
      global.fetch = mockFetch;

      render(<ScheduleTimesList />);
      
      await waitFor(() => {
        expect(screen.getByText('Lu-Vi')).toBeInTheDocument();
      });

      // Simular error en creación
      const mockCreateError = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ detail: 'Error de validación' }),
      });
      global.fetch = mockCreateError;

      // Intentar crear un horario
      const startTimeInput = screen.getByLabelText('Hora Inicio');
      const endTimeInput = screen.getByLabelText('Hora Fin');
      fireEvent.change(startTimeInput, { target: { value: '08:00' } });
      fireEvent.change(endTimeInput, { target: { value: '10:00' } });

      const addButton = screen.getByText('Agregar');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(mockOpen).toHaveBeenCalledWith({
          type: 'error',
          message: 'Error',
          description: 'Error de validación',
        });
      });
    });

    it('debería manejar errores de actualización', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockScheduleTimes),
      });
      global.fetch = mockFetch;

      render(<ScheduleTimesList />);
      
      await waitFor(() => {
        expect(screen.getByText('Lu-Vi')).toBeInTheDocument();
      });

      // Simular error en actualización
      const mockUpdateError = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ detail: 'Horario no encontrado' }),
      });
      global.fetch = mockUpdateError;

      // Intentar editar un horario
      const firstStartTime = screen.getByText('08:00:00');
      fireEvent.click(firstStartTime);

      await waitFor(() => {
        const timeInput = screen.getByDisplayValue('08:00:00');
        fireEvent.change(timeInput, { target: { value: '09:00:00' } });
        fireEvent.blur(timeInput);
      });

      await waitFor(() => {
        expect(mockOpen).toHaveBeenCalledWith({
          type: 'error',
          message: 'Error',
          description: 'Horario no encontrado',
        });
      });
    });
  });
});

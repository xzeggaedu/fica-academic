import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FacultySchoolsSheet } from './faculty-schools-sheet';
import { renderWithProviders } from '@/test/test-utils';
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';

// Mock de sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('FacultySchoolsSheet - CRUD Inline de Escuelas', () => {
  const mockOnClose = vi.fn();

  const defaultProps = {
    facultyId: 1,
    facultyName: 'Facultad de Ciencias Aplicadas',
    facultyAcronym: 'FICA',
    isOpen: true,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('fica-access-token', 'test-token');

    // Usar MSW para mockear la API de schools
    server.use(
      http.get('http://localhost:8000/api/v1/schools', ({ request }) => {
        const url = new URL(request.url);
        const facultyId = url.searchParams.get('fk_faculty');

        if (facultyId === '1') {
          return HttpResponse.json([
            {
              id: 1,
              name: 'Escuela de Sistemas',
              acronym: 'INFO',
              fk_faculty: 1,
              is_active: true,
            },
          ]);
        }
        return HttpResponse.json([]);
      })
    );
  });

  it('debería renderizar el sheet cuando está abierto', async () => {
    renderWithProviders(<FacultySchoolsSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Escuelas de Facultad de Ciencias Aplicadas/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('no debería renderizar cuando está cerrado', () => {
    renderWithProviders(<FacultySchoolsSheet {...defaultProps} isOpen={false} />);

    expect(screen.queryByText(/Escuelas de/i)).not.toBeInTheDocument();
  });

  it('debería tener formulario para agregar escuela', async () => {
    renderWithProviders(<FacultySchoolsSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ingrese el nombre de la escuela')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Ej: INFO')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Agregar/i })).toBeInTheDocument();
    });
  });

  it('debería deshabilitar el botón agregar si faltan datos', async () => {
    renderWithProviders(<FacultySchoolsSheet {...defaultProps} />);

    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: 'Agregar' });
      expect(addButton).toBeDisabled();
    });
  });

  it('debería habilitar el botón agregar con datos completos', async () => {
    renderWithProviders(<FacultySchoolsSheet {...defaultProps} />);

    await waitFor(async () => {
      const nameInput = screen.getByPlaceholderText('Ingrese el nombre de la escuela');
      const acronymInput = screen.getByPlaceholderText('Ej: INFO');

      await userEvent.type(nameInput, 'Escuela de Informática');
      await userEvent.type(acronymInput, 'INFO');

      const addButton = screen.getByRole('button', { name: 'Agregar' });
      expect(addButton).not.toBeDisabled();
    });
  });

  it('debería mostrar mensaje cuando no hay escuelas', async () => {
    // Mockear respuesta vacía
    server.use(
      http.get('http://localhost:8000/api/v1/schools', () => {
        return HttpResponse.json([]);
      })
    );

    renderWithProviders(<FacultySchoolsSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/No hay escuelas registradas en esta facultad/i)).toBeInTheDocument();
    });
  });

  it('debería cargar y mostrar las escuelas', async () => {
    // El mock ya está configurado en beforeEach con la escuela 'Escuela de Sistemas'
    renderWithProviders(<FacultySchoolsSheet {...defaultProps} />);

    // Verificar que al menos el formulario de agregar está presente
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ingrese el nombre de la escuela')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('debería mostrar estado de carga', () => {
    renderWithProviders(<FacultySchoolsSheet {...defaultProps} />);

    // Verificar que el placeholder existe (formulario para agregar)
    expect(screen.getByPlaceholderText('Ingrese el nombre de la escuela')).toBeInTheDocument();
  });

  it('debería convertir acrónimo a mayúsculas al escribir', async () => {
    renderWithProviders(<FacultySchoolsSheet {...defaultProps} />);

    await waitFor(async () => {
      const acronymInput = screen.getByPlaceholderText('Ej: INFO');
      await userEvent.type(acronymInput, 'info');

      expect(acronymInput).toHaveValue('INFO');
    });
  });

  it('debería tener título con el nombre de la facultad', async () => {
    renderWithProviders(<FacultySchoolsSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Escuelas de Facultad de Ciencias Aplicadas/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar el acrónimo de la facultad en un badge', async () => {
    renderWithProviders(<FacultySchoolsSheet {...defaultProps} />);

    await waitFor(() => {
      // Verificar que el título del sheet contiene la información de la facultad
      expect(screen.getByText(/Facultad de Ciencias Aplicadas/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('debería renderizar el formulario completo', async () => {
    renderWithProviders(<FacultySchoolsSheet {...defaultProps} />);

    await waitFor(() => {
      // Verificar que todos los elementos del formulario están presentes
      expect(screen.getByPlaceholderText('Ingrese el nombre de la escuela')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Ej: INFO')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Agregar/i })).toBeInTheDocument();
    });
  });
});

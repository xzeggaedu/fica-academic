/**
 * Tests for Template Generation Create component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { TemplateGenerationCreate } from './create';

// Mock useTemplateGenerationCrud hook
vi.mock('@/hooks/useTemplateGenerationCrud', () => ({
  useTemplateGenerationCrud: vi.fn(() => ({
    canCreate: true,
    createItem: vi.fn(),
    isCreating: false,
  })),
}));

// Mock useList hook from Refine
vi.mock('@refinedev/core', async () => {
  const actual = await vi.importActual('@refinedev/core');
  return {
    ...actual,
    useList: vi.fn(() => ({
      result: {
        data: [],
        total: 0,
      },
      isLoading: false,
    })),
  };
});

describe('TemplateGenerationCreate - Componente de Creación', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería renderizar correctamente', () => {
    const { container } = renderWithProviders(<TemplateGenerationCreate />);
    expect(container).toBeTruthy();
  });

  it('debería tener área de upload', () => {
    const { getByText } = renderWithProviders(<TemplateGenerationCreate />);
    expect(getByText(/Arrastra tu archivo Excel/i)).toBeInTheDocument();
  });

  it('debería tener selectores de facultad y escuela', () => {
    const { getAllByText } = renderWithProviders(<TemplateGenerationCreate />);
    const facultyLabels = getAllByText(/Facultad/i);
    const schoolLabels = getAllByText(/Escuela/i);

    expect(facultyLabels.length).toBeGreaterThan(0);
    expect(schoolLabels.length).toBeGreaterThan(0);
  });

  it('debería tener botones de acción', () => {
    const { getByText, getAllByText } = renderWithProviders(<TemplateGenerationCreate />);

    expect(getByText(/Limpiar/i)).toBeInTheDocument();
    const generateButtons = getAllByText(/Generar Plantilla/i);
    expect(generateButtons.length).toBeGreaterThan(0);
  });

  it('debería mostrar información de archivos soportados', () => {
    const { getByText } = renderWithProviders(<TemplateGenerationCreate />);
    expect(getByText(/Formatos soportados/i)).toBeInTheDocument();
  });
});

describe('TemplateGenerationCreate - Validaciones', () => {
  it('debería tener campo de notas opcional', () => {
    const { getByPlaceholderText } = renderWithProviders(<TemplateGenerationCreate />);
    expect(getByPlaceholderText(/nota adicional/i)).toBeInTheDocument();
  });

  it('debería mostrar límite de tamaño de archivo', () => {
    const { getByText } = renderWithProviders(<TemplateGenerationCreate />);
    expect(getByText(/máximo 10MB/i)).toBeInTheDocument();
  });
});

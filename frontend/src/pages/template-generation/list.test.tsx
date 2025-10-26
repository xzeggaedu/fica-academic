/**
 * Tests for Template Generation List component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { TemplateGenerationList } from './list';

// Mock useTemplateGenerationCrud hook
vi.mock('@/hooks/useTemplateGenerationCrud', () => ({
  useTemplateGenerationCrud: vi.fn(() => ({
    itemsList: [],
    total: 0,
    isLoading: false,
    isError: false,
    isCreateModalOpen: false,
    isEditModalOpen: false,
    editingItem: null,
    isCreating: false,
    isUpdating: false,
    canAccess: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    createItem: vi.fn(),
    updateItem: vi.fn(),
    invalidate: vi.fn(),
    openCreateModal: vi.fn(),
    closeCreateModal: vi.fn(),
    openEditModal: vi.fn(),
    closeEditModal: vi.fn(),
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

describe('TemplateGenerationList - Componente de Lista', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería renderizar correctamente', () => {
    const { container } = renderWithProviders(<TemplateGenerationList />);
    expect(container).toBeTruthy();
  });

  it('debería mostrar mensaje cuando no hay plantillas', () => {
    const { getByText } = renderWithProviders(<TemplateGenerationList />);
    expect(getByText(/No se encontraron plantillas generadas/i)).toBeInTheDocument();
  });

  it('debería tener área de búsqueda', () => {
    const { getByPlaceholderText } = renderWithProviders(<TemplateGenerationList />);
    const searchInput = getByPlaceholderText(/Buscar por archivo/i);
    expect(searchInput).toBeInTheDocument();
  });
});

describe('TemplateGenerationList - Formulario de Creación', () => {
  it('debería renderizar área de upload de archivo', () => {
    const { getByText } = renderWithProviders(<TemplateGenerationList />);
    expect(getByText(/Arrastra tu archivo/i)).toBeInTheDocument();
  });

  it('debería tener botones de acción', () => {
    const { getAllByText } = renderWithProviders(<TemplateGenerationList />);
    const buttons = getAllByText(/Generar Plantilla/i);
    expect(buttons.length).toBeGreaterThan(0);
  });
});

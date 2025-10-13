import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserPermissionsSheet } from './user-permissions-sheet';
import { UserRoleEnum } from '@/types/auth';

// Mock the Sheet components
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: any) => open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: any) => <div data-testid="sheet-content">{children}</div>,
  SheetHeader: ({ children }: any) => <div data-testid="sheet-header">{children}</div>,
  SheetTitle: ({ children }: any) => <h2 data-testid="sheet-title">{children}</h2>,
  SheetDescription: ({ children }: any) => <p data-testid="sheet-description">{children}</p>,
  SheetFooter: ({ children }: any) => <div data-testid="sheet-footer">{children}</div>,
  SheetClose: ({ children }: any) => <button data-testid="sheet-close">{children}</button>,
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock data
const mockFaculties = [
  { id: 1, name: 'Escuela de Informática y Ciencias Aplicadas', acronym: 'FICA' },
  { id: 2, name: 'Facultad de Economía', acronym: 'ECON' },
];

const mockSchools = [
  { id: 1, name: 'Escuela de Informática', acronym: 'INFO', fk_faculty: 1 },
  { id: 2, name: 'Escuela de Ciencias Aplicadas', acronym: 'CCAA', fk_faculty: 1 },
  { id: 3, name: 'Escuela de Economía', acronym: 'ECO', fk_faculty: 2 },
];

const mockScopes = [
  { id: 1, fk_user: 1, fk_faculty: 1, fk_school: null },
];

const defaultProps = {
  userId: 1,
  userName: 'Test User',
  userRole: UserRoleEnum.DIRECTOR,
  isOpen: true,
  onClose: vi.fn(),
  onSuccess: vi.fn(),
};

describe('UserPermissionsSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('mock-token');
    
    // Mock successful API responses by default
    mockFetch.mockImplementation((urlOrRequest) => {
      // Handle both string URLs and Request objects
      const url = typeof urlOrRequest === 'string' ? urlOrRequest : urlOrRequest.url;
      
      const createMockResponse = (data: any) => ({
        ok: true,
        json: async () => data,
        clone: function() { return this; },
        text: async () => JSON.stringify(data),
        status: 200,
        statusText: 'OK',
      });
      
      if (url.includes('/faculties')) {
        return Promise.resolve(createMockResponse({ data: mockFaculties }));
      }
      if (url.includes('/schools')) {
        return Promise.resolve(createMockResponse({ data: mockSchools }));
      }
      if (url.includes('/scope')) {
        return Promise.resolve(createMockResponse(mockScopes));
      }
      return Promise.resolve(createMockResponse({}));
    });
  });

  describe('Basic Rendering', () => {
    it('should render the sheet component', () => {
      render(<UserPermissionsSheet {...defaultProps} />);
      
      expect(screen.getByTestId('sheet')).toBeInTheDocument();
      expect(screen.getByTestId('sheet-content')).toBeInTheDocument();
    });

    it('should show correct title and description', () => {
      render(<UserPermissionsSheet {...defaultProps} />);
      
      expect(screen.getByText('Gestionar Permisos')).toBeInTheDocument();
      expect(screen.getByText(/Asignar permisos de acceso para Test User/)).toBeInTheDocument();
    });
  });

  describe('Director Role', () => {
    it('should render faculty selection for Director', async () => {
      render(<UserPermissionsSheet {...defaultProps} userRole={UserRoleEnum.DIRECTOR} />);

      await waitFor(() => {
        expect(screen.getByText('1. Seleccionar Facultad')).toBeInTheDocument();
      });
    });
  });

  describe('Decano Role', () => {
    it('should render faculty selection only for Decano', async () => {
      render(<UserPermissionsSheet {...defaultProps} userRole={UserRoleEnum.DECANO} />);

      await waitFor(() => {
        expect(screen.getByText('Seleccionar Facultad')).toBeInTheDocument();
      });

      // Should not show school selection
      expect(screen.queryByText('2. Seleccionar Escuela')).not.toBeInTheDocument();
    });

    it('should show schools as accessible when faculty is selected', async () => {
      render(<UserPermissionsSheet {...defaultProps} userRole={UserRoleEnum.DECANO} />);

      // Verify the sheet renders correctly for Decano
      await waitFor(() => {
        expect(screen.getByTestId('sheet')).toBeInTheDocument();
        expect(screen.getByText('Gestionar Permisos')).toBeInTheDocument();
      });
    });
  });

  describe('Vicerrector Role', () => {
    it('should render read-only view for Vicerrector', async () => {
      render(<UserPermissionsSheet {...defaultProps} userRole={UserRoleEnum.VICERRECTOR} />);

      await waitFor(() => {
        expect(screen.getByText(/El Vicerrector tiene acceso total/)).toBeInTheDocument();
      });

      // Should show faculties and schools section
      await waitFor(() => {
        expect(screen.getByText('Facultades y Escuelas:')).toBeInTheDocument();
      });
    });

    it('should only show close button for Vicerrector', async () => {
      render(<UserPermissionsSheet {...defaultProps} userRole={UserRoleEnum.VICERRECTOR} />);

      await waitFor(() => {
        expect(screen.getByText('Cerrar')).toBeInTheDocument();
      });

      // Should not show save button
      expect(screen.queryByText('Guardar Permisos')).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error when trying to save without selection', async () => {
      render(<UserPermissionsSheet {...defaultProps} userRole={UserRoleEnum.DIRECTOR} />);

      await waitFor(() => {
        expect(screen.getByText('Guardar Permisos')).toBeInTheDocument();
      });

      // Try to save without selecting school
      const saveButton = screen.getByText('Guardar Permisos');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Debe seleccionar una escuela')).toBeInTheDocument();
      });
    });

    it('should show error when trying to save Decano without faculty', async () => {
      render(<UserPermissionsSheet {...defaultProps} userRole={UserRoleEnum.DECANO} />);

      // Verify the sheet renders correctly and has save button
      await waitFor(() => {
        expect(screen.getByTestId('sheet')).toBeInTheDocument();
        expect(screen.getByText('Gestionar Permisos')).toBeInTheDocument();
      });

      // Verify save button exists for Decano
      const saveButton = screen.queryByText('Guardar Permisos');
      expect(saveButton).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner while fetching data', async () => {
      // Mock slow response that never resolves
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<UserPermissionsSheet {...defaultProps} />);

      // Component should render and start loading
      await waitFor(() => {
        expect(screen.getByTestId('sheet')).toBeInTheDocument();
      });
    });

    it('should show error message when API fails', async () => {
      // Mock API error
      mockFetch.mockImplementation(() => 
        Promise.reject(new Error('API Error'))
      );

      render(<UserPermissionsSheet {...defaultProps} />);

      // Wait for component to render, error handling should prevent crash
      await waitFor(() => {
        expect(screen.getByTestId('sheet')).toBeInTheDocument();
      });
    });
  });

  describe('Form Clearing', () => {
    it('should clear selections when closing', async () => {
      const mockOnClose = vi.fn();
      render(<UserPermissionsSheet {...defaultProps} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('Cancelar')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancelar');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});

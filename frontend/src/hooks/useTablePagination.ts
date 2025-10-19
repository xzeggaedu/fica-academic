import { useState, useEffect } from "react";
import { useList } from "@refinedev/core";
import type { BaseRecord, HttpError, CrudFilters, CanReturnType } from "@refinedev/core";

interface UseTablePaginationProps<TData extends BaseRecord = BaseRecord> {
  resource: string;
  canAccess?: CanReturnType;
  initialPageSize?: number;
  additionalFilters?: CrudFilters;
  queryOptions?: {
    enabled?: boolean;
    [key: string]: any;
  };
}

interface UseTablePaginationReturn<TData extends BaseRecord = BaseRecord> {
  // Data
  data: TData[];
  total: number;
  isLoading: boolean;
  isError: boolean;

  // Pagination
  currentPage: number;
  pageSize: number;
  totalPages: number;
  setCurrentPage: (page: number | ((prev: number) => number)) => void;
  setPageSize: (size: number) => void;
  canPrevPage: boolean;
  canNextPage: boolean;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;

  // Search
  searchValue: string;
  setSearchValue: (value: string) => void;
  debouncedSearch: string;

  // Filters
  filters: CrudFilters;
}

export function useTablePagination<TData extends BaseRecord = BaseRecord>({
  resource,
  canAccess,
  initialPageSize = 10,
  additionalFilters = [],
  queryOptions = {},
}: UseTablePaginationProps<TData>): UseTablePaginationReturn<TData> {
  // Estados para paginación y búsqueda
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchValue);
      setCurrentPage(1); // Reset a página 1 cuando cambia la búsqueda
    }, 500);

    return () => clearTimeout(timer);
  }, [searchValue]);

  // Configurar filtros combinados
  const searchFilter: CrudFilters = debouncedSearch
    ? [{ field: "search", operator: "contains" as const, value: debouncedSearch }]
    : [];

  const filters: CrudFilters = [...searchFilter, ...additionalFilters];

  // useList hook
  const { query, result } = useList<TData, HttpError>({
    resource,
    pagination: {
      currentPage,
      pageSize,
      mode: "server",
    },
    filters,
    queryOptions: {
      enabled: canAccess?.can ?? true,
      ...queryOptions,
    },
    successNotification: false,
    errorNotification: false,
  });

  const data = result?.data || [];
  const total = result?.total || 0;
  const isLoading = query.isLoading;
  const isError = query.isError;

  // Cálculos de paginación
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrevPage = currentPage > 1;
  const canNextPage = currentPage < totalPages;

  // Funciones de navegación
  const nextPage = () => {
    if (canNextPage) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const prevPage = () => {
    if (canPrevPage) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  return {
    // Data
    data,
    total,
    isLoading,
    isError,

    // Pagination
    currentPage,
    pageSize,
    totalPages,
    setCurrentPage,
    setPageSize,
    canPrevPage,
    canNextPage,
    nextPage,
    prevPage,
    goToPage,

    // Search
    searchValue,
    setSearchValue,
    debouncedSearch,

    // Filters
    filters,
  };
}

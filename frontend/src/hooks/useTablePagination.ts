import { useState, useEffect, useMemo } from "react";

interface UseTablePaginationProps<TData> {
  data: TData[];
  initialPageSize?: number;
}

/**
 * Hook stateless para manejar paginación y búsqueda de datos
 * NO hace requests, solo maneja la lógica de UI
 */
export const useTablePagination = <TData extends Record<string, any>>({
  data,
  initialPageSize = 10,
}: UseTablePaginationProps<TData>) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce del search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchValue);
      setCurrentPage(1); // Reset a página 1 cuando se busca
    }, 500);
    return () => clearTimeout(timer);
  }, [searchValue]);

  // Filtrar datos por búsqueda (busca en todos los campos string)
  const filteredData = useMemo(() => {
    if (!debouncedSearch.trim()) return data;

    const searchLower = debouncedSearch.toLowerCase();
    return data.filter((item) => {
      return Object.values(item).some((value) => {
        if (typeof value === "string") {
          return value.toLowerCase().includes(searchLower);
        }
        if (typeof value === "number") {
          return value.toString().includes(searchLower);
        }
        return false;
      });
    });
  }, [data, debouncedSearch]);

  // Calcular paginación
  const total = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Ajustar página actual si está fuera de rango
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Datos de la página actual
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Controles de navegación
  const canPrevPage = currentPage > 1;
  const canNextPage = currentPage < totalPages;

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
    const targetPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(targetPage);
  };

  return {
    // Datos paginados
    paginatedData,
    total,

    // Estado de paginación
    currentPage,
    pageSize,
    totalPages,
    canPrevPage,
    canNextPage,

    // Controles de paginación
    nextPage,
    prevPage,
    goToPage,
    setPageSize,

    // Búsqueda
    searchValue,
    setSearchValue,
  };
};

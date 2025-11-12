import React from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationEllipsis,
} from "../pagination";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  canPrevPage: boolean;
  canNextPage: boolean;
  onPageChange: (page: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  windowSize?: number;
  className?: string;
}

export function TablePagination({
  currentPage,
  totalPages,
  canPrevPage,
  canNextPage,
  onPageChange,
  onPrevPage,
  onNextPage,
  windowSize = 5,
  className,
}: TablePaginationProps) {
  // Calcular ventana de páginas
  const half = Math.floor(windowSize / 2);
  let start = Math.max(1, currentPage - half);
  const end = Math.min(totalPages, start + windowSize - 1);

  // Ajustar si no hay suficientes páginas
  if (end - start + 1 < windowSize) {
    start = Math.max(1, end - windowSize + 1);
  }

  const pages: number[] = [];
  for (let p = start; p <= end; p++) {
    pages.push(p);
  }

  const showLeftEllipsis = start > 1;
  const showRightEllipsis = end < totalPages;

  return (
    <Pagination className={className}>
      <PaginationContent>
        {/* Botón Anterior */}
        <PaginationItem className="mr-4">
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (canPrevPage) onPrevPage();
            }}
            aria-label="Ir a la página anterior"
            className={!canPrevPage ? "pointer-events-none opacity-50" : undefined}
          >
            Anterior
          </PaginationLink>
        </PaginationItem>

        {/* Primera página + ellipsis si es necesario */}
        {showLeftEllipsis && (
          <>
            <PaginationItem>
              <PaginationLink
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onPageChange(1);
                }}
                isActive={currentPage === 1}
              >
                1
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          </>
        )}

        {/* Páginas en la ventana actual */}
        {pages.map((page) => (
          <PaginationItem key={page}>
            <PaginationLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onPageChange(page);
              }}
              isActive={currentPage === page}
            >
              {page}
            </PaginationLink>
          </PaginationItem>
        ))}

        {/* Ellipsis + última página si es necesario */}
        {showRightEllipsis && (
          <>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onPageChange(totalPages);
                }}
                isActive={currentPage === totalPages}
              >
                {totalPages}
              </PaginationLink>
            </PaginationItem>
          </>
        )}

        {/* Botón Siguiente */}
        <PaginationItem className="ml-4">
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (canNextPage) onNextPage();
            }}
            aria-label="Ir a la página siguiente"
            className={!canNextPage ? "pointer-events-none opacity-50" : undefined}
          >
            Siguiente
          </PaginationLink>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

import React, { useState, useMemo } from "react";
import { useList, CanAccess, useCan } from "@refinedev/core";
import { useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/data/table";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { TableFilters } from "../../components/ui/data/table-filters";
import { FacultyActions } from "../../components/ui/faculties/faculty-actions";
import { FacultyCreateButton } from "../../components/ui/faculties/faculty-create-button";
import { FacultySchoolsSheet } from "../../components/ui/faculties/faculty-schools-sheet";
import { getTableColumnClass } from "../../components/refine-ui/theme/theme-table";
import { Unauthorized } from "../unauthorized";

export const FacultyList = () => {
  // Verificar permisos primero
  const { data: canAccess } = useCan({
    resource: "faculty",
    action: "list",
  });

  const { query, result } = useList({
    resource: "faculty",
    queryOptions: {
      enabled: canAccess?.can ?? false, // Solo hacer fetch si tiene permisos
    },
  });
  const queryClient = useQueryClient();

  // Función para refrescar datos directamente
  const refreshData = async () => {
    await queryClient.refetchQueries({
      predicate: (query) => {
        const queryKey = query.queryKey;
        return queryKey.some(key =>
          typeof key === 'string' && key.includes('faculty')
        );
      }
    });
  };

  // Estados para filtros y columnas
  const [searchValue, setSearchValue] = useState("");
  const [visibleColumns, setVisibleColumns] = useState([
    "id", "name", "acronym", "is_active", "created_at", "actions"
  ]);

  // Estado para el sheet de escuelas
  const [selectedFacultyId, setSelectedFacultyId] = useState<number | null>(null);
  const [selectedFacultyName, setSelectedFacultyName] = useState<string>("");
  const [selectedFacultyAcronym, setSelectedFacultyAcronym] = useState<string>("");
  const [isSchoolsSheetOpen, setIsSchoolsSheetOpen] = useState(false);

  // Configuración de columnas disponibles
  const availableColumns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Nombre" },
    { key: "acronym", label: "Acrónimo" },
    { key: "is_active", label: "Estado" },
    { key: "created_at", label: "Fecha de Creación" },
    { key: "actions", label: "Acciones" },
  ];

  // Filtrar datos basado en búsqueda
  const filteredData = useMemo(() => {
    if (!result.data) return [];

    if (!searchValue.trim()) return result.data;

    const searchLower = searchValue.toLowerCase();
    return result.data.filter((faculty: any) =>
      faculty.name?.toLowerCase().includes(searchLower) ||
      faculty.acronym?.toLowerCase().includes(searchLower)
    );
  }, [result.data, searchValue]);

  // Helper function para formatear fechas
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString);
        return 'Fecha inválida';
      }
      return date.toLocaleDateString('es-ES');
    } catch (error) {
      console.warn('Error parsing date:', dateString, error);
      return 'Error de fecha';
    }
  };

  // Función para alternar visibilidad de columnas
  const handleColumnToggle = (columnKey: string) => {
    setVisibleColumns(prev =>
      prev.includes(columnKey)
        ? prev.filter(col => col !== columnKey)
        : [...prev, columnKey]
    );
  };

  // Función para manejar éxito de operaciones
  const handleSuccess = async () => {
    await refreshData();
  };

  // Función para manejar click en la fila
  const handleRowClick = (faculty: any, event: React.MouseEvent) => {
    // Evitar abrir si se hizo click en la celda de acciones
    const target = event.target as HTMLElement;
    if (target.closest('[data-actions-cell]')) {
      return;
    }

    setSelectedFacultyId(faculty.id);
    setSelectedFacultyName(faculty.name);
    setSelectedFacultyAcronym(faculty.acronym);
    setIsSchoolsSheetOpen(true);
  };

  return (
    <CanAccess
      resource="faculty"
      action="list"
      fallback={<Unauthorized resourceName="facultades y escuelas" message="Solo los administradores pueden gestionar facultades y escuelas." />}
    >
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Facultades</CardTitle>
                <CardDescription>
                  Gestiona todas las facultades del sistema
                </CardDescription>
              </div>
              <FacultyCreateButton onSuccess={handleSuccess} />
            </div>
          </CardHeader>
          <CardContent>
            {/* Filtros y controles */}
            <TableFilters
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              visibleColumns={visibleColumns}
              onColumnToggle={handleColumnToggle}
              availableColumns={availableColumns}
            />

            {/* Tabla */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleColumns.includes("id") && <TableHead className={getTableColumnClass("id")}>ID</TableHead>}
                    {visibleColumns.includes("name") && <TableHead className={getTableColumnClass("name")}>Nombre</TableHead>}
                    {visibleColumns.includes("acronym") && <TableHead className={getTableColumnClass("acronym")}>Acrónimo</TableHead>}
                    {visibleColumns.includes("is_active") && <TableHead className={getTableColumnClass("status")}>Estado</TableHead>}
                    {visibleColumns.includes("created_at") && <TableHead className={getTableColumnClass("date")}>Fecha de Creación</TableHead>}
                    {visibleColumns.includes("actions") && <TableHead className={getTableColumnClass("actions")}></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={visibleColumns.length} className="text-center py-8">
                        Cargando facultades...
                      </TableCell>
                    </TableRow>
                  ) : query.error ? (
                    <TableRow>
                      <TableCell colSpan={visibleColumns.length} className="text-center py-8 text-red-600">
                        Error al cargar facultades: {query.error.message}
                      </TableCell>
                    </TableRow>
                  ) : filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={visibleColumns.length} className="text-center py-8">
                        {searchValue ? "No se encontraron facultades que coincidan con la búsqueda" : "No hay facultades registradas"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((faculty: any) => (
                      <TableRow
                        key={faculty.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={(e) => handleRowClick(faculty, e)}
                      >
                        {visibleColumns.includes("id") && (
                          <TableCell className={getTableColumnClass("id", "font-medium")}>{faculty.id}</TableCell>
                        )}
                        {visibleColumns.includes("name") && (
                          <TableCell className={getTableColumnClass("name", "font-semibold")}>{faculty.name}</TableCell>
                        )}
                        {visibleColumns.includes("acronym") && (
                          <TableCell className={getTableColumnClass("acronym")}>
                            <Badge variant="outline" className="font-mono">
                              {faculty.acronym}
                            </Badge>
                          </TableCell>
                        )}
                        {visibleColumns.includes("is_active") && (
                          <TableCell className={getTableColumnClass("status")}>
                            <Badge variant={faculty.is_active ? "default" : "secondary"}>
                              {faculty.is_active ? "Activa" : "Inactiva"}
                            </Badge>
                          </TableCell>
                        )}
                        {visibleColumns.includes("created_at") && (
                          <TableCell className={getTableColumnClass("date")}>
                            {formatDate(faculty.created_at)}
                          </TableCell>
                        )}
                        {visibleColumns.includes("actions") && (
                          <TableCell className={getTableColumnClass("actions")} data-actions-cell onClick={(e) => e.stopPropagation()}>
                            <FacultyActions
                              facultyId={faculty.id}
                              facultyName={faculty.name}
                              facultyAcronym={faculty.acronym}
                              onSuccess={handleSuccess}
                            />
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Información de resultados */}
            {!query.isLoading && !query.error && (
              <div className="flex items-center justify-between px-2 py-4 text-sm text-muted-foreground">
                <div>
                  Mostrando {filteredData.length} de {result.data?.length || 0} facultades
                  {searchValue && ` (filtradas por "${searchValue}")`}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sheet para gestionar escuelas desde la fila */}
      {selectedFacultyId && (
        <FacultySchoolsSheet
          facultyId={selectedFacultyId}
          facultyName={selectedFacultyName}
          facultyAcronym={selectedFacultyAcronym}
          isOpen={isSchoolsSheetOpen}
          onClose={() => {
            setIsSchoolsSheetOpen(false);
            setSelectedFacultyId(null);
            setSelectedFacultyName("");
            setSelectedFacultyAcronym("");
          }}
        />
      )}
    </CanAccess>
  );
};

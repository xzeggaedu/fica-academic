import React, { useState, useMemo } from "react";
import { useList, CanAccess, useCan, useUpdate, useCreate, useInvalidate } from "@refinedev/core";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/data/table";
import { Badge } from "../../components/ui/badge";
import { CheckCircle, Clock, XCircle } from "lucide-react";
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
    sorters: [
      {
        field: "name",
        order: "asc",
      },
    ],
    queryOptions: {
      enabled: canAccess?.can ?? false, // Solo hacer fetch si tiene permisos
    },
  });

  // Hooks de Refine para CRUD
  const { mutate: softDeleteFaculty, mutation: deleteState } = useUpdate();
  const { mutate: createFaculty, mutation: createState } = useCreate();
  const invalidate = useInvalidate();
  const isDeleting = deleteState.isPending;
  const isCreating = createState.isPending;

  // Función para manejar creación de facultad
  const handleCreateFaculty = (
    facultyData: { name: string; acronym: string; is_active: boolean },
    onSuccessCallback?: () => void
  ) => {
    createFaculty(
      {
        resource: "faculty",
        values: facultyData,
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          toast.success('Facultad creada exitosamente', {
            description: `La facultad "${facultyData.name}" ha sido creada correctamente.`,
            richColors: true,
          });

          if (onSuccessCallback) {
            onSuccessCallback();
          }
        },
        onError: (error) => {
          console.error("FacultyList - Create error:", error);
          const errorMessage = error?.message || "Error desconocido al crear facultad";

          toast.error('Error al crear facultad', {
            description: errorMessage,
            richColors: true,
          });
        },
      }
    );
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
  const handleSuccess = () => {
    // Refine invalida automáticamente
  };

  // Función para manejar eliminación de facultad (soft delete)
  const handleDeleteFaculty = (facultyId: number, facultyName: string) => {
    softDeleteFaculty(
      {
        resource: "soft-delete",
        id: facultyId,
        values: { type: "faculty" },
        successNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({
            resource: "faculty",
            invalidates: ["list"],
          });

          toast.success('Facultad movida a papelera', {
            description: `La facultad "${facultyName}" ha sido movida a la papelera de reciclaje.`,
            richColors: true,
          });
        },
        onError: (error) => {
          console.error("Error deleting faculty:", error);
          toast.error('Error al mover a papelera', {
            description: error?.message || 'Error desconocido',
            richColors: true,
          });
        },
      }
    );
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
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-2">
            <Clock className="h-6 w-6 mt-1" />
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold">Facultades</h1>
            </div>
          </div>
        </div>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Lista de facultades y escuelas</CardTitle>
                <CardDescription>
                  Aquí puedes ver y administrar el listado de facultades y sus respectivas escuelas.
                </CardDescription>
              </div>
              <FacultyCreateButton
                onSuccess={handleSuccess}
                onCreate={handleCreateFaculty}
                isCreating={isCreating}
              />
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleColumns.includes("id") && <TableHead className={getTableColumnClass("id")}>ID</TableHead>}
                    {visibleColumns.includes("name") && <TableHead className={getTableColumnClass("name")}>Nombre</TableHead>}
                    {visibleColumns.includes("acronym") && <TableHead className={getTableColumnClass("acronym")}>Acrónimo</TableHead>}
                    {visibleColumns.includes("is_active") && <TableHead className="text-center w-[50px]">Estado</TableHead>}
                    {visibleColumns.includes("created_at") && <TableHead className={getTableColumnClass("date")}>Fecha de Creación</TableHead>}
                    {visibleColumns.includes("actions") && <TableHead className="text-center w-[100px] max-w-[30px]"></TableHead>}
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
                          <TableCell className="text-center w-[100px]">
                            <div className="flex justify-center">
                              {faculty.is_active ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-600" />
                              )}
                            </div>
                          </TableCell>
                        )}
                        {visibleColumns.includes("created_at") && (
                          <TableCell className={getTableColumnClass("date")}>
                            {formatDate(faculty.created_at)}
                          </TableCell>
                        )}
                        {visibleColumns.includes("actions") && (
                          <TableCell className="text-center w-[30px] max-w-[30px]" data-actions-cell onClick={(e) => e.stopPropagation()}>
                            <FacultyActions
                              facultyId={faculty.id}
                              facultyName={faculty.name}
                              facultyAcronym={faculty.acronym}
                              onSuccess={handleSuccess}
                              onDelete={handleDeleteFaculty}
                              isDeleting={isDeleting}
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

import React, { useState, useEffect } from "react";
import { CanAccess } from "@refinedev/core";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/forms/input";
import { Label } from "@/components/ui/forms/label";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { TableFilters } from "@/components/ui/data/table-filters";
import { TablePagination } from "@/components/ui/data/table-pagination";
import type { Term, TermCreate, TermUpdate } from "@/types/api";
import { getTableColumnClass } from "@/components/refine-ui/theme/theme-table";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Unauthorized } from "../unauthorized";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTablePagination } from "@/hooks/useTablePagination";
import { useTermsCrud } from "@/hooks/useTermsCrud";

export const TermsList = () => {
  // Hook principal de ciclos académicos con todas las operaciones CRUD
  const {
    canCreate,
    itemsList: termsData,
    isLoading: termsLoading,
    isError: termsError,
    createItem: createTerm,
    updateItem: updateTerm,
    softDeleteItem: softDeleteTerm,
    updateSingleField,
    isCreating: creating,
    isUpdating: updating,
    isDeleting: deleting,
    canDelete,
    canEdit,
  } = useTermsCrud();

  // Hook de paginación y búsqueda (stateless)
  const {
    paginatedData: termsList,
    total,
    currentPage,
    totalPages,
    canPrevPage,
    canNextPage,
    nextPage,
    prevPage,
    goToPage,
    searchValue,
    setSearchValue,
  } = useTablePagination<Term>({
    data: termsData,
    initialPageSize: 10,
  });

  // Estados locales
  const [error, setError] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState([
    "id", "term", "year", "description", "start_date", "end_date", "actions"
  ]);

  // Estados para el formulario de creación
  const [newTerm, setNewTerm] = useState<TermCreate>({
    term: 1,
    year: new Date().getFullYear(),
    start_date: "",
    end_date: "",
    description: "",
  });

  // Estados para edición inline (específicos de UI)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TermUpdate>({});

  useEffect(() => {
    if (termsError) {
      setError("Error al cargar los ciclos académicos");
    } else {
      setError(null);
    }
  }, [termsError]);

  // Función local para validar fechas
  const validateDates = (startDate: string, endDate: string): boolean => {
    if (!startDate || !endDate) {
      toast.error("Error de validación", {
        description: "Las fechas de inicio y fin son requeridas.",
        richColors: true,
      });
      return false;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      toast.error("Error de validación", {
        description: "La fecha de fin debe ser posterior a la fecha de inicio.",
        richColors: true,
      });
      return false;
    }

    return true;
  };

  // Función local para validar año
  const validateYear = (year: number): boolean => {
    const currentYear = new Date().getFullYear();
    if (year < currentYear - 5 || year > currentYear + 5) {
      toast.error("Error de validación", {
        description: `El año debe estar entre ${currentYear - 5} y ${currentYear + 5}.`,
        richColors: true,
      });
      return false;
    }
    return true;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTerm.term || !newTerm.year || !newTerm.start_date || !newTerm.end_date) {
      toast.error("Error", {
        description: "Por favor complete todos los campos requeridos",
        richColors: true,
      });
      return;
    }

    // Validaciones
    if (!validateYear(newTerm.year)) return;
    if (!validateDates(newTerm.start_date, newTerm.end_date)) return;

    const termData: TermCreate = {
      ...newTerm,
    };

    createTerm(termData, () => {
      setNewTerm({
        term: 1,
        year: new Date().getFullYear(),
        start_date: "",
        end_date: "",
        description: "",
      });
    });
  };

  const handleEdit = (term: Term, field?: string) => {
    setEditingId(term.id);
    setEditingField(field ?? null);
    setEditForm({
      term: term.term,
      year: term.year,
      start_date: term.start_date,
      end_date: term.end_date,
      description: term.description,
    });
  };

  const saveSingleField = (
    id: number,
    field: keyof TermUpdate,
    value: string | number | undefined
  ) => {
    // Obtener el valor actual para comparación
    const current = termsList.find((t) => t.id === id);
    if (!current) return;

    const currentValue = (current as any)[field];

    // Verificar si el valor ha cambiado
    if (value === currentValue) {
      // No hay cambios, cancelar edición sin hacer save
      setEditingId(null);
      setEditingField(null);
      setEditForm({});
      return;
    }

    // Validaciones específicas por campo
    if (field === 'year' && typeof value === 'number') {
      if (!validateYear(value)) return;
    }

    if (field === 'start_date' || field === 'end_date') {
      const currentTerm = termsList.find((t) => t.id === id);
      if (!currentTerm) return;

      const startDate = field === 'start_date' ? value as string : currentTerm.start_date;
      const endDate = field === 'end_date' ? value as string : currentTerm.end_date;

      if (!validateDates(startDate, endDate)) return;
    }

    // Usar la función del hook para actualizar con optimistic updates
    updateSingleField(id, field, value, currentValue, () => {
      setEditingId(null);
      setEditingField(null);
      setEditForm({});
    });
  };

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [termToDelete, setTermToDelete] = useState<{ id: number; name: string } | null>(null);

  const openDeleteDialog = (id: number, name: string) => {
    setTermToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!termToDelete) return;
    const { id, name } = termToDelete;
    softDeleteTerm(id, name, () => {
      setDeleteDialogOpen(false);
      setTermToDelete(null);
    });
  };

  // Configuración de columnas disponibles
  const availableColumns = [
    { key: "id", label: "ID" },
    { key: "term", label: "Ciclo" },
    { key: "year", label: "Año" },
    { key: "description", label: "Descripción" },
    { key: "start_date", label: "Fecha Inicio" },
    { key: "end_date", label: "Fecha Fin" },
    { key: "actions", label: "Acciones" },
  ];

  if (termsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando ciclos académicos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <CanAccess
      resource="terms"
      action="list"
      fallback={<Unauthorized resourceName="ciclos académicos" message="Solo los administradores pueden gestionar ciclos académicos." />}
    >
      <div className="container mx-auto py-6 space-y-6 max-w-[98%]">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Ciclos Académicos</h1>
            <p className="text-muted-foreground">
              Gestiona los ciclos académicos y sus períodos de duración.
            </p>
          </div>
        </div>

        {/* Formulario de creación */}
        {canCreate?.can && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Agregar Nuevo Ciclo Académico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                {canCreate?.can && (
                  <div className="flex gap-4 items-end">
                    <div className="space-y-2">
                      <Label htmlFor="term">Ciclo *</Label>
                      <Input
                        id="term"
                        type="number"
                        min="1"
                        max="10"
                        value={newTerm.term}
                        onChange={(e) =>
                          setNewTerm({ ...newTerm, term: parseInt(e.target.value) || 1 })
                        }
                        placeholder="Ej: 1"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="year">Año *</Label>
                      <Input
                        id="year"
                        type="number"
                        min="2020"
                        max="2030"
                        value={newTerm.year}
                        onChange={(e) =>
                          setNewTerm({ ...newTerm, year: parseInt(e.target.value) || new Date().getFullYear() })
                        }
                        placeholder="Ej: 2025"
                        required
                      />
                    </div>

                    <div className="space-y-2 flex-2">
                      <Label htmlFor="description">Descripción</Label>
                      <Input
                        id="description"
                        value={newTerm.description || ""}
                        onChange={(e) =>
                          setNewTerm({ ...newTerm, description: e.target.value })
                        }
                        placeholder="Ej: Primer Ciclo 2025"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="start_date">Fecha Inicio *</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={newTerm.start_date}
                        onChange={(e) =>
                          setNewTerm({ ...newTerm, start_date: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="end_date">Fecha Fin *</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={newTerm.end_date}
                        onChange={(e) =>
                          setNewTerm({ ...newTerm, end_date: e.target.value })
                        }
                        required
                      />
                    </div>

                    {/* Botón submit */}
                    <div className="space-y-2">
                      <Label className="invisible lg:visible">&nbsp;</Label>
                      <Button type="submit" disabled={creating} className="w-full">
                        {creating ? "Creando..." : "Agregar Ciclo"}
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        )}

        {/* Tabla de ciclos académicos */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Ciclos Académicos ({total})</CardTitle>
            <CardDescription>
              Aquí puedes ver y administrar el listado de ciclos académicos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filtros y selector de columnas */}
            <TableFilters
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              searchPlaceholder="Buscar por ciclo, año o descripción..."
              availableColumns={availableColumns}
              visibleColumns={visibleColumns}
              onVisibleColumnsChange={setVisibleColumns}
            />

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleColumns.includes("id") && <TableHead className={getTableColumnClass("id")}>ID</TableHead>}
                    {visibleColumns.includes("term") && <TableHead>Ciclo</TableHead>}
                    {visibleColumns.includes("year") && <TableHead>Año</TableHead>}
                    {visibleColumns.includes("description") && <TableHead>Descripción</TableHead>}
                    {visibleColumns.includes("start_date") && <TableHead>Fecha Inicio</TableHead>}
                    {visibleColumns.includes("end_date") && <TableHead>Fecha Fin</TableHead>}
                    {canDelete?.can && visibleColumns.includes("actions") && <TableHead className="text-center w-[100px]">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>on
                <TableBody>
                  {termsList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                        {searchValue ? "No se encontraron ciclos académicos" : "No hay ciclos académicos registrados"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    termsList.map((term: Term) => (
                      <TableRow key={term.id}>
                        {/* ID */}
                        {visibleColumns.includes("id") && (
                          <TableCell className={getTableColumnClass("id")}>{term.id}</TableCell>
                        )}

                        {/* Ciclo */}
                        {visibleColumns.includes("term") && (
                          <TableCell>
                            {canEdit?.can && editingId === term.id && (!editingField || editingField === 'term') ? (
                              <Input
                                type="number"
                                min="1"
                                max="10"
                                value={editForm.term || ""}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, term: parseInt(e.target.value) || 1 })
                                }
                                onBlur={() => saveSingleField(term.id, 'term', editForm.term)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    saveSingleField(term.id, 'term', editForm.term);
                                  }
                                }}
                                className="w-20"
                              />
                            ) : (
                              <span
                                className="font-mono font-semibold cursor-pointer hover:underline"
                                onClick={() => handleEdit(term, 'term')}
                              >
                                {term.term}
                              </span>
                            )}
                          </TableCell>
                        )}

                        {/* Año */}
                        {visibleColumns.includes("year") && (
                          <TableCell>
                            {canEdit?.can && editingId === term.id && (!editingField || editingField === 'year') ? (
                              <Input
                                type="number"
                                min="2020"
                                max="2030"
                                value={editForm.year || ""}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, year: parseInt(e.target.value) || new Date().getFullYear() })
                                }
                                onBlur={() => saveSingleField(term.id, 'year', editForm.year)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    saveSingleField(term.id, 'year', editForm.year);
                                  }
                                }}
                                className="w-24"
                              />
                            ) : (
                              <span
                                className="cursor-pointer hover:underline"
                                onClick={() => handleEdit(term, 'year')}
                              >
                                {term.year}
                              </span>
                            )}
                          </TableCell>
                        )}

                        {/* Descripción */}
                        {visibleColumns.includes("description") && (
                          <TableCell>
                            {canEdit?.can && editingId === term.id && (!editingField || editingField === 'description') ? (
                              <Input
                                value={editForm.description || ""}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, description: e.target.value })
                                }
                                onBlur={() => saveSingleField(term.id, 'description', editForm.description)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    saveSingleField(term.id, 'description', editForm.description);
                                  }
                                }}
                                className="w-48"
                              />
                            ) : (
                              <span
                                className="cursor-pointer hover:underline"
                                onClick={() => handleEdit(term, 'description')}
                              >
                                {term.description || "Sin descripción"}
                              </span>
                            )}
                          </TableCell>
                        )}

                        {/* Fecha Inicio */}
                        {visibleColumns.includes("start_date") && (
                          <TableCell>
                            {canEdit?.can && editingId === term.id && (!editingField || editingField === 'start_date') ? (
                              <Input
                                type="date"
                                value={editForm.start_date || ""}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, start_date: e.target.value })
                                }
                                onBlur={() => saveSingleField(term.id, 'start_date', editForm.start_date)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    saveSingleField(term.id, 'start_date', editForm.start_date);
                                  }
                                }}
                                className="w-40"
                              />
                            ) : (
                              <span
                                className="cursor-pointer hover:underline"
                                onClick={() => handleEdit(term, 'start_date')}
                              >
                                {new Date(term.start_date).toLocaleDateString('es-SV')}
                              </span>
                            )}
                          </TableCell>
                        )}

                        {/* Fecha Fin */}
                        {visibleColumns.includes("end_date") && (
                          <TableCell>
                            {canEdit?.can && editingId === term.id && (!editingField || editingField === 'end_date') ? (
                              <Input
                                type="date"
                                value={editForm.end_date || ""}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, end_date: e.target.value })
                                }
                                onBlur={() => saveSingleField(term.id, 'end_date', editForm.end_date)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    saveSingleField(term.id, 'end_date', editForm.end_date);
                                  }
                                }}
                                className="w-40"
                              />
                            ) : (
                              <span
                                className="cursor-pointer hover:underline"
                                onClick={() => handleEdit(term, 'end_date')}
                              >
                                {new Date(term.end_date).toLocaleDateString('es-SV')}
                              </span>
                            )}
                          </TableCell>
                        )}

                        {/* Acciones */}
                        {canDelete?.can && visibleColumns.includes("actions") && (
                          <TableCell className="text-center">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => openDeleteDialog(term.id, term.description || `Ciclo ${term.term}/${term.year}`)}
                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Eliminar</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        )}

                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Paginación */}
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              canPrevPage={canPrevPage}
              canNextPage={canNextPage}
              onPageChange={goToPage}
              onPrevPage={prevPage}
              onNextPage={nextPage}
              className="mt-4"
            />
          </CardContent>
        </Card>

        {/* Confirm delete dialog */}
        <DeleteConfirmDialog
          entityType="ciclo académico"
          entityName={termToDelete?.name || ""}
          isOpen={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setTermToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          isDeleting={deleting}
          gender="m"
        />
      </div>
    </CanAccess>
  );
};

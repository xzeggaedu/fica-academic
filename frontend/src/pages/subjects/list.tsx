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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Save, X, ChevronDown, Clock } from "lucide-react";
import { TableFilters } from "@/components/ui/data/table-filters";
import { TablePagination } from "@/components/ui/data/table-pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/forms/checkbox";
import type { Subject, SubjectCreate, SubjectUpdate, School } from "@/types/api";
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
import { useSubjectsCrud } from "@/hooks/useSubjectsCrud";
import { useFacultiesCrud } from "@/hooks/useFacultiesCrud";
import { useSchoolsCrud } from "@/hooks/useSchoolsCrud";

export const SubjectsList = () => {
  // Hook principal de asignaturas con todas las operaciones CRUD
  const {
    canAccess,
    canCreate,
    canEdit,
    canDelete,
    itemsList: subjectsData,
    isLoading: subjectsLoading,
    isError: subjectsError,
    createItem: createSubject,
    updateItem: updateSubject,
    softDeleteItem: softDeleteSubject,
    updateSingleField,
    isCreating: creating,
    isUpdating: updating,
    isDeleting: deleting,
  } = useSubjectsCrud();

  // Hooks para entidades relacionadas
  const {
    itemsList: faculties,
    isLoading: facultiesLoading,
  } = useFacultiesCrud({ isActiveOnly: true });

  const {
    itemsList: schools,
    isLoading: schoolsLoading,
  } = useSchoolsCrud({ isActiveOnly: true });

  // Hook de paginación y búsqueda (stateless)
  const {
    paginatedData: subjectsList,
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
  } = useTablePagination<Subject>({
    data: subjectsData,
    initialPageSize: 10,
  });

  // Calcular loading general
  const loading = subjectsLoading || facultiesLoading || schoolsLoading;

  // Estados locales
  const [error, setError] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState([
    "id", "subject_code", "subject_name", "department_code", "is_bilingual", "schools", "is_active", "actions"
  ]);

  // Estados para el formulario de creación
  const [newSubject, setNewSubject] = useState<SubjectCreate>({
    subject_code: "",
    subject_name: "",
    department_code: "",
    is_bilingual: false,
    school_ids: [],
  });
  const [selectedSchools, setSelectedSchools] = useState<number[]>([]);

  // Estados para edición inline (específicos de UI)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<SubjectUpdate>({});
  const [editingSchools, setEditingSchools] = useState<number[]>([]);
  const [openSchoolsPopoverId, setOpenSchoolsPopoverId] = useState<number | null>(null);

  // Estado para tracking de switches siendo actualizados
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (subjectsError) {
      setError("Error al cargar los cursos");
    } else {
      setError(null);
    }
  }, [subjectsError]);

  // Función local para validar códigos (responsabilidad del componente)
  const validateCode = (code: string, fieldName: string): boolean => {
    if (code.includes(' ')) {
      toast.error("Error de validación", {
        description: `${fieldName} no puede contener espacios. Use guiones o puntos en su lugar.`,
        richColors: true,
      });
      return false;
    }
    return true;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newSubject.subject_code || !newSubject.subject_name || !newSubject.department_code) {
      toast.error("Error", {
        description: "Por favor complete todos los campos requeridos",
        richColors: true,
      });
      return;
    }

    // Validación de espacios en códigos
    if (!validateCode(newSubject.subject_code, "El código del curso")) {
      return;
    }

    if (!validateCode(newSubject.department_code, "El código del departamento")) {
      return;
    }

    if (selectedSchools.length === 0) {
      toast.error("Error", {
        description: "Debe seleccionar al menos una escuela",
        richColors: true,
      });
      return;
    }

    const subjectData: SubjectCreate = {
      ...newSubject,
      school_ids: selectedSchools,
    };

    createSubject(subjectData, () => {
      setNewSubject({
        subject_code: "",
        subject_name: "",
        department_code: "",
        is_bilingual: false,
        school_ids: [],
      });
      setSelectedSchools([]);
    });
  };

  const handleEdit = (subject: Subject, field?: string) => {
    setEditingId(subject.id);
    setEditingField(field ?? null);
    setEditForm({
      subject_code: subject.subject_code,
      subject_name: subject.subject_name,
      department_code: subject.department_code,
      is_bilingual: subject.is_bilingual,
      is_active: subject.is_active,
    });
    setEditingSchools(subject.schools?.map(cs => cs.school_id) || []);
  };

  const saveSingleField = (
    id: number,
    field: keyof SubjectUpdate,
    value: string | boolean | undefined
  ) => {
    // Validación previa para campos de código (responsabilidad del componente)
    if (field === 'subject_code' && typeof value === 'string') {
      if (!validateCode(value, 'El código del curso')) return;
    }
    if (field === 'department_code' && typeof value === 'string') {
      if (!validateCode(value, 'El código del departamento')) return;
    }

    // Obtener el valor actual para comparación
    const current = subjectsList.find((c) => c.id === id);
    if (!current) return;

    const currentValue = (current as any)[field];

    // Usar la función del hook para actualizar con optimistic updates
    updateSingleField(id, field, value, currentValue, () => {
      setEditingId(null);
      setEditingField(null);
      setEditForm({});
    });
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    // Agregar ID al set de toggles en proceso
    setTogglingIds(prev => new Set(prev).add(id));

    updateSubject(
      id,
      { is_active: !currentStatus },
      () => {
        // Quitar ID del set
        setTogglingIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      },
      () => {
        // Quitar ID del set en caso de error también
        setTogglingIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    );
  };

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<{ id: number; name: string } | null>(null);

  const openDeleteDialog = (id: number, name: string) => {
    setSubjectToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!subjectToDelete) return;
    const { id, name } = subjectToDelete;
    softDeleteSubject(id, name, () => {
      setDeleteDialogOpen(false);
      setSubjectToDelete(null);
    });
  };

  // Agrupar escuelas por facultad
  const getSchoolsByFaculty = () => {
    const grouped: Record<number, School[]> = {};
    schools.forEach(school => {
      const facultyKey = (school as any).fk_faculty ?? (school as any).faculty_id;
      if (facultyKey == null) return;
      if (!grouped[facultyKey]) {
        grouped[facultyKey] = [];
      }
      grouped[facultyKey].push(school);
    });
    return grouped;
  };

  const schoolsByFaculty = getSchoolsByFaculty();

  // Configuración de columnas disponibles
  const availableColumns = [
    { key: "id", label: "ID" },
    { key: "subject_code", label: "Código" },
    { key: "subject_name", label: "Nombre de la Asignatura" },
    { key: "department_code", label: "Departamento" },
    { key: "is_bilingual", label: "Bilingüe" },
    { key: "schools", label: "Escuelas" },
    { key: "is_active", label: "Estado" },
    { key: "actions", label: "Acciones" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando cursos...</p>
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
      resource="subjects"
      action="list"
      fallback={<Unauthorized resourceName="asignaturas" message="Solo los administradores pueden gestionar asignaturas." />}
    >
      <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
          <div className="flex items-start gap-2">
            <Clock className="h-6 w-6 mt-1" />
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold">Asignaturas</h1>
            </div>
          </div>
        </div>
        {/* Formulario de creación */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Agregar Nueva Asignatura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="subject_code">Código *</Label>
                  <Input
                    id="subject_code"
                    value={newSubject.subject_code}
                    onChange={(e) =>
                      setNewSubject({ ...newSubject, subject_code: e.target.value.toUpperCase() })
                    }
                    placeholder="Ej: CS101"
                    required
                  />
                </div>

                <div className="space-y-2 flex-2">
                  <Label htmlFor="subject_name">Nombre de la Asignatura *</Label>
                  <Input
                    id="subject_name"
                    value={newSubject.subject_name}
                    onChange={(e) =>
                      setNewSubject({ ...newSubject, subject_name: e.target.value })
                    }
                    placeholder="Ej: Introducción a la Programación"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department_code">Departamento *</Label>
                  <Input
                    id="department_code"
                    value={newSubject.department_code}
                    onChange={(e) =>
                      setNewSubject({ ...newSubject, department_code: e.target.value.toUpperCase() })
                    }
                    placeholder="Ej: CS"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="is_bilingual" className="flex items-center gap-2">
                    Bilingüe
                  </Label>
                  <div className="flex items-center h-9">
                    <Switch
                      id="is_bilingual"
                      checked={newSubject.is_bilingual || false}
                      onCheckedChange={(checked) =>
                        setNewSubject({ ...newSubject, is_bilingual: checked })
                      }
                    />
                  </div>
                </div>

                {/* Escuelas selector (col 4 en lg) */}
                <div className="space-y-2 flex-2">
                  <Label>Escuelas *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {selectedSchools.length > 0
                          ? `${selectedSchools.length} escuelas seleccionadas`
                          : "Seleccionar..."
                        }
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Buscar escuelas..." />
                        <CommandList>
                          <CommandEmpty>No se encontraron escuelas.</CommandEmpty>
                          {faculties.map(faculty => {
                            const facultySchools = schoolsByFaculty[faculty.id] || [];
                            if (facultySchools.length === 0) return null;

                            return (
                              <CommandGroup key={faculty.id} heading={faculty.name}>
                                {facultySchools.map(school => (
                                  <CommandItem
                                    key={school.id}
                                    value={`${school.name} ${school.acronym}`}
                                    onSelect={() => {
                                      if (selectedSchools.includes(school.id)) {
                                        setSelectedSchools(selectedSchools.filter(id => id !== school.id));
                                      } else {
                                        setSelectedSchools([...selectedSchools, school.id]);
                                      }
                                    }}
                                    className="flex items-center space-x-2"
                                  >
                                    <Checkbox
                                      checked={selectedSchools.includes(school.id)}
                                      className="pointer-events-none"
                                    />
                                    <span className="flex-1">{school.name} ({school.acronym})</span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            );
                          })}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Botón submit (col 6 en lg) */}
                <div className="space-y-2">
                  <Label className="invisible lg:visible">&nbsp;</Label>
                  <Button type="submit" disabled={creating} className="w-full">
                    {creating ? "Creando..." : "Agregar Asignatura"}
                  </Button>
                </div>
              </div>

              {/* Mostrar escuelas seleccionadas (debajo del grid en todas las resoluciones) */}
              {selectedSchools.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedSchools.map(schoolId => {
                    const school = schools.find(s => s.id === schoolId);
                    if (!school) return null;

                    return (
                      <div
                        key={schoolId}
                        className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm"
                      >
                        <span>{school.acronym}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedSchools(selectedSchools.filter(id => id !== schoolId))}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Tabla de cursos */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Asignaturas ({total})</CardTitle>
            <CardDescription>
              Aquí puedes ver y administrar el listado de asignaturas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filtros y selector de columnas */}
            <TableFilters
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              searchPlaceholder="Buscar por código, nombre o departamento..."
              availableColumns={availableColumns}
              visibleColumns={visibleColumns}
              onVisibleColumnsChange={setVisibleColumns}
            />

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleColumns.includes("id") && <TableHead className={getTableColumnClass("id")}>ID</TableHead>}
                    {visibleColumns.includes("subject_code") && <TableHead>Código</TableHead>}
                    {visibleColumns.includes("subject_name") && <TableHead>Nombre de la Asignatura</TableHead>}
                    {visibleColumns.includes("department_code") && <TableHead>Departamento</TableHead>}
                    {visibleColumns.includes("is_bilingual") && <TableHead className="text-center w-[100px]">Bilingüe</TableHead>}
                    {visibleColumns.includes("schools") && <TableHead>Escuelas</TableHead>}
                    {visibleColumns.includes("is_active") && <TableHead className="text-center w-[100px]">Estado</TableHead>}
                    {visibleColumns.includes("actions") && <TableHead className="text-center w-[100px]">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjectsList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                        {searchValue ? "No se encontraron asignaturas" : "No hay asignaturas registradas"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    subjectsList.map((subject: Subject) => (
                      <TableRow key={subject.id}>
                        {/* ID */}
                        {visibleColumns.includes("id") && (
                          <TableCell className={getTableColumnClass("id")}>{subject.id}</TableCell>
                        )}

                        {/* Código del Curso */}
                        {visibleColumns.includes("subject_code") && (
                          <TableCell>
                            {editingId === subject.id && (!editingField || editingField === 'subject_code') ? (
                              <Input
                                value={editForm.subject_code || ""}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, subject_code: e.target.value.toUpperCase() })
                                }
                                onBlur={() => saveSingleField(subject.id, 'subject_code', editForm.subject_code)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    saveSingleField(subject.id, 'subject_code', editForm.subject_code);
                                  }
                                }}
                                className="w-32"
                              />
                            ) : (
                              <span
                                className="font-mono font-semibold cursor-pointer hover:underline"
                                onClick={() => handleEdit(subject, 'subject_code')}
                              >
                                {subject.subject_code}
                              </span>
                            )}
                          </TableCell>
                        )}

                        {/* Nombre del Curso */}
                        {visibleColumns.includes("subject_name") && (
                          <TableCell>
                            {editingId === subject.id && (!editingField || editingField === 'subject_name') ? (
                              <Input
                                value={editForm.subject_name || ""}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, subject_name: e.target.value })
                                }
                                onBlur={() => saveSingleField(subject.id, 'subject_name', editForm.subject_name)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    saveSingleField(subject.id, 'subject_name', editForm.subject_name);
                                  }
                                }}
                                className="w-64"
                              />
                            ) : (
                              <span
                                className="cursor-pointer hover:underline"
                                onClick={() => handleEdit(subject, 'subject_name')}
                              >
                                {subject.subject_name}
                              </span>
                            )}
                          </TableCell>
                        )}

                        {/* Departamento */}
                        {visibleColumns.includes("department_code") && (
                          <TableCell>
                            {editingId === subject.id && (!editingField || editingField === 'department_code') ? (
                              <Input
                                value={editForm.department_code || ""}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, department_code: e.target.value.toUpperCase() })
                                }
                                onBlur={() => saveSingleField(subject.id, 'department_code', editForm.department_code)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    saveSingleField(subject.id, 'department_code', editForm.department_code);
                                  }
                                }}
                                className="w-24"
                              />
                            ) : (
                              <span
                                className="font-mono cursor-pointer hover:underline"
                                onClick={() => handleEdit(subject, 'department_code')}
                              >
                                {subject.department_code}
                              </span>
                            )}
                          </TableCell>
                        )}

                        {/* Bilingüe */}
                        {visibleColumns.includes("is_bilingual") && (
                          <TableCell className="text-center">
                            <Checkbox
                              checked={subject.is_bilingual}
                              onCheckedChange={(checked) => {
                                updateSingleField(
                                  subject.id,
                                  'is_bilingual',
                                  checked === true,
                                  subject.is_bilingual
                                );
                              }}
                              disabled={deleting || updating}
                            />
                          </TableCell>
                        )}

                        {/* Escuelas */}
                        {visibleColumns.includes("schools") && (
                          <TableCell>
                            {editingId === subject.id && (!editingField || editingField === 'schools') ? (
                              <Popover
                                open={openSchoolsPopoverId === subject.id}
                                onOpenChange={(open) => {
                                  setOpenSchoolsPopoverId(open ? subject.id : null);
                                  if (!open && editingId === subject.id && (!editingField || editingField === 'schools')) {
                                    setEditingId(null);
                                    setEditingField(null);
                                    setEditingSchools([]);
                                  }
                                }}
                              >
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="sm" className="w-full justify-between">
                                    {editingSchools.length > 0
                                      ? `${editingSchools.length} escuelas`
                                      : "Seleccionar..."}
                                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-0">
                                  <Command>
                                    <CommandInput placeholder="Buscar escuelas..." />
                                    <CommandList>
                                      <CommandEmpty>No se encontraron escuelas.</CommandEmpty>
                                      {faculties.map(faculty => {
                                        const facultySchools = schoolsByFaculty[faculty.id] || [];
                                        if (facultySchools.length === 0) return null;

                                        return (
                                          <CommandGroup key={faculty.id} heading={faculty.name}>
                                            {facultySchools.map(school => (
                                              <CommandItem
                                                key={school.id}
                                                value={`${school.name} ${school.acronym}`}
                                                onSelect={() => {
                                                  const next = editingSchools.includes(school.id)
                                                    ? editingSchools.filter(id => id !== school.id)
                                                    : [...editingSchools, school.id];
                                                  setEditingSchools(next);
                                                  // Guardar solo si cambió la selección
                                                  const currentIds = (subject.schools || []).map((cs) => cs.school_id).sort();
                                                  const nextSorted = [...next].sort();
                                                  const same = currentIds.length === nextSorted.length && currentIds.every((v, i) => v === nextSorted[i]);
                                                  if (same) return;
                                                  // Actualizar escuelas usando la función del hook
                                                  updateSingleField(
                                                    subject.id,
                                                    'school_ids',
                                                    next,
                                                    currentIds,
                                                    undefined,
                                                    () => {
                                                      // Revertir cambio en UI en caso de error
                                                      setEditingSchools(subject.schools?.map((cs) => cs.school_id) || []);
                                                    }
                                                  );
                                                }}
                                                className="flex items-center space-x-2"
                                              >
                                                <Checkbox
                                                  checked={editingSchools.includes(school.id)}
                                                  className="pointer-events-none"
                                                />
                                                <span className="flex-1">{school.name} ({school.acronym})</span>
                                              </CommandItem>
                                            ))}
                                          </CommandGroup>
                                        );
                                      })}
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            ) : (
                              <div
                                className="flex flex-wrap gap-1 cursor-pointer"
                                onClick={() => {
                                  handleEdit(subject, 'schools');
                                  setEditingSchools(subject.schools?.map((cs) => cs.school_id) || []);
                                  setOpenSchoolsPopoverId(subject.id);
                                }}
                              >
                                {subject.schools && subject.schools.length > 0 ? (
                                  subject.schools.map((cs) => {
                                    const school = schools.find(s => s.id === cs.school_id);
                                    return school ? (
                                      <Badge key={cs.id} variant="secondary" className="text-xs">
                                        {school.acronym}
                                      </Badge>
                                    ) : null;
                                  })
                                ) : (
                                  <span className="text-gray-400 text-sm">Sin escuelas</span>
                                )}
                              </div>
                            )}
                          </TableCell>
                        )}

                        {/* Estado */}
                        {visibleColumns.includes("is_active") && (
                          <TableCell className="text-center">
                            <Switch
                              checked={subject.is_active}
                              onCheckedChange={() => handleToggleActive(subject.id, subject.is_active)}
                              disabled={editingId === subject.id || togglingIds.has(subject.id) || updating}
                            />
                          </TableCell>
                        )}

                        {/* Acciones */}
                        {visibleColumns.includes("actions") && (
                          <TableCell className="text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => openDeleteDialog(subject.id, subject.subject_name)}
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Eliminar</p>
                              </TooltipContent>
                            </Tooltip>
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
          entityType="asignatura"
          entityName={subjectToDelete?.name || ""}
          isOpen={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setSubjectToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          isDeleting={deleting}
          gender="f"
        />
      </div>
    </CanAccess>
  );
};

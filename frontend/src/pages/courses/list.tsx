import React, { useState, useMemo, useEffect } from "react";
import { useList, useCreate, useUpdate, useDelete, useInvalidate } from "@refinedev/core";
import { useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/forms/input";
import { Label } from "@/components/ui/forms/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Save, X, ChevronDown } from "lucide-react";
import { TableFilters } from "@/components/ui/data/table-filters";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
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
import type { Course, CourseCreate, CourseUpdate, Faculty, School } from "@/types/api";
import { getTableColumnClass } from "@/components/refine-ui/theme/theme-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const CoursesList = () => {
  const queryClient = useQueryClient();
  const invalidate = useInvalidate();

  // Estados para paginación y búsqueda
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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

  // Configurar filtros para useList
  const filters = debouncedSearch
    ? [{ field: "search", operator: "contains" as const, value: debouncedSearch }]
    : [];

  const { query: coursesQuery, result: coursesResult } = useList({
    resource: "courses",
    pagination: {
      currentPage: currentPage,
      pageSize: pageSize,
      mode: "server",
    },
    filters: filters,
    // disable default notifications
    queryOptions: { meta: { notification: { success: false, error: false } } } as any,
  });

  // Facultades y Escuelas con hooks de Refine
  const { query: facultiesQuery, result: facultiesResult } = useList<Faculty>({
    resource: "faculties",
    pagination: { currentPage: 1, pageSize: 1000, mode: "server" },
    filters: [{ field: "is_active", operator: "eq", value: true }],
  });
  const { query: schoolsQuery, result: schoolsResult } = useList<School>({
    resource: "schools",
    pagination: { currentPage: 1, pageSize: 1000, mode: "server" },
    filters: [{ field: "is_active", operator: "eq", value: true }],
  });

  // Hooks para operaciones CRUD
  const { mutate: createCourse, mutation: createState } = useCreate({
    successNotification: false,
    errorNotification: false,
  } as any);
  const { mutate: updateCourse, mutation: updateState } = useUpdate({
    successNotification: false,
    errorNotification: false,
  } as any);
  const { mutate: deleteCourse, mutation: deleteState } = useDelete();

  const creating = createState.isPending;
  const updating = updateState.isPending;
  const deleting = deleteState.isPending;

  // Estados locales
  const [error, setError] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState([
    "id", "course_code", "course_name", "department_code", "schools", "is_active", "actions"
  ]);

  // Estados para el formulario de creación
  const [newCourse, setNewCourse] = useState<CourseCreate>({
    course_code: "",
    course_name: "",
    department_code: "",
    school_ids: [],
  });
  const [selectedSchools, setSelectedSchools] = useState<number[]>([]);

  // Estados para edición inline
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CourseUpdate>({});
  const [editingSchools, setEditingSchools] = useState<number[]>([]);
  const [openSchoolsPopoverId, setOpenSchoolsPopoverId] = useState<number | null>(null);

  // Función para refrescar datos
  const refreshData = async () => {
    await queryClient.refetchQueries({
      predicate: (query) => {
        const queryKey = query.queryKey;
        return queryKey[0] === "default" &&
               (queryKey[1] as any)?.resource === "courses";
      },
    });
  };


  // Calcular loading y error states
  const faculties = facultiesResult?.data || [];
  const schools = schoolsResult?.data || [];
  const facultiesLoading = facultiesQuery.isLoading;
  const schoolsLoading = schoolsQuery.isLoading;
  const loading = coursesQuery.isLoading || facultiesLoading || schoolsLoading;
  const courses = coursesResult?.data || [];
  const total = coursesResult?.total || 0;

  // Debug: ver qué datos tenemos
  useEffect(() => {
    console.log('Faculties data:', faculties);
    console.log('Schools data:', schools);
    console.log('Faculties loading:', facultiesLoading);
    console.log('Schools loading:', schoolsLoading);
  }, [faculties, schools, facultiesLoading, schoolsLoading]);

  useEffect(() => {
    if (coursesQuery.isError) {
      setError("Error al cargar los cursos");
    } else {
      setError(null);
    }
  }, [coursesQuery.isError]);

  // Forzar refetch al cambiar paginación o búsqueda (seguridad ante caché)
  useEffect(() => {
    console.log("Refetching courses", {currentPage, pageSize, debouncedSearch});
    coursesQuery.refetch();
  }, [currentPage, pageSize, debouncedSearch]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCourse.course_code || !newCourse.course_name || !newCourse.department_code) {
      toast.error("Error", {
        description: "Por favor complete todos los campos requeridos",
        richColors: true,
      });
      return;
    }

    if (selectedSchools.length === 0) {
      toast.error("Error", {
        description: "Debe seleccionar al menos una escuela",
        richColors: true,
      });
      return;
    }

    const courseData: CourseCreate = {
      ...newCourse,
      school_ids: selectedSchools,
    };

    createCourse(
      {
        resource: "courses",
        values: courseData,
      },
      {
        onSuccess: () => {
          toast.success("Éxito", {
            description: "Curso creado exitosamente",
            richColors: true,
          });

          // Limpiar formulario
          setNewCourse({
            course_code: "",
            course_name: "",
            department_code: "",
            school_ids: [],
          });
          setSelectedSchools([]);

          // Recargar lista
          refreshData();
        },
        onError: (error: any) => {
          console.error("Error creating course:", error);
          toast.error("Error", {
            description: "Error al crear el curso",
            richColors: true,
          });
        },
      }
    );
  };

  const handleEdit = (course: Course, field?: string) => {
    setEditingId(course.id);
    setEditingField(field ?? null);
    setEditForm({
      course_code: course.course_code,
      course_name: course.course_name,
      department_code: course.department_code,
      is_active: course.is_active,
    });
    setEditingSchools(course.schools?.map(cs => cs.school_id) || []);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingField(null);
    setEditForm({});
    setEditingSchools([]);
  };

  const handleSaveEdit = async (id: number) => {
    const updateData: CourseUpdate = {
      ...editForm,
      school_ids: editingSchools.length > 0 ? editingSchools : undefined,
    };

    updateCourse(
      {
        resource: "courses",
        id,
        values: updateData,
      },
      {
        onSuccess: () => {
          toast.success("Éxito", {
            description: "Curso actualizado exitosamente",
            richColors: true,
          });
          setEditingId(null);
          setEditForm({});
          setEditingSchools([]);
          refreshData();
        },
        onError: (error: any) => {
          console.error("Error updating course:", error);
          toast.error("Error", {
            description: "Error al actualizar el curso",
            richColors: true,
          });
        },
      }
    );
  };

  // Actualizar cache local de la lista de cursos para evitar refresco manual
  const updateCourseInCache = (updated: Course) => {
    const queries = queryClient.getQueryCache().findAll();
    queries.forEach((q: any) => {
      const key = q.queryKey as any[];
      const resource = (key?.[1] as any)?.resource;
      if (resource === "courses") {
        queryClient.setQueryData(key, (old: any) => {
          if (!old) return old;
          const currentList = Array.isArray(old.data) ? old.data : [];
          const nextList = currentList.map((c: Course) => (c.id === updated.id ? updated : c));
          return { ...old, data: nextList };
        });
      }
    });
  };

  // Fallback: invalidar y refetchear cualquier query relacionada a courses/list
  const hardRefreshCourses = () => {
    const predicate = (q: any) => {
      const keyStr = JSON.stringify(q.queryKey);
      return keyStr.includes('"action":"list"') && keyStr.includes('"resource":"courses"');
    };
    queryClient.invalidateQueries({ predicate });
    queryClient.refetchQueries({ predicate });
  };

  // Optimistic update helpers
  const optimisticUpdateCourse = (id: number, partial: Partial<Course>) => {
    const snapshots: { key: unknown; prev: unknown }[] = [];
    const queries = queryClient.getQueryCache().findAll();
    queries.forEach((q: any) => {
      const key = q.queryKey as any[];
      const resource = (key?.[1] as any)?.resource;
      if (resource === "courses") {
        const prev = queryClient.getQueryData(key);
        snapshots.push({ key, prev });
        queryClient.setQueryData(key, (old: any) => {
          if (!old) return old;
          const list = Array.isArray(old.data) ? old.data : [];
          const next = list.map((c: Course) => (c.id === id ? { ...c, ...partial } : c));
          return { ...old, data: next };
        });
      }
    });
    return snapshots;
  };

  const rollbackOptimistic = (snapshots: { key: unknown; prev: unknown }[]) => {
    snapshots.forEach(({ key, prev }) => queryClient.setQueryData(key, prev));
  };

  const saveSingleField = (
    id: number,
    field: keyof CourseUpdate,
    value: string | boolean | undefined
  ) => {
    // Guardar solo si hay cambios reales
    const current = courses.find((c) => c.id === id);
    if (current) {
      const currentValue = (current as any)[field];
      if (currentValue === value) {
        setEditingId(null);
        setEditingField(null);
        setEditForm({});
        return;
      }
    }
    const payload: CourseUpdate = { [field]: value } as CourseUpdate;
    const snapshots = optimisticUpdateCourse(id, { [field]: value } as Partial<Course>);
    updateCourse(
      {
        resource: "courses",
        id,
        values: payload,
      },
      {
        onSuccess: (resp: any) => {
          const updated = (resp as any)?.data || (resp as any);
          if (updated?.id) updateCourseInCache(updated as Course);
          toast.success("Éxito", { description: "Asignatura actualizada", richColors: true, });
          setEditingId(null);
          setEditingField(null);
          setEditForm({});
          refreshData();
          coursesQuery.refetch();
          invalidate({ resource: "courses", invalidates: ["list"] });
          hardRefreshCourses();
        },
        onError: (error: any) => {
          rollbackOptimistic(snapshots);
          console.error("Error updating field:", error);
          toast.error("Error", { description: "No se pudo actualizar", richColors: true, });
        },
      }
    );
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    updateCourse(
      {
        resource: "courses",
        id,
        values: { is_active: !currentStatus },
      },
      {
        onSuccess: () => {
          toast.success("Éxito", {
            description: `Curso ${!currentStatus ? "activado" : "desactivado"} exitosamente`,
            richColors: true,
          });
          refreshData();
        },
        onError: (error: any) => {
          console.error("Error toggling course status:", error);
          toast.error("Error", {
            description: "Error al cambiar el estado del curso",
            richColors: true,
          });
        },
      }
    );
  };

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<{ id: number; name: string } | null>(null);

  const openDeleteDialog = (id: number, name: string) => {
    setCourseToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!courseToDelete) return;
    const { id, name } = courseToDelete;
    deleteCourse(
      {
        resource: "courses",
        id,
      },
      {
        onSuccess: () => {
          toast.success("Éxito", {
            description: `Asignatura "${name}" eliminada`,
            richColors: true,
          });
          setDeleteDialogOpen(false);
          setCourseToDelete(null);
          refreshData();
        },
        onError: (error: any) => {
          console.error("Error deleting course:", error);
          toast.error("Error", {
            description: "Error al eliminar la asignatura",
            richColors: true,
          });
        },
      }
    );
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
    console.log('Schools grouped by faculty:', grouped);
    return grouped;
  };

  const schoolsByFaculty = getSchoolsByFaculty();

  // Configuración de columnas disponibles
  const availableColumns = [
    { key: "id", label: "ID" },
    { key: "course_code", label: "Código" },
    { key: "course_name", label: "Nombre del Curso" },
    { key: "department_code", label: "Departamento" },
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
    <div className="space-y-6 p-6">
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
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="course_code">Código del Curso *</Label>
                <Input
                  id="course_code"
                  value={newCourse.course_code}
                  onChange={(e) =>
                    setNewCourse({ ...newCourse, course_code: e.target.value.toUpperCase() })
                  }
                  placeholder="Ej: CS101"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="course_name">Nombre del Curso *</Label>
                <Input
                  id="course_name"
                  value={newCourse.course_name}
                  onChange={(e) =>
                    setNewCourse({ ...newCourse, course_name: e.target.value })
                  }
                  placeholder="Ej: Introducción a la Programación"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department_code">Código del Departamento *</Label>
                <Input
                  id="department_code"
                  value={newCourse.department_code}
                  onChange={(e) =>
                    setNewCourse({ ...newCourse, department_code: e.target.value.toUpperCase() })
                  }
                  placeholder="Ej: CS"
                  required
                />
              </div>

              {/* Escuelas selector (col 4 en lg) */}
              <div className="space-y-2">
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

              {/* Botón submit (col 5 en lg) */}
              <div className="space-y-2">
                <Label className="invisible lg:visible">&nbsp;</Label>
                <Button type="submit" disabled={creating} className="w-full">
                  {creating ? "Creando..." : "Agregar Curso"}
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
                  {visibleColumns.includes("course_code") && <TableHead>Código</TableHead>}
                  {visibleColumns.includes("course_name") && <TableHead>Nombre del Curso</TableHead>}
                  {visibleColumns.includes("department_code") && <TableHead>Departamento</TableHead>}
                  {visibleColumns.includes("schools") && <TableHead>Escuelas</TableHead>}
                  {visibleColumns.includes("is_active") && <TableHead>Estado</TableHead>}
                  {visibleColumns.includes("actions") && <TableHead>Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      {debouncedSearch ? "No se encontraron cursos" : "No hay cursos registrados"}
                    </TableCell>
                  </TableRow>
                ) : (
                  courses.map((course: Course) => (
                    <TableRow key={course.id}>
                      {/* ID */}
                      {visibleColumns.includes("id") && (
                        <TableCell className={getTableColumnClass("id")}>{course.id}</TableCell>
                      )}

                      {/* Código del Curso */}
                      {visibleColumns.includes("course_code") && (
                        <TableCell>
                          {editingId === course.id && (!editingField || editingField === 'course_code') ? (
                            <Input
                              value={editForm.course_code || ""}
                              onChange={(e) =>
                                setEditForm({ ...editForm, course_code: e.target.value.toUpperCase() })
                              }
                              onBlur={() => saveSingleField(course.id, 'course_code', editForm.course_code)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  saveSingleField(course.id, 'course_code', editForm.course_code);
                                }
                              }}
                              className="w-32"
                            />
                          ) : (
                            <span
                              className="font-mono font-semibold cursor-pointer hover:underline"
                              onClick={() => handleEdit(course, 'course_code')}
                            >
                              {course.course_code}
                            </span>
                          )}
                        </TableCell>
                      )}

                      {/* Nombre del Curso */}
                      {visibleColumns.includes("course_name") && (
                        <TableCell>
                          {editingId === course.id && (!editingField || editingField === 'course_name') ? (
                            <Input
                              value={editForm.course_name || ""}
                              onChange={(e) =>
                                setEditForm({ ...editForm, course_name: e.target.value })
                              }
                              onBlur={() => saveSingleField(course.id, 'course_name', editForm.course_name)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  saveSingleField(course.id, 'course_name', editForm.course_name);
                                }
                              }}
                              className="w-64"
                            />
                          ) : (
                            <span
                              className="cursor-pointer hover:underline"
                              onClick={() => handleEdit(course, 'course_name')}
                            >
                              {course.course_name}
                            </span>
                          )}
                        </TableCell>
                      )}

                      {/* Departamento */}
                      {visibleColumns.includes("department_code") && (
                        <TableCell>
                          {editingId === course.id && (!editingField || editingField === 'department_code') ? (
                            <Input
                              value={editForm.department_code || ""}
                              onChange={(e) =>
                                setEditForm({ ...editForm, department_code: e.target.value.toUpperCase() })
                              }
                              onBlur={() => saveSingleField(course.id, 'department_code', editForm.department_code)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  saveSingleField(course.id, 'department_code', editForm.department_code);
                                }
                              }}
                              className="w-24"
                            />
                          ) : (
                            <span
                              className="font-mono cursor-pointer hover:underline"
                              onClick={() => handleEdit(course, 'department_code')}
                            >
                              {course.department_code}
                            </span>
                          )}
                        </TableCell>
                      )}

                      {/* Escuelas */}
                      {visibleColumns.includes("schools") && (
                        <TableCell>
                          {editingId === course.id && (!editingField || editingField === 'schools') ? (
                            <Popover
                              open={openSchoolsPopoverId === course.id}
                              onOpenChange={(open) => {
                                setOpenSchoolsPopoverId(open ? course.id : null);
                                if (!open && editingId === course.id && (!editingField || editingField === 'schools')) {
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
                                                const currentIds = (course.schools || []).map((cs) => cs.school_id).sort();
                                                const nextSorted = [...next].sort();
                                                const same = currentIds.length === nextSorted.length && currentIds.every((v, i) => v === nextSorted[i]);
                                                if (same) return;
                                                // Optimistic update for schools
                                                const snapshots = optimisticUpdateCourse(course.id, { schools: next.map((sid) => ({ id: sid, school_id: sid })) as any });
                                                updateCourse(
                                                  {
                                                    resource: "courses",
                                                    id: course.id,
                                                    values: { school_ids: next },
                                                  },
                                                  {
                                                    onSuccess: (resp: any) => {
                                                      const updated = (resp as any)?.data || (resp as any);
                                                      if (updated?.id) updateCourseInCache(updated as Course);
                                                      toast.success("Éxito", {
                                                        description: "Escuelas actualizadas",
                                                        richColors: true,
                                                      });
                                                      // Mantener popover abierto para más selecciones
                                                      refreshData();
                                                      coursesQuery.refetch();
                                                      invalidate({ resource: "courses", invalidates: ["list"] });
                                                      hardRefreshCourses();
                                                    },
                                                    onError: (error: any) => {
                                                      rollbackOptimistic(snapshots as any);
                                                      console.error("Error updating course schools:", error);
                                                      toast.error("Error", {
                                                        description: "No se pudieron actualizar las escuelas",
                                                        richColors: true,
                                                      });
                                                    },
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
                                handleEdit(course, 'schools');
                                setEditingSchools(course.schools?.map((cs) => cs.school_id) || []);
                                setOpenSchoolsPopoverId(course.id);
                              }}
                            >
                              {course.schools && course.schools.length > 0 ? (
                                course.schools.map((cs) => {
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
                        <TableCell>
                          <Switch
                            checked={course.is_active}
                            onCheckedChange={() => handleToggleActive(course.id, course.is_active)}
                            disabled={editingId === course.id}
                          />
                        </TableCell>
                      )}

                      {/* Acciones */}
                      {visibleColumns.includes("actions") && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openDeleteDialog(course.id, course.course_name)}
                              disabled={deleting}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          {(() => {
            const totalPages = Math.max(1, Math.ceil(total / pageSize));
            const canPrev = currentPage > 1;
            const canNext = currentPage < totalPages;

            // Calcular ventana de páginas (máx 5)
            const windowSize = 5;
            const half = Math.floor(windowSize / 2);
            let start = Math.max(1, currentPage - half);
            let end = Math.min(totalPages, start + windowSize - 1);
            if (end - start + 1 < windowSize) {
              start = Math.max(1, end - windowSize + 1);
            }
            const pages = [] as number[];
            for (let p = start; p <= end; p++) pages.push(p);

            return (
              <Pagination className="mt-4">
                <PaginationContent>
                  <PaginationItem  className="mr-4">
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (canPrev) setCurrentPage((p) => p - 1);
                      }}
                      aria-label="Ir a la página anterior"
                      className={!canPrev ? "pointer-events-none opacity-50" : undefined}
                    >
                      Anterior
                    </PaginationLink>
                  </PaginationItem>

                  {start > 1 && (
                    <>
                      <PaginationItem>
                        <PaginationLink
                          href="#"
                          onClick={(e) => { e.preventDefault(); setCurrentPage(1); }}
                        >1</PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    </>
                  )}

                  {pages.map((p) => (
                    <PaginationItem key={p}>
                      <PaginationLink
                        href="#"
                        isActive={p === currentPage}
                        onClick={(e) => { e.preventDefault(); setCurrentPage(p); }}
                      >{p}</PaginationLink>
                    </PaginationItem>
                  ))}

                  {end < totalPages && (
                    <>
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink
                          href="#"
                          onClick={(e) => { e.preventDefault(); setCurrentPage(totalPages); }}
                        >{totalPages}</PaginationLink>
                      </PaginationItem>
                    </>
                  )}

                  <PaginationItem className="ml-4">
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (canNext) setCurrentPage((p) => p + 1);
                      }}
                      aria-label="Ir a la página siguiente"
                      className={!canNext ? "pointer-events-none opacity-50" : undefined}
                    >
                      Siguiente
                    </PaginationLink>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            );
          })()}
        </CardContent>
      </Card>

      {/* Confirm delete dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open) { setDeleteDialogOpen(false); setCourseToDelete(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar asignatura</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas eliminar "{courseToDelete?.name}"? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

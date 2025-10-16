import React, { useState, useMemo, useEffect } from "react";
import { useList, CanAccess, useCan, useUpdate, useInvalidate, useCreate } from "@refinedev/core";
import { toast } from "sonner";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "../../components/ui/pagination";
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
import { Unauthorized } from "../unauthorized";
import { Button } from "../../components/ui/button";
import { ProfessorDeleteDialog } from "../../components/ui/professors/professor-delete-dialog";
import { Eye, Pencil, Trash2, Search, Plus, Settings2, CheckCircle, XCircle, MoreHorizontal, ChevronDown } from "lucide-react";
import { Input } from "../../components/ui/forms/input";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../../components/ui/sheet";
import { Switch } from "../../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/forms/select";

interface Professor {
    id: number;
    professor_id: string;
    professor_name: string;
    institutional_email: string | null;
    personal_email: string | null;
    phone_number: string | null;
    professor_category: string | null;
    academic_title: string | null;
    doctorates: number;
    masters: number;
    is_bilingual: boolean;
    is_paid: boolean;
    is_active: boolean;
    deleted: boolean;
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
}

export const ProfessorList = () => {
    // Verificar permisos primero
    const { data: canAccess } = useCan({
        resource: "professors",
        action: "list",
    });

    // Estados para paginación, filtros y columnas
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Debounce para búsqueda
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1); // Reset a página 1 cuando cambia la búsqueda
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Configurar filtros para useList
    const filters = debouncedSearch
        ? [{ field: "search", operator: "contains" as const, value: debouncedSearch }]
        : [];

    const { query, result } = useList<Professor>({
        resource: "professors",
        pagination: {
            currentPage: currentPage,
            pageSize: pageSize,
            mode: "server",
        },
        filters: filters,
        queryOptions: {
            enabled: canAccess?.can ?? false,
        },
        successNotification: false,
        errorNotification: false,
    });

    const professors = result.data || [];
    const total = result.total || 0;
    const isLoading = query.isLoading;

    // Hooks para operaciones CRUD
    const { mutate: softDeleteProfessor, mutation: deleteState } = useUpdate();
    const { mutate: createProfessor, mutation: createState } = useCreate();
    const { mutate: updateProfessor, mutation: updateState } = useUpdate();
    const invalidate = useInvalidate();
    const isDeleting = deleteState.isPending;
    const isCreating = createState.isPending;
    const isUpdating = updateState.isPending;

    // Función para manejar eliminación de profesor (soft delete)
    const handleDeleteProfessor = (professorId: number, professorName: string) => {
        softDeleteProfessor(
            {
                resource: "soft-delete",
                id: professorId,
                values: { type: "catalog/professors" },
                successNotification: false,
            },
            {
                onSuccess: () => {
                    invalidate({
                        resource: "professors",
                        invalidates: ["list"],
                    });

                    toast.success('Profesor movido a papelera', {
                        description: `El profesor "${professorName}" ha sido movido a la papelera de reciclaje.`,
                        richColors: true,
                    });
                },
                onError: (error) => {
                    console.error("ProfessorList - Soft delete error:", error);
                    toast.error('Error al mover a papelera', {
                        description: error.message,
                        richColors: true,
                    });
                },
            }
        );
    };

    // Función para manejar creación de profesor
    const handleCreateProfessor = (professorData: any, onSuccessCallback?: () => void) => {
        createProfessor(
            {
                resource: "professors",
                values: professorData,
                successNotification: false,
                errorNotification: false,
            },
            {
                onSuccess: () => {
                    toast.success('Profesor creado exitosamente', {
                        description: `El profesor "${professorData.professor_name}" ha sido creado correctamente.`,
                        richColors: true,
                    });
                    if (onSuccessCallback) {
                        onSuccessCallback();
                    }
                },
                onError: (error) => {
                    console.error("ProfessorList - Create error:", error);
                    const errorMessage = error?.message || "Error desconocido al crear profesor";
                    toast.error('Error al crear profesor', {
                        description: errorMessage,
                        richColors: true,
                    });
                },
            }
        );
    };

    // Función para manejar actualización de profesor
    const handleUpdateProfessor = (professorId: number, professorData: any, onSuccessCallback?: () => void) => {
        updateProfessor(
            {
                resource: "professors",
                id: professorId,
                values: professorData,
                successNotification: false,
                errorNotification: false,
            },
            {
                onSuccess: () => {
                    toast.success('Profesor actualizado exitosamente', {
                        description: `El profesor "${professorData.professor_name}" ha sido actualizado correctamente.`,
                        richColors: true,
                    });
                    if (onSuccessCallback) {
                        onSuccessCallback();
                    }
                },
                onError: (error) => {
                    console.error("ProfessorList - Update error:", error);
                    const errorMessage = error?.message || "Error desconocido al actualizar profesor";
                    toast.error('Error al actualizar profesor', {
                        description: errorMessage,
                        richColors: true,
                    });
                },
            }
        );
    };

    // Función para abrir el sheet en modo crear
    const handleOpenCreateSheet = () => {
        setEditingProfessor(null);
        setFormData({
            professor_id: "",
            professor_name: "",
            institutional_email: "",
            personal_email: "",
            phone_number: "",
            professor_category: "",
            academic_title: "",
            doctorates: 0,
            masters: 0,
            is_bilingual: false,
            is_paid: true,
            is_active: true,
        });
        setSheetOpen(true);
    };

    // Función para abrir el sheet en modo editar
    const handleOpenEditSheet = (professor: Professor) => {
        setEditingProfessor(professor);
        setFormData({
            professor_id: professor.professor_id,
            professor_name: professor.professor_name,
            institutional_email: professor.institutional_email || "",
            personal_email: professor.personal_email || "",
            phone_number: professor.phone_number || "",
            professor_category: professor.professor_category || "",
            academic_title: professor.academic_title || "",
            doctorates: professor.doctorates || 0,
            masters: professor.masters || 0,
            is_bilingual: professor.is_bilingual || false,
            is_paid: professor.is_paid || true,
            is_active: professor.is_active || true,
        });
        setSheetOpen(true);
    };

    // Función para cerrar el sheet
    const handleCloseSheet = () => {
        setSheetOpen(false);
        setEditingProfessor(null);
    };

    // Estados para el diálogo de eliminación
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedProfessor, setSelectedProfessor] = useState<{ id: number; name: string } | null>(null);

    // Estados para el sheet de crear/editar
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingProfessor, setEditingProfessor] = useState<Professor | null>(null);
    const [formData, setFormData] = useState({
        professor_id: "",
        professor_name: "",
        institutional_email: "",
        personal_email: "",
        phone_number: "",
        professor_category: "",
        academic_title: "",
        doctorates: 0,
        masters: 0,
        is_bilingual: false,
        is_paid: true,
        is_active: true,
    });

    const [visibleColumns, setVisibleColumns] = useState({
        professor_id: true,
        professor_name: true,
        institutional_email: true,
        professor_category: true,
        academic_title: true,
        doctorates: true,
        masters: true,
        is_bilingual: true,
        is_paid: true,
        is_active: true,
    });

    // Verificar si el usuario no tiene permisos
    if (canAccess?.can === false) {
        return <Unauthorized />;
    }

    return (
        <CanAccess resource="professors" action="list" fallback={<Unauthorized />}>
            <div className="space-y-6 p-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Profesores</h1>
                    <p className="text-muted-foreground">
                        Gestiona el catálogo de profesores de la institución
                    </p>
                </div>

                {/* Card with filters and table */}
                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle>Lista de Profesores</CardTitle>
                                <CardDescription>
                                    {total} profesor(es) en total
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Botón Crear */}
                                <Button onClick={handleOpenCreateSheet}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Crear Profesor
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {/* Barra de búsqueda y selector de columnas */}
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            {/* Buscador */}
                            <div className="relative w-full sm:w-96">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por código, nombre, email o categoría..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            {/* Selector de columnas */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Settings2 className="mr-2 h-4 w-4" />
                                        Columnas
                                        <ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuCheckboxItem
                                        checked={visibleColumns.professor_id}
                                        onCheckedChange={(checked) =>
                                            setVisibleColumns((prev) => ({ ...prev, professor_id: checked }))
                                        }
                                    >
                                        Código
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                        checked={visibleColumns.professor_name}
                                        onCheckedChange={(checked) =>
                                            setVisibleColumns((prev) => ({ ...prev, professor_name: checked }))
                                        }
                                    >
                                        Nombre
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                        checked={visibleColumns.institutional_email}
                                        onCheckedChange={(checked) =>
                                            setVisibleColumns((prev) => ({ ...prev, institutional_email: checked }))
                                        }
                                    >
                                        Email Institucional
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                        checked={visibleColumns.professor_category}
                                        onCheckedChange={(checked) =>
                                            setVisibleColumns((prev) => ({ ...prev, professor_category: checked }))
                                        }
                                    >
                                        Categoría
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                        checked={visibleColumns.academic_title}
                                        onCheckedChange={(checked) =>
                                            setVisibleColumns((prev) => ({ ...prev, academic_title: checked }))
                                        }
                                    >
                                        Título
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                        checked={visibleColumns.doctorates}
                                        onCheckedChange={(checked) =>
                                            setVisibleColumns((prev) => ({ ...prev, doctorates: checked }))
                                        }
                                    >
                                        Doctorados
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                        checked={visibleColumns.masters}
                                        onCheckedChange={(checked) =>
                                            setVisibleColumns((prev) => ({ ...prev, masters: checked }))
                                        }
                                    >
                                        Maestrías
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                        checked={visibleColumns.is_bilingual}
                                        onCheckedChange={(checked) =>
                                            setVisibleColumns((prev) => ({ ...prev, is_bilingual: checked }))
                                        }
                                    >
                                        Bilingüe
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                        checked={visibleColumns.is_paid}
                                        onCheckedChange={(checked) =>
                                            setVisibleColumns((prev) => ({ ...prev, is_paid: checked }))
                                        }
                                    >
                                        En Nómina
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                        checked={visibleColumns.is_active}
                                        onCheckedChange={(checked) =>
                                            setVisibleColumns((prev) => ({ ...prev, is_active: checked }))
                                        }
                                    >
                                        Estado
                                    </DropdownMenuCheckboxItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Tabla */}
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {visibleColumns.professor_id && (
                                            <TableHead className="w-[120px]">Código</TableHead>
                                        )}
                                        {visibleColumns.professor_name && (
                                            <TableHead className="w-[250px]">Nombre</TableHead>
                                        )}
                                        {visibleColumns.institutional_email && (
                                            <TableHead className="w-[250px]">Email Institucional</TableHead>
                                        )}
                                        {visibleColumns.professor_category && (
                                            <TableHead className="w-[120px]">Categoría</TableHead>
                                        )}
                                        {visibleColumns.academic_title && (
                                            <TableHead className="w-[100px]">Título</TableHead>
                                        )}
                                        {visibleColumns.doctorates && (
                                            <TableHead className="w-[100px] text-center">Doctorados</TableHead>
                                        )}
                                        {visibleColumns.masters && (
                                            <TableHead className="w-[100px] text-center">Maestrías</TableHead>
                                        )}
                                        {visibleColumns.is_bilingual && (
                                            <TableHead className="w-[100px] text-center">Bilingüe</TableHead>
                                        )}
                                        {visibleColumns.is_paid && (
                                            <TableHead className="w-[100px] text-center">Nómina</TableHead>
                                        )}
                                        {visibleColumns.is_active && (
                                            <TableHead className="text-center w-[100px]">Estado</TableHead>
                                        )}
                                        <TableHead className="text-center w-[100px] max-w-[100px]">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={Object.values(visibleColumns).filter(Boolean).length + 1}
                                                className="text-center py-8"
                                            >
                                                Cargando profesores...
                                            </TableCell>
                                        </TableRow>
                                    ) : professors.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={Object.values(visibleColumns).filter(Boolean).length + 1}
                                                className="text-center py-8"
                                            >
                                                No se encontraron profesores
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        professors.map((professor) => (
                                            <TableRow key={professor.id}>
                                                {visibleColumns.professor_id && (
                                                    <TableCell>
                                                        <span className="font-mono text-sm">{professor.professor_id}</span>
                                                    </TableCell>
                                                )}
                                                {visibleColumns.professor_name && (
                                                    <TableCell>
                                                        <div className="font-medium">{professor.professor_name}</div>
                                                    </TableCell>
                                                )}
                                                {visibleColumns.institutional_email && (
                                                    <TableCell>
                                                        {professor.institutional_email || (
                                                            <span className="text-muted-foreground">—</span>
                                                        )}
                                                    </TableCell>
                                                )}
                                                {visibleColumns.professor_category && (
                                                    <TableCell>
                                                        {professor.professor_category ? (
                                                            <Badge variant="outline">{professor.professor_category}</Badge>
                                                        ) : (
                                                            <span className="text-muted-foreground">—</span>
                                                        )}
                                                    </TableCell>
                                                )}
                                                {visibleColumns.academic_title && (
                                                    <TableCell>
                                                        {professor.academic_title || (
                                                            <span className="text-muted-foreground">—</span>
                                                        )}
                                                    </TableCell>
                                                )}
                                                {visibleColumns.doctorates && (
                                                    <TableCell className="text-center">
                                                        {professor.doctorates}
                                                    </TableCell>
                                                )}
                                                {visibleColumns.masters && (
                                                    <TableCell className="text-center">
                                                        {professor.masters}
                                                    </TableCell>
                                                )}
                                                {visibleColumns.is_bilingual && (
                                                    <TableCell className="text-center">
                                                        {professor.is_bilingual ? (
                                                            <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                                                        ) : (
                                                            <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                                                        )}
                                                    </TableCell>
                                                )}
                                                {visibleColumns.is_paid && (
                                                    <TableCell className="text-center">
                                                        {professor.is_paid ? (
                                                            <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                                                        ) : (
                                                            <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                                                        )}
                                                    </TableCell>
                                                )}
                                                {visibleColumns.is_active && (
                                                    <TableCell className="text-center w-[100px]">
                                                        {professor.is_active ? (
                                                            <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                                                        ) : (
                                                            <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                                                        )}
                                                    </TableCell>
                                                )}
                                                <TableCell className="text-center w-[100px] max-w-[100px]">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <span className="sr-only">Abrir menú</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => handleOpenEditSheet(professor)}>
                                                                <Pencil className="mr-2 h-4 w-4" />
                                                                Editar
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-destructive"
                                                                onClick={() => {
                                                                    setSelectedProfessor({ id: professor.id, name: professor.professor_name });
                                                                    setDeleteDialogOpen(true);
                                                                }}
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Eliminar
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
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

                            const pages = [];
                            for (let i = start; i <= end; i++) {
                                pages.push(i);
                            }

                            return (
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-4">
                                    <div className="text-sm text-muted-foreground">
                                        Mostrando {professors.length} de {total} profesores
                                    </div>
                                    <Pagination>
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious
                                                    href="#"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        if (canPrev) setCurrentPage(currentPage - 1);
                                                    }}
                                                    className={!canPrev ? "pointer-events-none opacity-50" : ""}
                                                />
                                            </PaginationItem>

                                            {start > 1 && (
                                                <>
                                                    <PaginationItem>
                                                        <PaginationLink
                                                            href="#"
                                                            onClick={(e) => { e.preventDefault(); setCurrentPage(1); }}
                                                        >1</PaginationLink>
                                                    </PaginationItem>
                                                    {start > 2 && (
                                                        <PaginationItem>
                                                            <PaginationEllipsis />
                                                        </PaginationItem>
                                                    )}
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
                                                    {end < totalPages - 1 && (
                                                        <PaginationItem>
                                                            <PaginationEllipsis />
                                                        </PaginationItem>
                                                    )}
                                                    <PaginationItem>
                                                        <PaginationLink
                                                            href="#"
                                                            onClick={(e) => { e.preventDefault(); setCurrentPage(totalPages); }}
                                                        >{totalPages}</PaginationLink>
                                                    </PaginationItem>
                                                </>
                                            )}

                                            <PaginationItem>
                                                <PaginationNext
                                                    href="#"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        if (canNext) setCurrentPage(currentPage + 1);
                                                    }}
                                                    className={!canNext ? "pointer-events-none opacity-50" : ""}
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                </div>
                            );
                        })()}
                    </CardContent>
                </Card>

                {/* Diálogo de eliminación */}
                {selectedProfessor && (
                    <ProfessorDeleteDialog
                        professorId={selectedProfessor.id}
                        professorName={selectedProfessor.name}
                        isOpen={deleteDialogOpen}
                        onClose={() => setDeleteDialogOpen(false)}
                        onDelete={handleDeleteProfessor}
                        isDeleting={isDeleting}
                    />
                )}

                {/* Sheet de crear/editar profesor */}
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                    <SheetContent side="right" className="w-[500px] sm:max-w-[90vw] flex flex-col">
                        <SheetHeader className="flex-shrink-0 px-6">
                            <SheetTitle className="text-xl font-bold">
                                {editingProfessor ? 'Editar Profesor' : 'Crear Profesor'}
                            </SheetTitle>
                            <SheetDescription>
                                {editingProfessor
                                    ? 'Modifica la información del profesor seleccionado.'
                                    : 'Completa la información para crear un nuevo profesor.'
                                }
                            </SheetDescription>
                        </SheetHeader>

                        <div className="flex-1 overflow-y-auto py-0 px-6 space-y-6">
                            {/* Formulario */}
                            <div className="space-y-4">
                                <div><h2 className="text-md font-bold pb-2 border-b border-gray-200">General</h2></div>
                                {/* Fila 1: Código, Nombre, Título */}
                                <div className="flex gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Título</label>
                                        <Select value={formData.academic_title} onValueChange={(value) => setFormData({ ...formData, academic_title: value })}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione Título" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Ing.">Ing.</SelectItem>
                                                <SelectItem value="Lic.">Lic.</SelectItem>
                                                <SelectItem value="Mg.">Dr.</SelectItem>
                                                <SelectItem value="Arq.">Arq.</SelectItem>
                                                <SelectItem value="Arq.">Tec.</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2 flex-1">
                                        <label className="text-sm font-medium">Nombre *</label>
                                        <Input
                                            placeholder=""
                                            value={formData.professor_name}
                                            onChange={(e) => setFormData({ ...formData, professor_name: e.target.value })}
                                        />
                                    </div>

                                </div>

                                {/* Fila 2: Teléfono, Categoría */}
                                <div className="flex gap-4 pb-4">
                                    <div className="space-y-2 flex-1">
                                        <label className="text-sm font-medium">Código *</label>
                                        <Input
                                            placeholder="Ej: P001"
                                            value={formData.professor_id}
                                            onChange={(e) => setFormData({ ...formData, professor_id: e.target.value.toUpperCase() })}
                                            maxLength={20}
                                        />
                                    </div>
                                    <div className="space-y-2 flex-2">
                                        <label className="text-sm font-medium">Categoría</label>
                                        <Select value={formData.professor_category} onValueChange={(value) => setFormData({ ...formData, professor_category: value })} className="w-full">
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar categoría" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="DHC">DHC - Docente Hora Clase</SelectItem>
                                                <SelectItem value="ADM">ADM - Administrativo</SelectItem>
                                                <SelectItem value="DTC">DTC - Docente Tiempo Completo</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Fila 3: Emails */}
                                <div><h2 className="text-md font-bold pt-2 pb-2 border-b border-gray-200">Contacto</h2></div>
                                <div className="flex flex-col gap-4">
                                    <div className="space-y-2 flex-1">
                                        <label className="text-sm font-medium">Teléfono</label>
                                        <Input
                                            placeholder="7777-7777"
                                            value={formData.phone_number}
                                            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2 flex-1">
                                        <label className="text-sm font-medium">Email Institucional</label>
                                        <Input
                                            type="email"
                                            className="w-full"
                                            placeholder="profesor@utec.edu.sv"
                                            value={formData.institutional_email}
                                            onChange={(e) => setFormData({ ...formData, institutional_email: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2 flex-1">
                                        <label className="text-sm font-medium">Email Personal</label>
                                        <Input
                                            type="email"
                                            className="w-full"
                                            placeholder="profesor@gmail.com"
                                            value={formData.personal_email}
                                            onChange={(e) => setFormData({ ...formData, personal_email: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Fila 4: Doctorados, Maestrías */}
                                <div className="flex gap-4">
                                    <div className="space-y-2 w-32">
                                        <label className="text-sm font-medium">Doctorados</label>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={formData.doctorates}
                                            onChange={(e) => setFormData({ ...formData, doctorates: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="space-y-2 w-32">
                                        <label className="text-sm font-medium">Maestrías</label>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={formData.masters}
                                            onChange={(e) => setFormData({ ...formData, masters: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>

                                {/* Fila 5: Switches */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Switch
                                            checked={formData.is_bilingual}
                                            onCheckedChange={(checked) => setFormData({ ...formData, is_bilingual: checked })}
                                        />
                                        <label className="text-sm font-medium">Bilingüe</label>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Switch
                                            checked={formData.is_paid}
                                            onCheckedChange={(checked) => setFormData({ ...formData, is_paid: checked })}
                                        />
                                        <label className="text-sm font-medium">Remunerado</label>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Switch
                                            checked={formData.is_active}
                                            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                        />
                                        <label className="text-sm font-medium">Activo</label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer con botones */}
                        <div className="flex-shrink-0 px-6 py-4 border-t">
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={handleCloseSheet}>
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={() => {
                                        if (editingProfessor) {
                                            handleUpdateProfessor(editingProfessor.id, formData, handleCloseSheet);
                                        } else {
                                            handleCreateProfessor(formData, handleCloseSheet);
                                        }
                                    }}
                                    disabled={isCreating || isUpdating || !formData.professor_id || !formData.professor_name}
                                >
                                    {isCreating || isUpdating ? 'Guardando...' : (editingProfessor ? 'Actualizar' : 'Crear')}
                                </Button>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </CanAccess>
    );
};

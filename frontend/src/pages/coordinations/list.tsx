import React, { useState, useEffect } from "react";
import { useList, CanAccess } from "@refinedev/core";
import { TablePagination } from "../../components/ui/data/table-pagination";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../components/ui/tooltip";
import { Unauthorized } from "../unauthorized";
import { Button } from "../../components/ui/button";
import { DeleteConfirmDialog } from "../../components/ui/delete-confirm-dialog";
import { Pencil, Trash2, Search, Plus, Settings2, CheckCircle, XCircle, MoreHorizontal, ChevronDown } from "lucide-react";
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
import { CoordinationFormSheet } from "../../components/ui/coordinations/coordination-form-sheet";
import { useTablePagination } from "../../hooks/useTablePagination";
import { useCoordinationsCrud } from "../../hooks/useCoordinationsCrud";
import { useFacultiesCrud } from "../../hooks/useFacultiesCrud";
import { useSchoolsCrud } from "../../hooks/useSchoolsCrud";
import { useProfessorsCrud } from "../../hooks/useProfessorsCrud";

interface Coordination {
    id: number;
    code: string;
    name: string;
    description: string | null;
    faculty_id: number;
    school_id: number;
    coordinator_professor_id: number | null;
    is_active: boolean;
    deleted: boolean;
    deleted_at: string | null;
    created_at: string;
    updated_at: string | null;
}

interface Faculty {
    id: number;
    name: string;
    acronym: string;
}

interface Professor {
    id: number;
    professor_id: string;
    professor_name: string;
}

export const CoordinationList = () => {
    // Hook CRUD de coordinations
    const {
        canAccess,
        itemsList: coordinationsList,
        total: totalItems,
        isLoading,
        isError,
        createItem,
        updateItem,
        softDeleteItem,
        editingItem,
        setEditingItem,
        isCreateModalOpen,
        setIsCreateModalOpen,
        isEditModalOpen,
        setIsEditModalOpen,
        isCreating,
        isUpdating,
        isDeleting,
    } = useCoordinationsCrud();

    // Hook de paginación y búsqueda (stateless)
    const {
        paginatedData: coordinations,
        total,
        currentPage,
        totalPages,
        canPrevPage,
        canNextPage,
        nextPage,
        prevPage,
        goToPage,
        searchValue: searchTerm,
        setSearchValue: setSearchTerm,
    } = useTablePagination<Coordination>({
        data: coordinationsList,
        initialPageSize: 10,
    });

    // Cargar facultades, escuelas y profesores usando sus hooks
    const { itemsList: faculties } = useFacultiesCrud();
    const { itemsList: schools } = useSchoolsCrud();
    const { itemsList: professors } = useProfessorsCrud();

    // Helpers para obtener nombres
    const getFacultyName = (facultyId: number) => {
        const faculty = faculties.find(f => f.id === facultyId);
        return faculty ? `${faculty.acronym} - ${faculty.name}` : `ID: ${facultyId}`;
    };

    const getFacultyData = (facultyId: number) => {
        const faculty = faculties.find(f => f.id === facultyId);
        return faculty ? { acronym: faculty.acronym, name: faculty.name } : { acronym: `ID: ${facultyId}`, name: '' };
    };

    const getSchoolName = (schoolId: number) => {
        const school = schools.find(s => s.id === schoolId);
        return school ? `${school.acronym} - ${school.name}` : `ID: ${schoolId}`;
    };

    const getSchoolData = (schoolId: number) => {
        const school = schools.find(s => s.id === schoolId);
        return school ? { acronym: school.acronym, name: school.name } : { acronym: `ID: ${schoolId}`, name: '' };
    };

    const getProfessorName = (professorId: number | null) => {
        if (!professorId) return "Sin coordinador";
        const professor = professors.find(p => p.id === professorId);
        if (!professor) return `ID: ${professorId}`;

        // Concatenar título académico con el nombre
        const title = professor.academic_title ? `${professor.academic_title} ` : '';
        return `${title}${professor.professor_name}`;
    };

    // Función para abrir el sheet en modo crear
    const handleOpenCreateSheet = () => {
        setEditingItem(null);
        setFormData({
            code: "",
            name: "",
            description: "",
            faculty_id: null,
            school_id: null,
            coordinator_professor_id: null,
            is_active: true,
        });
        setIsCreateModalOpen(true);
    };

    // Función para abrir el sheet en modo editar
    const handleOpenEditSheet = (coordination: Coordination) => {
        setEditingItem(coordination);
        setFormData({
            code: coordination.code,
            name: coordination.name,
            description: coordination.description || "",
            faculty_id: coordination.faculty_id,
            school_id: coordination.school_id,
            coordinator_professor_id: coordination.coordinator_professor_id,
            is_active: coordination.is_active,
        });
        setIsEditModalOpen(true);
    };

    // Función para cerrar el sheet
    const handleCloseSheet = () => {
        setIsCreateModalOpen(false);
        setIsEditModalOpen(false);
        setEditingItem(null);
    };

    // Sincronizar formData cuando cambie editingItem
    useEffect(() => {
        if (editingItem) {
            setFormData({
                code: editingItem.code,
                name: editingItem.name,
                description: editingItem.description || "",
                faculty_id: editingItem.faculty_id,
                school_id: editingItem.school_id,
                coordinator_professor_id: editingItem.coordinator_professor_id,
                is_active: editingItem.is_active,
            });
        }
    }, [editingItem]);

    // Estados para el diálogo de eliminación
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedCoordination, setSelectedCoordination] = useState<{ id: number; name: string } | null>(null);

    // Estado para el formulario
    const [formData, setFormData] = useState({
        code: "",
        name: "",
        description: "",
        faculty_id: null as number | null,
        school_id: null as number | null,
        coordinator_professor_id: null as number | null,
        is_active: true,
    });

    const [visibleColumns, setVisibleColumns] = useState({
        code: true,
        name: true,
        faculty: true,
        school: true,
        coordinator: true,
        is_active: true,
    });

    // Verificar si el usuario no tiene permisos
    if (canAccess?.can === false) {
        return <Unauthorized />;
    }

    return (
        <CanAccess resource="coordinations" action="list" fallback={<Unauthorized />}>
            <div className="space-y-6 p-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Coordinaciones</h1>
                    <p className="text-muted-foreground">
                        Gestiona el catálogo de coordinaciones y cátedras de la institución
                    </p>
                </div>

                {/* Card with filters and table */}
                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle>Lista de Coordinaciones</CardTitle>
                                <CardDescription>
                                    {total} coordinación(es) en total
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Botón Crear */}
                                <Button onClick={handleOpenCreateSheet}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Crear Coordinación
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
                                    placeholder="Buscar por código o nombre..."
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
                                        checked={visibleColumns.code}
                                        onCheckedChange={(checked) =>
                                            setVisibleColumns((prev) => ({ ...prev, code: checked }))
                                        }
                                    >
                                        Código
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                        checked={visibleColumns.name}
                                        onCheckedChange={(checked) =>
                                            setVisibleColumns((prev) => ({ ...prev, name: checked }))
                                        }
                                    >
                                        Nombre
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                        checked={visibleColumns.faculty}
                                        onCheckedChange={(checked) =>
                                            setVisibleColumns((prev) => ({ ...prev, faculty: checked }))
                                        }
                                    >
                                        Facultad
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                        checked={visibleColumns.school}
                                        onCheckedChange={(checked) =>
                                            setVisibleColumns((prev) => ({ ...prev, school: checked }))
                                        }
                                    >
                                        Escuela
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                        checked={visibleColumns.coordinator}
                                        onCheckedChange={(checked) =>
                                            setVisibleColumns((prev) => ({ ...prev, coordinator: checked }))
                                        }
                                    >
                                        Coordinador
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
                                        {visibleColumns.code && (
                                            <TableHead className="w-[120px]">Código</TableHead>
                                        )}
                                        {visibleColumns.name && (
                                            <TableHead className="w-[250px]">Nombre</TableHead>
                                        )}
                                        {visibleColumns.faculty && (
                                            <TableHead className="w-[200px]">Facultad</TableHead>
                                        )}
                                        {visibleColumns.school && (
                                            <TableHead className="w-[200px]">Escuela</TableHead>
                                        )}
                                        {visibleColumns.coordinator && (
                                            <TableHead className="w-[200px]">Coordinador</TableHead>
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
                                                Cargando coordinaciones...
                                            </TableCell>
                                        </TableRow>
                                    ) : coordinations.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={Object.values(visibleColumns).filter(Boolean).length + 1}
                                                className="text-center py-8"
                                            >
                                                No se encontraron coordinaciones
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        coordinations.map((coordination) => (
                                            <TableRow key={coordination.id}>
                                                {visibleColumns.code && (
                                                    <TableCell>
                                                        <span className="font-mono text-sm font-semibold">{coordination.code}</span>
                                                    </TableCell>
                                                )}
                                                {visibleColumns.name && (
                                                    <TableCell>
                                                        <div className="font-medium">{coordination.name}</div>
                                                        {coordination.description && (
                                                            <div className="text-xs text-muted-foreground truncate max-w-[250px]">
                                                                {coordination.description}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                )}
                                                {visibleColumns.faculty && (
                                                    <TableCell>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Badge variant="outline" className="cursor-help">
                                                                        {getFacultyData(coordination.faculty_id).acronym}
                                                                    </Badge>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>{getFacultyData(coordination.faculty_id).name}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </TableCell>
                                                )}
                                                {visibleColumns.school && (
                                                    <TableCell>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Badge variant="secondary" className="cursor-help">
                                                                        {getSchoolData(coordination.school_id).acronym}
                                                                    </Badge>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>{getSchoolData(coordination.school_id).name}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </TableCell>
                                                )}
                                                {visibleColumns.coordinator && (
                                                    <TableCell>
                                                        {coordination.coordinator_professor_id ? (
                                                            <span className="text-sm">
                                                                {getProfessorName(coordination.coordinator_professor_id)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground text-sm">Sin coordinador</span>
                                                        )}
                                                    </TableCell>
                                                )}
                                                {visibleColumns.is_active && (
                                                    <TableCell className="text-center w-[100px]">
                                                        {coordination.is_active ? (
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
                                                            <DropdownMenuItem onClick={() => handleOpenEditSheet(coordination)}>
                                                                <Pencil className="mr-2 h-4 w-4" />
                                                                Editar
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-destructive"
                                                                onClick={() => {
                                                                    setSelectedCoordination({ id: coordination.id, name: coordination.name });
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
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-4">
                            <div className="text-sm text-muted-foreground">
                                Mostrando {coordinations.length} de {total} coordinaciones
                            </div>
                            <TablePagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                canPrevPage={canPrevPage}
                                canNextPage={canNextPage}
                                onPageChange={goToPage}
                                onPrevPage={prevPage}
                                onNextPage={nextPage}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Diálogo de eliminación */}
                {selectedCoordination && (
                    <DeleteConfirmDialog
                        entityType="coordinación"
                        entityName={selectedCoordination.name}
                        isOpen={deleteDialogOpen}
                        onClose={() => {
                            setDeleteDialogOpen(false);
                            setSelectedCoordination(null);
                        }}
                        onConfirm={() => {
                            softDeleteItem(selectedCoordination.id, selectedCoordination.name, () => {
                                setDeleteDialogOpen(false);
                                setSelectedCoordination(null);
                            });
                        }}
                        isDeleting={isDeleting}
                        gender="f"
                    />
                )}

                {/* Sheet de crear/editar coordinación */}
                <CoordinationFormSheet
                    isOpen={isCreateModalOpen || isEditModalOpen}
                    onClose={handleCloseSheet}
                    editingCoordination={editingItem}
                    formData={formData}
                    onFormChange={setFormData}
                    onSubmit={() => {
                        // Limpiar espacios en blanco al inicio y final
                        const cleanedFormData = {
                            ...formData,
                            code: formData.code.trim(),
                            name: formData.name.trim(),
                            description: formData.description.trim(),
                        };

                        if (editingItem) {
                            updateItem(editingItem.id, cleanedFormData, handleCloseSheet);
                        } else {
                            createItem(cleanedFormData, handleCloseSheet);
                        }
                    }}
                    isSubmitting={isCreating || isUpdating}
                />
            </div>
        </CanAccess>
    );
};

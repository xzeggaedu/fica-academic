import React, { useState, useEffect } from "react";
import { CanAccess } from "@refinedev/core";
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
import { ProfessorFormSheet } from "../../components/ui/professors/professor-form-sheet";
import { useTablePagination } from "../../hooks/useTablePagination";
import { useProfessorsCrud } from "../../hooks/useProfessorsCrud";
import { useProfessorStatistics } from "../../hooks/useProfessorStatistics";
import { SimpleDoughnutChart } from "../../components/charts/SimpleDoughnutChart";
import { SimpleBarChart } from "../../components/charts/SimpleBarChart";

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
    // Hook CRUD centralizado
    const {
        canCreate,
        itemsList: professorsList,
        total,
        isLoading,
        createItem,
        updateItem,
        softDeleteItem,
        editingItem: editingProfessor,
        setEditingItem: setEditingProfessor,
        isCreateModalOpen,
        setIsCreateModalOpen,
        isEditModalOpen,
        setIsEditModalOpen,
        isCreating,
        isUpdating,
        isDeleting,
        canDelete,
        canEdit,
    } = useProfessorsCrud();

    // Hook para estadísticas
    const { data: statistics, isLoading: isLoadingStats } = useProfessorStatistics();


    // Hook de paginación y búsqueda (stateless)
    const {
        paginatedData: professors,
        currentPage,
        totalPages,
        canPrevPage,
        canNextPage,
        nextPage,
        prevPage,
        goToPage,
        searchValue: searchTerm,
        setSearchValue: setSearchTerm,
    } = useTablePagination<Professor>({
        data: professorsList,
        initialPageSize: 10,
    });

    // Estados para el diálogo de eliminación
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedProfessor, setSelectedProfessor] = useState<{ id: number; name: string } | null>(null);

    // Estado para el formulario
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
        setIsCreateModalOpen(true);
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
        setIsEditModalOpen(true);
    };

    // Función para cerrar el sheet
    const handleCloseSheet = () => {
        setIsCreateModalOpen(false);
        setIsEditModalOpen(false);
        setEditingProfessor(null);
    };

    // Sincronizar formData cuando cambie editingProfessor
    useEffect(() => {
        if (editingProfessor) {
            setFormData({
                professor_id: editingProfessor.professor_id,
                professor_name: editingProfessor.professor_name,
                institutional_email: editingProfessor.institutional_email || "",
                personal_email: editingProfessor.personal_email || "",
                phone_number: editingProfessor.phone_number || "",
                professor_category: editingProfessor.professor_category || "",
                academic_title: editingProfessor.academic_title || "",
                doctorates: editingProfessor.doctorates || 0,
                masters: editingProfessor.masters || 0,
                is_bilingual: editingProfessor.is_bilingual || false,
                is_paid: editingProfessor.is_paid || true,
                is_active: editingProfessor.is_active || true,
            });
        }
    }, [editingProfessor]);


    return (
        <CanAccess
            resource="professors"
            action="list"
            fallback={<Unauthorized resourceName="horarios" message="Solo los administradores pueden gestionar horarios." />}
        >

            <div className="container mx-auto py-6 space-y-6 max-w-[98%]">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">Profesores</h1>
                        <p className="text-muted-foreground">
                            Gestiona el catálogo de profesores de la institución
                        </p>
                    </div>
                    {canCreate?.can && (
                        <Button onClick={handleOpenCreateSheet}>
                            <Plus className="mr-2 h-4 w-4" />
                            Crear Profesor
                        </Button>
                    )}
                </div>

                {/* Widgets de estadísticas */}
                {!isLoadingStats && statistics && (
                    <div className="grid md:grid-cols-3 gap-4 w-full">
                        {/* Widget Distribución por Categoría */}
                        <Card className="relative pb-1">
                            <CardContent className="p-4 py-0 relative pb-0">
                                <div className="flex items-start mb-2">
                                    <label className="text-[10px] text-muted-foreground uppercase">Por Categoría</label>
                                </div>
                                {(() => {
                                    const categoryEntries = Object.entries(statistics.by_category)
                                        .filter(([, count]) => (count as number) > 0)
                                        .sort((a, b) => (b[1] as number) - (a[1] as number));

                                    if (categoryEntries.length === 0) return <p className="text-sm text-muted-foreground">No hay datos</p>;

                                    // Paleta de colores para múltiples categorías
                                    const categoryColors = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#6366f1'];

                                    return (
                                        <div className="flex gap-2 items-start pt-2">
                                            <div className="min-w-[30%]">
                                                <Table>
                                                    <TableBody>
                                                        {categoryEntries.map(([name, value]) => (
                                                            <TableRow key={name} className="border-b">
                                                                <TableCell className="text-[10px] px-2 py-1 h-auto font-medium">{name}</TableCell>
                                                                <TableCell className="text-[10px] px-2 py-1 h-auto text-right">{value as number}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                            <div className="flex-1">
                                                <SimpleBarChart
                                                    data={categoryEntries.map(([name, value]) => ({
                                                        name,
                                                        value: value as number
                                                    }))}
                                                    colors={categoryColors}
                                                    height={115}
                                                    showTooltip={true}
                                                    grid={{
                                                        top: 10,
                                                        left: 10,
                                                        right: 10,
                                                        bottom: 10,
                                                        containLabel: true,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })()}
                            </CardContent>
                        </Card>

                        {/* Widget Distribución por Título Académico */}
                        <Card className="relative pb-1">
                            <CardContent className="p-4 py-0 relative pb-0">
                                <div className="flex items-start mb-2">
                                    <label className="text-[10px] text-muted-foreground uppercase">Por Título Académico</label>
                                </div>
                                {(() => {
                                    const titleEntries = Object.entries(statistics.by_title)
                                        .filter(([, count]) => (count as number) > 0)
                                        .sort((a, b) => (b[1] as number) - (a[1] as number));

                                    if (titleEntries.length === 0) return <p className="text-sm text-muted-foreground">No hay datos</p>;

                                    // Paleta de colores para múltiples títulos
                                    const titleColors = ['#f59e0b', '#3b82f6', '#22c55e', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6', '#6366f1'];

                                    return (
                                        <div className="flex gap-2 items-start pt-2">
                                            <div className="min-w-[30%]">
                                                <Table>
                                                    <TableBody>
                                                        {titleEntries.map(([name, value]) => (
                                                            <TableRow key={name} className="border-b">
                                                                <TableCell className="text-[10px] px-2 py-1 h-auto font-medium">{name}</TableCell>
                                                                <TableCell className="text-[10px] px-2 py-1 h-auto text-right">{value as number}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                            <div className="flex-1">
                                                <SimpleBarChart
                                                    data={titleEntries.map(([name, value]) => ({
                                                        name,
                                                        value: value as number
                                                    }))}
                                                    colors={titleColors}
                                                    height={115}
                                                    showTooltip={true}
                                                    grid={{
                                                        top: 10,
                                                        left: 10,
                                                        right: 10,
                                                        bottom: 10,
                                                        containLabel: true,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })()}
                            </CardContent>
                        </Card>

                        {/* Widget Resumen de Estadísticas */}
                        <Card className="relative pb-1">
                            <CardContent className="p-4 py-0 relative pb-0">
                                <div className="flex items-start justify-between mb-2">
                                    <label className="text-[10px] text-muted-foreground uppercase">Resumen</label>
                                    <span className="text-[10px] font-semibold">Total: {statistics.total}</span>
                                </div>
                                <div className="flex gap-2 items-start pt-2">
                                    <div className="min-w-[30%]">
                                        <Table>
                                            <TableBody>
                                                <TableRow className="border-b">
                                                    <TableCell className="text-[10px] px-2 py-1 h-auto font-medium">1 Maestría</TableCell>
                                                    <TableCell className="text-[10px] px-2 py-1 h-auto text-right">{statistics.one_master}</TableCell>
                                                </TableRow>
                                                <TableRow className="border-b">
                                                    <TableCell className="text-[10px] px-2 py-1 h-auto font-medium">2 o más maestrías</TableCell>
                                                    <TableCell className="text-[10px] px-2 py-1 h-auto text-right">{statistics.two_or_more_masters}</TableCell>
                                                </TableRow>
                                                <TableRow className="border-b">
                                                    <TableCell className="text-[10px] px-2 py-1 h-auto font-medium">Doctorado</TableCell>
                                                    <TableCell className="text-[10px] px-2 py-1 h-auto text-right">{statistics.doctorate}</TableCell>
                                                </TableRow>
                                                <TableRow className="border-b">
                                                    <TableCell className="text-[10px] px-2 py-1 h-auto font-medium">Bilingües</TableCell>
                                                    <TableCell className="text-[10px] px-2 py-1 h-auto text-right">{statistics.bilingual}</TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div className="flex-1">
                                        <SimpleBarChart
                                            data={[
                                                { name: "1 Maestría", value: statistics.one_master },
                                                { name: "2+ Maestrías", value: statistics.two_or_more_masters },
                                                { name: "Doctorado", value: statistics.doctorate },
                                                { name: "Bilingües", value: statistics.bilingual },
                                            ]}
                                            colors={['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b']}
                                            height={100}
                                            showTooltip={true}
                                            hideXAxisLabels={true}
                                            grid={{
                                                top: 15,
                                                left: 10,
                                                right: 10,
                                                bottom: 10,
                                                containLabel: true,
                                            }}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

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
                                        {(canDelete?.can || canEdit?.can) && (
                                            <TableHead className="text-center w-[100px] max-w-[100px]">Acciones</TableHead>
                                        )}
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
                                                {(canDelete?.can || canEdit?.can) && (
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
                                                )}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Paginación */}
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-4">
                            <div className="text-sm text-muted-foreground">
                                Mostrando {professors.length} de {total} profesores
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
                {selectedProfessor && (
                    <DeleteConfirmDialog
                        entityType="profesor"
                        entityName={selectedProfessor.name}
                        isOpen={deleteDialogOpen}
                        onClose={() => {
                            setDeleteDialogOpen(false);
                            setSelectedProfessor(null);
                        }}
                        onConfirm={() => {
                            softDeleteItem(selectedProfessor.id, selectedProfessor.name, () => {
                                setDeleteDialogOpen(false);
                                setSelectedProfessor(null);
                            });
                        }}
                        isDeleting={isDeleting}
                        gender="m"
                    />
                )}

                {/* Sheet de crear/editar profesor */}
                {(canEdit?.can || canCreate?.can) && (
                    <ProfessorFormSheet
                        isOpen={isCreateModalOpen || isEditModalOpen}
                        onClose={handleCloseSheet}
                        editingProfessor={editingProfessor}
                        formData={formData}
                        onFormChange={setFormData}
                        onSubmit={() => {
                            // Limpiar espacios en blanco al inicio y final
                            const cleanedFormData = {
                                ...formData,
                                professor_id: formData.professor_id.trim(),
                                professor_name: formData.professor_name.trim(),
                                institutional_email: formData.institutional_email.trim(),
                                personal_email: formData.personal_email.trim(),
                                phone_number: formData.phone_number.trim(),
                                professor_category: formData.professor_category.trim(),
                                academic_title: formData.academic_title.trim(),
                            };

                            if (editingProfessor) {
                                updateItem(editingProfessor.id, cleanedFormData, handleCloseSheet);
                            } else {
                                createItem(cleanedFormData, handleCloseSheet);
                            }
                        }}
                        isSubmitting={isCreating || isUpdating}
                    />
                )}
            </div>
        </CanAccess >
    );
};

import { useState, useEffect } from "react";
import { useAnnualHolidaysCrud } from "@/hooks/useAnnualHolidaysCrud";
import type { AnnualHoliday, AnnualHolidayCreate, AnnualHolidayUpdate } from "@/types/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/forms/input";
import { Label } from "@/components/ui/forms/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/data/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/forms/select";
import { CanAccess } from "@refinedev/core";
import { Plus, Trash2, List, Grid3X3 } from "lucide-react";
import { Unauthorized } from "../unauthorized";
import { TableFilters } from "@/components/ui/data/table-filters";
import { TablePagination } from "@/components/ui/data/table-pagination";
import { useTablePagination } from "@/hooks/useTablePagination";
import { HardDeleteConfirmDialog } from "@/components/ui/hard-delete-confirm-dialog";
import { getTableColumnClass } from "@/components/refine-ui/theme/theme-table";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/layout/breadcrumb";
import { Calendar } from "@/components/ui/calendar";

export const AnnualHolidaysList = () => {
    const navigate = useNavigate();
    const { holidayId } = useParams<{ holidayId: string }>();

    // Hook principal de asuetos anuales con todas las operaciones CRUD
    const {
        canCreate,
        itemsList: annualHolidaysData,
        isLoading: annualHolidaysLoading,
        isError: annualHolidaysError,
        createItem: createAnnualHoliday,
        updateItem: updateAnnualHoliday,
        deleteItem: deleteAnnualHoliday,
        updateSingleField,
        isCreating: creating,
        isUpdating: updating,
        isDeleting: deleting,
        canEdit,
        canDelete,
    } = useAnnualHolidaysCrud(holidayId ? parseInt(holidayId) : undefined);

    // Hook de paginación y búsqueda (stateless)
    const {
        paginatedData: annualHolidaysList,
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
    } = useTablePagination<AnnualHoliday>({
        data: annualHolidaysData,
        initialPageSize: 10,
    });

    // Estados locales
    const [error, setError] = useState<string | null>(null);
    const [visibleColumns, setVisibleColumns] = useState([
        "id", "date", "name", "type", "actions"
    ]);

    // Estados para el selector de vista
    const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
    const [dates, setDates] = useState<Date[]>([]);
    const [dateRanges, setDateRanges] = useState<Array<{ from: Date, to: Date, name: string }>>([]);

    // Función para crear fecha sin problemas de zona horaria
    const createLocalDate = (dateString: string) => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day); // month es 0-indexed en JavaScript
    };

    // Función para agrupar fechas consecutivas con el mismo nombre
    const groupConsecutiveDates = (holidays: AnnualHoliday[]) => {
        if (!holidays || holidays.length === 0) return { dates: [], ranges: [] };

        // Ordenar por fecha
        const sortedHolidays = [...holidays].sort((a, b) =>
            createLocalDate(a.date).getTime() - createLocalDate(b.date).getTime()
        );

        const individualDates: Date[] = [];
        const ranges: Array<{ from: Date, to: Date, name: string }> = [];

        let currentRange: { start: Date, end: Date, name: string } | null = null;

        for (const holiday of sortedHolidays) {
            const holidayDate = createLocalDate(holiday.date);

            if (!currentRange) {
                // Iniciar un nuevo rango potencial
                currentRange = {
                    start: holidayDate,
                    end: holidayDate,
                    name: holiday.name
                };
            } else if (
                currentRange.name === holiday.name &&
                holidayDate.getTime() === currentRange.end.getTime() + (24 * 60 * 60 * 1000) // Día siguiente
            ) {
                // Extender el rango actual
                currentRange.end = holidayDate;
            } else {
                // Finalizar el rango actual y comenzar uno nuevo
                if (currentRange.start.getTime() === currentRange.end.getTime()) {
                    // Rango de un solo día -> fecha individual
                    individualDates.push(currentRange.start);
                } else {
                    // Rango de múltiples días
                    ranges.push({
                        from: currentRange.start,
                        to: currentRange.end,
                        name: currentRange.name
                    });
                }

                currentRange = {
                    start: holidayDate,
                    end: holidayDate,
                    name: holiday.name
                };
            }
        }

        // Procesar el último rango
        if (currentRange) {
            if (currentRange.start.getTime() === currentRange.end.getTime()) {
                individualDates.push(currentRange.start);
            } else {
                ranges.push({
                    from: currentRange.start,
                    to: currentRange.end,
                    name: currentRange.name
                });
            }
        }

        return { dates: individualDates, ranges };
    };

    // Cargar fechas cuando cambien los datos de annual holidays
    useEffect(() => {
        if (annualHolidaysData && annualHolidaysData.length > 0) {
            const { dates: individualDates, ranges } = groupConsecutiveDates(annualHolidaysData);
            setDates(individualDates);
            setDateRanges(ranges);
        } else {
            setDates([]);
            setDateRanges([]);
        }
    }, [annualHolidaysData]);

    // Estados para el formulario de creación
    const [newAnnualHoliday, setNewAnnualHoliday] = useState({
        date: "",
        name: "",
        type: "Asueto Nacional",
    });

    // Estados para edición inline (específicos de UI)
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<AnnualHoliday>({} as AnnualHoliday);

    // Estados para el diálogo de eliminación
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedAnnualHoliday, setSelectedAnnualHoliday] = useState<{ id: number; name: string } | null>(null);

    // Estados para el modal de agregar/editar holiday
    const [holidayModalOpen, setHolidayModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedHolidayForEdit, setSelectedHolidayForEdit] = useState<AnnualHoliday | null>(null);
    const [modalForm, setModalForm] = useState({
        name: "",
        type: "Asueto Nacional",
    });

    // Columnas disponibles para el selector
    const availableColumns = [
        { key: "id", label: "ID" },
        { key: "date", label: "Fecha" },
        { key: "name", label: "Nombre" },
        { key: "type", label: "Tipo" },
        { key: "actions", label: "Acciones" },
    ];

    // Opciones para el tipo de asueto
    const holidayTypeOptions = [
        { value: "Asueto Nacional", label: "Asueto Nacional" },
        { value: "Personalizado", label: "Personalizado" },
    ];

    // Función para crear un nuevo asueto anual
    const handleCreate = () => {
        if (!newAnnualHoliday.name.trim()) {
            toast.error("Error de validación", {
                description: "El nombre del asueto es requerido.",
                richColors: true,
            });
            return;
        }

        if (!newAnnualHoliday.date) {
            toast.error("Error de validación", {
                description: "La fecha del asueto es requerida.",
                richColors: true,
            });
            return;
        }

        createAnnualHoliday(
            {
                holiday_id: parseInt(holidayId!),
                date: newAnnualHoliday.date,
                name: newAnnualHoliday.name.trim(),
                type: newAnnualHoliday.type,
            },
            () => {
                setNewAnnualHoliday({
                    date: "",
                    name: "",
                    type: "Asueto Nacional",
                });
                toast.success("Asueto anual creado", {
                    description: `El asueto "${newAnnualHoliday.name}" ha sido creado exitosamente.`,
                    richColors: true,
                });
            }
        );
    };

    // Función para iniciar edición inline
    const handleStartEdit = (item: AnnualHoliday, field: string) => {
        if (!canEdit?.can) return;

        setEditingId(item.id);
        setEditingField(field);
        setEditForm({ ...item });
    };

    // Función para guardar edición inline
    const handleSaveEdit = (item: AnnualHoliday, field: string) => {
        const value = editForm[field as keyof AnnualHoliday];

        // Verificar si el valor ha cambiado
        if (value === item[field as keyof AnnualHoliday]) {
            // No hay cambios, cancelar edición sin hacer save
            setEditingId(null);
            setEditingField(null);
            setEditForm({} as AnnualHoliday);
            return;
        }

        // Validaciones específicas por campo
        if (field === "name" && !(value as string)?.trim()) {
            toast.error("Error de validación", {
                description: "El nombre del asueto es requerido.",
                richColors: true,
            });
            return;
        }

        if (field === "date" && !value) {
            toast.error("Error de validación", {
                description: "La fecha del asueto es requerida.",
                richColors: true,
            });
            return;
        }

        updateSingleField(
            item.id,
            field as keyof AnnualHolidayUpdate,
            value,
            () => {
                setEditingId(null);
                setEditingField(null);
                setEditForm({} as AnnualHoliday);
            }
        );
    };

    // Función para cancelar edición inline
    const handleCancelEdit = () => {
        setEditingId(null);
        setEditingField(null);
        setEditForm({} as AnnualHoliday);
    };

    // Función para eliminar un asueto anual
    const handleDelete = (item: AnnualHoliday) => {
        deleteAnnualHoliday(
            item.id,
            item.name,
            () => {
                toast.success("Asueto anual eliminado", {
                    description: `El asueto "${item.name}" ha sido eliminado permanentemente.`,
                    richColors: true,
                });
            }
        );
    };

    // Función para abrir modal al hacer click en una fecha del calendario
    const handleCalendarDayClick = (date: Date) => {
        if (!canCreate?.can) return;
        // Verificar si ya existe un holiday en esta fecha
        const existingHoliday = annualHolidaysData.find(holiday =>
            createLocalDate(holiday.date).toDateString() === date.toDateString()
        );

        setSelectedDate(date);

        if (existingHoliday) {
            // Modo edición
            setSelectedHolidayForEdit(existingHoliday);
            setModalForm({
                name: existingHoliday.name,
                type: existingHoliday.type,
            });
        } else {
            // Modo creación
            setSelectedHolidayForEdit(null);
            setModalForm({
                name: "",
                type: "Asueto Nacional",
            });
        }

        setHolidayModalOpen(true);
    };

    // Función para guardar holiday desde el modal
    const handleModalSave = () => {
        if (!selectedDate) return;

        if (!modalForm.name.trim()) {
            toast.error("Error de validación", {
                description: "El nombre del asueto es requerido.",
                richColors: true,
            });
            return;
        }

        if (selectedHolidayForEdit) {
            // Modo edición
            updateSingleField(
                selectedHolidayForEdit.id,
                "name" as keyof AnnualHolidayUpdate,
                modalForm.name,
                () => {
                    setHolidayModalOpen(false);
                    setSelectedDate(null);
                    setSelectedHolidayForEdit(null);
                    toast.success("Asueto actualizado", {
                        description: `El asueto "${modalForm.name}" ha sido actualizado exitosamente.`,
                        richColors: true,
                    });
                }
            );
        } else {
            // Modo creación
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedDate.getDate()).padStart(2, '0');
            const dateString = `${year}-${month}-${day}`;
            createAnnualHoliday(
                {
                    holiday_id: parseInt(holidayId!),
                    date: dateString,
                    name: modalForm.name.trim(),
                    type: modalForm.type,
                },
                () => {
                    setHolidayModalOpen(false);
                    setSelectedDate(null);
                    setSelectedHolidayForEdit(null);
                    toast.success("Asueto anual creado", {
                        description: `El asueto "${modalForm.name}" ha sido creado exitosamente.`,
                        richColors: true,
                    });
                }
            );
        }
    };

    // Función para cancelar modal
    const handleModalCancel = () => {
        setHolidayModalOpen(false);
        setSelectedDate(null);
        setSelectedHolidayForEdit(null);
        setModalForm({
            name: "",
            type: "Asueto Nacional",
        });
    };

    return (
        <CanAccess
            resource="annual-holidays"
            action="list"
            fallback={<Unauthorized resourceName="asuetos anuales" message="Solo los administradores pueden gestionar asuetos anuales." />}
        >
            <div className="container mx-auto py-6 space-y-6 max-w-[98%]">
                {/* Header */}
                {/* Breadcrumbs */}
                <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbLink
                                        onClick={() => navigate("/academic-planning/holidays")}
                                        className="cursor-pointer text-xs"
                                    >
                                        Planificación Académica
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbLink
                                        onClick={() => navigate("/academic-planning/holidays")}
                                        className="cursor-pointer text-xs"
                                    >
                                        Asuetos del Año
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage className="text-xs">Asuetos Anuales</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                <div className="flex justify-between items-start space-y-4">
                    <div>
                        <h1 className="text-2xl font-bold">Asuetos Anuales</h1>
                        <p className="text-muted-foreground pb-2">
                            Gestiona los asuetos específicos para el año seleccionado
                        </p>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                        <span className="text-sm text-muted-foreground">Vista:</span>
                        <div className="flex border rounded-md">
                            <Button
                                variant={viewMode === 'table' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('table')}
                                className="rounded-r-none border-r"
                            >
                                <List className="h-4 w-4 mr-2" />
                                Tabla
                            </Button>
                            <Button
                                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('calendar')}
                                className="rounded-l-none"
                            >
                                <Grid3X3 className="h-4 w-4 mr-2" />
                                Calendario
                            </Button>
                        </div>
                    </div>

                </div>

                {/* Estados de carga y error */}
                {annualHolidaysLoading && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
                            <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
                        </div>
                        <div className="h-64 w-full bg-gray-200 rounded animate-pulse" />
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                        <div className="text-red-800">{error}</div>
                    </div>
                )}

                {!annualHolidaysLoading && !error && (
                    <>

                        {/* Switch entre vistas */}
                        {viewMode === 'table' ? (
                            <>
                                {/* Formulario de creación */}
                                {canCreate?.can && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Plus className="h-5 w-5" />
                                                Crear Nuevo Asueto Anual
                                            </CardTitle>
                                            <CardDescription>
                                                Agregue un nuevo asueto específico para este año
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex gap-4 items-end">
                                                <div className="space-y-2">
                                                    <Label htmlFor="date">Fecha *</Label>
                                                    <Input
                                                        id="date"
                                                        type="date"
                                                        value={newAnnualHoliday.date}
                                                        onChange={(e) => setNewAnnualHoliday(prev => ({ ...prev, date: e.target.value }))}
                                                        disabled={creating}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="name">Nombre del Asueto *</Label>
                                                    <Input
                                                        id="name"
                                                        placeholder="Ej: Día de la Independencia"
                                                        value={newAnnualHoliday.name}
                                                        onChange={(e) => setNewAnnualHoliday(prev => ({ ...prev, name: e.target.value }))}
                                                        disabled={creating}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="type">Tipo *</Label>
                                                    <Select
                                                        value={newAnnualHoliday.type}
                                                        onValueChange={(value) => setNewAnnualHoliday(prev => ({ ...prev, type: value }))}
                                                        disabled={creating}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {holidayTypeOptions.map((type) => (
                                                                <SelectItem key={type.value} value={type.value}>
                                                                    {type.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Button
                                                        onClick={handleCreate}
                                                        disabled={!newAnnualHoliday.name.trim() || !newAnnualHoliday.date || creating}
                                                        className="w-full md:w-auto"
                                                    >
                                                        <Plus className="mr-1 h-4 w-4" />
                                                        {creating ? "Creando..." : "Crear Asueto Anual"}
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Tabla de asuetos anuales */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Lista de Asuetos Anuales ({total})</CardTitle>
                                        <CardDescription>
                                            Aquí puedes ver y administrar el listado de asuetos anuales.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {/* Filtros y selector de columnas */}
                                        <TableFilters
                                            searchValue={searchValue}
                                            onSearchChange={setSearchValue}
                                            searchPlaceholder="Buscar por nombre..."
                                            availableColumns={availableColumns}
                                            visibleColumns={visibleColumns}
                                            onVisibleColumnsChange={setVisibleColumns}
                                        />

                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        {visibleColumns.includes("id") && <TableHead className={getTableColumnClass("id")}>ID</TableHead>}
                                                        {visibleColumns.includes("date") && <TableHead>Fecha</TableHead>}
                                                        {visibleColumns.includes("name") && <TableHead>Nombre</TableHead>}
                                                        {visibleColumns.includes("type") && <TableHead>Tipo</TableHead>}
                                                        {canDelete?.can && visibleColumns.includes("actions") && <TableHead className="text-center w-[100px]">Acciones</TableHead>}
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {annualHolidaysList.length === 0 ? (
                                                        <TableRow>
                                                            <TableCell colSpan={visibleColumns.length} className="text-center text-muted-foreground py-8">
                                                                No hay asuetos anuales configurados. Crea uno para comenzar.
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        annualHolidaysList.map((item) => (
                                                            <TableRow key={item.id}>
                                                                {visibleColumns.includes("id") && (
                                                                    <TableCell className="font-mono text-sm">{item.id}</TableCell>
                                                                )}
                                                                {visibleColumns.includes("date") && (
                                                                    <TableCell>
                                                                        {canEdit?.can && editingId === item.id && editingField === "date" ? (
                                                                            <Input
                                                                                type="date"
                                                                                value={editForm.date || ""}
                                                                                onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                                                                                onBlur={() => handleSaveEdit(item, "date")}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === "Enter") handleSaveEdit(item, "date");
                                                                                    if (e.key === "Escape") handleCancelEdit();
                                                                                }}
                                                                                autoFocus
                                                                                className="w-full"
                                                                            />
                                                                        ) : (
                                                                            <div
                                                                                className="cursor-pointer hover:bg-gray-50 p-1 rounded"
                                                                                onClick={() => handleStartEdit(item, "date")}
                                                                            >
                                                                                {new Date(item.date).toLocaleDateString("es-SV")}
                                                                            </div>
                                                                        )}
                                                                    </TableCell>
                                                                )}
                                                                {visibleColumns.includes("name") && (
                                                                    <TableCell>
                                                                        {canEdit?.can && editingId === item.id && editingField === "name" ? (
                                                                            <Input
                                                                                value={editForm.name || ""}
                                                                                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                                                                onBlur={() => handleSaveEdit(item, "name")}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === "Enter") handleSaveEdit(item, "name");
                                                                                    if (e.key === "Escape") handleCancelEdit();
                                                                                }}
                                                                                autoFocus
                                                                                className="w-full"
                                                                            />
                                                                        ) : (
                                                                            <div
                                                                                className="cursor-pointer hover:bg-gray-50 p-1 rounded"
                                                                                onClick={() => handleStartEdit(item, "name")}
                                                                            >
                                                                                {item.name}
                                                                            </div>
                                                                        )}
                                                                    </TableCell>
                                                                )}
                                                                {visibleColumns.includes("type") && (
                                                                    <TableCell>
                                                                        {canEdit?.can && editingId === item.id && editingField === "type" ? (
                                                                            <Select
                                                                                value={editForm.type || ""}
                                                                                onValueChange={(value) => setEditForm(prev => ({ ...prev, type: value }))}
                                                                                onOpenChange={(open) => {
                                                                                    if (!open) handleSaveEdit(item, "type");
                                                                                }}
                                                                            >
                                                                                <SelectTrigger className="w-full">
                                                                                    <SelectValue />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    {holidayTypeOptions.map((type) => (
                                                                                        <SelectItem key={type.value} value={type.value}>
                                                                                            {type.label}
                                                                                        </SelectItem>
                                                                                    ))}
                                                                                </SelectContent>
                                                                            </Select>
                                                                        ) : (
                                                                            <div
                                                                                className="cursor-pointer hover:bg-gray-50 p-1 rounded"
                                                                                onClick={() => handleStartEdit(item, "type")}
                                                                            >
                                                                                <Badge variant={item.type === "Asueto Nacional" ? "default" : "secondary"}>
                                                                                    {item.type}
                                                                                </Badge>
                                                                            </div>
                                                                        )}
                                                                    </TableCell>
                                                                )}
                                                                {canDelete?.can && visibleColumns.includes("actions") && (
                                                                    <TableCell className="text-center">
                                                                        <Button
                                                                            variant="outline"
                                                                            size="icon"
                                                                            onClick={() => {
                                                                                setSelectedAnnualHoliday({ id: item.id, name: item.name });
                                                                                setDeleteDialogOpen(true);
                                                                            }}
                                                                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
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
                            </>
                        ) : (
                            /* Vista de calendario */
                            <Card>
                                <CardHeader>
                                    <CardTitle>Calendario de Asuetos Anuales</CardTitle>
                                    <CardDescription>
                                        Visualiza todos los asuetos en formato de calendario anual
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {/* Mostrar rangos de fechas como información adicional */}
                                        {dateRanges.length > 0 && (
                                            <div className="rounded-lg p-4 bg-slate-200">
                                                <h4 className="font-medium mb-2">Rangos de Asuetos:</h4>
                                                <div className="space-y-1">
                                                    {dateRanges.map((range, index) => (
                                                        <div key={index} className="text-sm">
                                                            <span className="font-medium">{range.name}:</span> {range.from.toLocaleDateString("es-SV")} - {range.to.toLocaleDateString("es-SV")}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Calendario con fechas individuales y rangos */}
                                        <Calendar
                                            mode="multiple"
                                            numberOfMonths={12}
                                            selected={[]} // No seleccionar fechas para evitar conflictos
                                            onSelect={(date) => {
                                                if (date && !Array.isArray(date)) {
                                                    handleCalendarDayClick(date);
                                                } else if (Array.isArray(date) && date.length > 0) {
                                                    handleCalendarDayClick(date[0]);
                                                }
                                            }}
                                            defaultMonth={new Date(2025, 0)}
                                            disableNavigation={true}
                                            modifiers={{
                                                rangeStart: dateRanges.map(range => range.from),
                                                rangeEnd: dateRanges.map(range => range.to),
                                                rangeMiddle: dateRanges.flatMap(range => {
                                                    const middleDates = [];
                                                    const current = new Date(range.from);
                                                    current.setDate(current.getDate() + 1);
                                                    while (current < range.to) {
                                                        middleDates.push(new Date(current));
                                                        current.setDate(current.getDate() + 1);
                                                    }
                                                    return middleDates;
                                                }),
                                                individual: dates.filter(date => {
                                                    // Solo incluir fechas que no estén en ningún rango
                                                    return !dateRanges.some(range =>
                                                        date >= range.from && date <= range.to
                                                    );
                                                })
                                            }}
                                            modifiersStyles={{
                                                rangeStart: {
                                                    backgroundColor: '#b0245a',
                                                    color: 'white',
                                                    borderRadius: '6px 0 0 6px'
                                                },
                                                rangeEnd: {
                                                    backgroundColor: '#b0245a',
                                                    color: 'white',
                                                    borderRadius: '0 6px 6px 0'
                                                },
                                                rangeMiddle: {
                                                    backgroundColor: '#f5d0dc',
                                                    color: '#b0245a',
                                                    borderRadius: '0'
                                                },
                                                individual: {
                                                    backgroundColor: '#b0245a',
                                                    color: 'white',
                                                    borderRadius: '6px'
                                                },
                                                day_outside: {
                                                    backgroundColor: '#f5d0dc',
                                                    color: '#b0245a'
                                                }
                                            }}
                                            className="
                                              mx-auto
                                              max-w-[100%]
                                              mx-auto
                                              [&>div]:flex
                                              [&>div]:flex-wrap
                                              [&>div]:justify-center
                                              [&>div]:items-start
                                              [&>div]:gap-0
                                              [&>div>div]:border-t-1
                                              [&>div>div]:mt-4
                                              [&>div>div]:pt-4
                                              [&>div>div]:px-4
                                              [&>div>div]:border-gray-200
                                            "
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Diálogo de eliminación */}
                        {selectedAnnualHoliday && (
                            <HardDeleteConfirmDialog
                                entityType="asueto anual"
                                entityName={selectedAnnualHoliday.name}
                                isOpen={deleteDialogOpen}
                                onClose={() => {
                                    setDeleteDialogOpen(false);
                                    setSelectedAnnualHoliday(null);
                                }}
                                onConfirm={() => {
                                    const item = annualHolidaysList.find(f => f.id === selectedAnnualHoliday.id);
                                    if (item) {
                                        handleDelete(item);
                                        setDeleteDialogOpen(false);
                                        setSelectedAnnualHoliday(null);
                                    }
                                }}
                                isDeleting={deleting}
                                gender="m"
                            />
                        )}

                        {/* Modal para agregar/editar holiday */}
                        <Dialog open={holidayModalOpen} onOpenChange={setHolidayModalOpen}>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>
                                        {selectedHolidayForEdit ? "Editar Asueto" : "Agregar Nuevo Asueto"}
                                    </DialogTitle>
                                    <DialogDescription>
                                        {selectedDate && (
                                            <>Para la fecha: {selectedDate.toLocaleDateString("es-SV")}</>
                                        )}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="modal-name">Nombre del Asueto *</Label>
                                        <Input
                                            id="modal-name"
                                            placeholder="Ej: Día de la Independencia"
                                            value={modalForm.name}
                                            onChange={(e) => setModalForm(prev => ({ ...prev, name: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="modal-type">Tipo *</Label>
                                        <Select
                                            value={modalForm.type}
                                            onValueChange={(value) => setModalForm(prev => ({ ...prev, type: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {holidayTypeOptions.map((type) => (
                                                    <SelectItem key={type.value} value={type.value}>
                                                        {type.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={handleModalCancel}>
                                        Cancelar
                                    </Button>
                                    <Button
                                        onClick={handleModalSave}
                                        disabled={!modalForm.name.trim() || creating || updating}
                                    >
                                        {creating || updating ? "Guardando..." : (selectedHolidayForEdit ? "Actualizar" : "Crear")}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </>
                )}
            </div>
        </CanAccess>
    );
};

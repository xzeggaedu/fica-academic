import { useState } from "react";
import { useHolidaysCrud } from "@/hooks/useHolidaysCrud";
import type { Holiday, HolidayCreate, HolidayUpdate } from "@/types/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/forms/input";
import { Label } from "@/components/ui/forms/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/forms/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/data/table";
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
import { Calendar, Plus, Trash2, AlertCircle, CalendarDays, Eye, Pencil } from "lucide-react";
import { CanAccess } from "@refinedev/core";
import { Unauthorized } from "../unauthorized";
import { TableFilters } from "@/components/ui/data/table-filters";
import { TablePagination } from "@/components/ui/data/table-pagination";
import { useTablePagination } from "@/hooks/useTablePagination";
import { HardDeleteConfirmDialog } from "@/components/ui/hard-delete-confirm-dialog";
import { getTableColumnClass } from "@/components/refine-ui/theme/theme-table";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export const HolidaysList = () => {
    const navigate = useNavigate();

    const {
        canAccess,
        canCreate,
        canEdit,
        canDelete,
        itemsList: holidaysData,
        total,
        isLoading,
        isError,
        fixedHolidayRules,
        isLoadingRules,
        createItem,
        updateItem,
        deleteItem,
        updateSingleField,
        isCreating,
        isUpdating,
        isDeleting,
    } = useHolidaysCrud();

    // Hook de paginación y búsqueda (stateless)
    const {
        paginatedData: holidaysList,
        currentPage,
        totalPages,
        canPrevPage,
        canNextPage,
        nextPage,
        prevPage,
        goToPage,
        searchValue,
        setSearchValue,
    } = useTablePagination<Holiday>({
        data: holidaysData,
        initialPageSize: 10,
    });

    // Estados locales
    const [newYear, setNewYear] = useState<string>("");
    const [newDescription, setNewDescription] = useState<string>("");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Holiday>({} as Holiday);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Holiday | null>(null);
    const [createConfirmOpen, setCreateConfirmOpen] = useState(false);
    const [previewHolidaysGrouped, setPreviewHolidaysGrouped] = useState<Array<{
        name: string;
        type: string;
        startDate: string;
        endDate: string | null;
        count: number
    }>>([]);
    const [totalHolidaysCount, setTotalHolidaysCount] = useState(0);
    const [visibleColumns, setVisibleColumns] = useState([
        "year", "description", "annual_holidays_count", "actions"
    ]);

    // Columnas disponibles para el selector
    const availableColumns = [
        { key: "year", label: "Año" },
        { key: "description", label: "Descripción" },
        { key: "annual_holidays_count", label: "Fechas de Asueto" },
        { key: "actions", label: "Acciones" },
    ];

    // Función para calcular la Pascua (Algoritmo de Meeus/Jones/Butcher)
    const calculateEaster = (year: number): Date => {
        const a = year % 19;
        const b = Math.floor(year / 100);
        const c = year % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const month = Math.floor((h + l - 7 * m + 114) / 31);
        const day = ((h + l - 7 * m + 114) % 31) + 1;
        return new Date(year, month - 1, day);
    };

    // Función para generar preview de asuetos
    const generateHolidaysPreview = (year: number) => {
        const holidays: Array<{ date: string; name: string; type: string }> = [];

        // Agregar asuetos fijos desde la API
        fixedHolidayRules.forEach((rule) => {
            const date = new Date(year, rule.month - 1, rule.day);
            holidays.push({
                date: date.toISOString().split("T")[0],
                name: rule.name,
                type: rule.holiday_type,
            });
        });

        // Calcular Semana Santa (8 días desde el lunes antes de Pascua)
        const easterSunday = calculateEaster(year);
        const holyWeekStart = new Date(easterSunday);
        holyWeekStart.setDate(easterSunday.getDate() - 6); // Lunes antes de Pascua

        for (let i = 0; i < 8; i++) {
            const date = new Date(holyWeekStart);
            date.setDate(holyWeekStart.getDate() + i);
            holidays.push({
                date: date.toISOString().split("T")[0],
                name: "Semana Santa",
                type: "Personalizado",
            });
        }

        // Ordenar por fecha
        holidays.sort((a, b) => a.date.localeCompare(b.date));

        return holidays;
    };

    // Función para agrupar asuetos consecutivos con el mismo nombre
    const groupConsecutiveHolidays = (holidays: Array<{ date: string; name: string; type: string }>) => {
        if (holidays.length === 0) return [];

        const grouped: Array<{
            name: string;
            type: string;
            startDate: string;
            endDate: string | null;
            count: number
        }> = [];

        let currentGroup = {
            name: holidays[0].name,
            type: holidays[0].type,
            startDate: holidays[0].date,
            endDate: null as string | null,
            count: 1,
        };

        for (let i = 1; i < holidays.length; i++) {
            const current = holidays[i];
            const previous = holidays[i - 1];

            // Verificar si es el mismo nombre y fechas consecutivas
            const currentDate = new Date(current.date + "T00:00:00");
            const previousDate = new Date(previous.date + "T00:00:00");
            const diffDays = Math.floor((currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));

            if (current.name === currentGroup.name && diffDays === 1) {
                // Continuar el grupo
                currentGroup.endDate = current.date;
                currentGroup.count++;
            } else {
                // Guardar el grupo actual y empezar uno nuevo
                grouped.push({ ...currentGroup });
                currentGroup = {
                    name: current.name,
                    type: current.type,
                    startDate: current.date,
                    endDate: null,
                    count: 1,
                };
            }
        }

        // Agregar el último grupo
        grouped.push(currentGroup);

        return grouped;
    };

    // Manejadores
    const handleOpenCreateConfirm = () => {
        if (!newYear) return;

        const year = parseInt(newYear);
        if (isNaN(year) || year < 2020 || year > 2100) {
            alert("Por favor ingrese un año válido entre 2020 y 2100");
            return;
        }

        // Verificar que las reglas de asuetos fijos estén cargadas
        if (isLoadingRules) {
            alert("Cargando reglas de asuetos, por favor espere...");
            return;
        }

        if (fixedHolidayRules.length === 0) {
            alert("No se pudieron cargar las reglas de asuetos fijos. Por favor recargue la página.");
            return;
        }

        // Generar preview de asuetos
        const preview = generateHolidaysPreview(year);
        const grouped = groupConsecutiveHolidays(preview);
        setPreviewHolidaysGrouped(grouped);
        setTotalHolidaysCount(preview.length);
        setCreateConfirmOpen(true);
    };

    const handleConfirmCreate = () => {
        const year = parseInt(newYear);
        const values: HolidayCreate = {
            year,
            description: newDescription || undefined,
        };

        createItem(values, () => {
            setNewYear("");
            setNewDescription("");
            setCreateConfirmOpen(false);
            setPreviewHolidaysGrouped([]);
            setTotalHolidaysCount(0);
        });
    };

    const handleStartEdit = (item: Holiday, field: string) => {
        setEditingId(item.id);
        setEditingField(field);
        setEditForm({ ...item });
    };

    const handleSaveEdit = (item: Holiday, field: string) => {
        const value = editForm[field as keyof Holiday];

        // Verificar si el valor ha cambiado
        if (value === item[field as keyof Holiday]) {
            // No hay cambios, cancelar edición sin hacer save
            setEditingId(null);
            setEditingField(null);
            setEditForm({} as Holiday);
            return;
        }

        // Solo permitir editar descripción
        if (field === "description") {
            const values: HolidayUpdate = {
                description: value as string || undefined,
            };

            updateItem(item.id, values, () => {
                setEditingId(null);
                setEditingField(null);
                setEditForm({} as Holiday);
            });
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditingField(null);
        setEditForm({} as Holiday);
    };

    const handleDeleteClick = (item: Holiday) => {
        setItemToDelete(item);
        setDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!itemToDelete) return;

        deleteItem(itemToDelete.id, itemToDelete.year.toString(), () => {
            setDeleteConfirmOpen(false);
            setItemToDelete(null);
        });
    };

    return (
        <CanAccess
            resource="holidays"
            action="list"
            fallback={<Unauthorized resourceName="asuetos del año" message="Solo los administradores pueden gestionar asuetos del año." />}
        >
            <div className="container mx-auto py-6 space-y-6 max-w-[98%]">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">Asuetos del Año</h1>
                        <p className="text-muted-foreground">
                            Gestión de fechas de asueto por año. Al crear un año, se generan automáticamente
                            los asuetos nacionales y la semana santa según las reglas configuradas.
                        </p>
                    </div>
                </div>

                {/* Estados de carga y error */}
                {isLoading && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-64" />
                            <Skeleton className="h-4 w-96" />
                        </div>
                        <Skeleton className="h-64 w-full" />
                    </div>
                )}

                {isError && (
                    <Alert variant="destructive" className="max-w-md mx-auto">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Error al cargar los asuetos del año. Por favor intenta nuevamente.
                        </AlertDescription>
                    </Alert>
                )}

                {!isLoading && !isError && (
                    <>


                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Plus className="h-5 w-5" />
                                    Crear Asuetos para un Año
                                </CardTitle>
                                <CardDescription>
                                    Ingrese el año para generar automáticamente los asuetos correspondientes
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {canCreate?.can && (<>
                                    <div className="flex gap-4 items-end">
                                        <div className="space-y-2">
                                            <Label htmlFor="year">Año *</Label>
                                            <Input
                                                id="year"
                                                type="number"
                                                placeholder="2025"
                                                value={newYear}
                                                onChange={(e) => setNewYear(e.target.value)}
                                                min={2020}
                                                max={2100}
                                                disabled={isCreating}
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="description">Descripción (Opcional)</Label>
                                            <Input
                                                id="description"
                                                placeholder="Asuetos Oficiales 2025"
                                                value={newDescription}
                                                onChange={(e) => setNewDescription(e.target.value)}
                                                disabled={isCreating}
                                                maxLength={200}
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Button
                                                onClick={handleOpenCreateConfirm}
                                                disabled={!newYear || isCreating || isLoadingRules}
                                                className="w-full md:w-auto"
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                {isLoadingRules ? "Cargando reglas..." : "Generar Asuetos"}
                                            </Button>
                                        </div>
                                    </div>
                                </>
                                )}
                            </CardContent>
                        </Card>




                        {/* Tabla de asuetos */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Lista de Asuetos del Año ({total})</CardTitle>
                                <CardDescription>
                                    Aquí puedes ver y administrar el listado de asuetos configurados por año.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {/* Filtros y selector de columnas */}
                                <TableFilters
                                    searchValue={searchValue}
                                    onSearchChange={setSearchValue}
                                    searchPlaceholder="Buscar por año o descripción..."
                                    availableColumns={availableColumns}
                                    visibleColumns={visibleColumns}
                                    onVisibleColumnsChange={setVisibleColumns}
                                />

                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableCaption className="pb-4">
                                            Lista de asuetos configurados por año
                                        </TableCaption>
                                        <TableHeader>
                                            <TableRow>
                                                {visibleColumns.includes("year") && (
                                                    <TableHead className="w-[100px]">Año</TableHead>
                                                )}
                                                {visibleColumns.includes("description") && (
                                                    <TableHead>Descripción</TableHead>
                                                )}
                                                {visibleColumns.includes("annual_holidays_count") && (
                                                    <TableHead className="text-center w-[150px]">Fechas de Asueto</TableHead>
                                                )}
                                                {visibleColumns.includes("actions") && (
                                                    <TableHead className="text-right w-[100px]">Acciones</TableHead>
                                                )}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {holidaysList.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={visibleColumns.length} className="text-center text-muted-foreground py-8">
                                                        No hay asuetos configurados. Crea uno para comenzar.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                holidaysList.map((item) => (
                                                    <TableRow key={item.id}>
                                                        {visibleColumns.includes("year") && (
                                                            <TableCell className="font-medium">
                                                                {item.year}
                                                            </TableCell>
                                                        )}
                                                        {visibleColumns.includes("description") && (
                                                            <TableCell>
                                                                {editingId === item.id && editingField === "description" ? (
                                                                    <Input
                                                                        value={editForm.description || ""}
                                                                        onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                                                        onBlur={() => handleSaveEdit(item, "description")}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === "Enter") handleSaveEdit(item, "description");
                                                                            if (e.key === "Escape") handleCancelEdit();
                                                                        }}
                                                                        autoFocus
                                                                        className="w-full"
                                                                    />
                                                                ) : (
                                                                    <div
                                                                        className="cursor-pointer hover:bg-gray-50 p-1 rounded"
                                                                        onClick={() => handleStartEdit(item, "description")}
                                                                    >
                                                                        {item.description || (
                                                                            <span className="text-muted-foreground italic">Sin descripción</span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                        )}
                                                        {visibleColumns.includes("annual_holidays_count") && (
                                                            <TableCell className="text-center">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => navigate(`/academic-planning/annual-holidays/${item.id}`)}
                                                                    className="flex items-center gap-1"
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                    <span className="font-semibold">Detalle ({item.annual_holidays_count})</span>
                                                                </Button>
                                                            </TableCell>
                                                        )}
                                                        {visibleColumns.includes("actions") && (
                                                            <TableCell className="text-right">
                                                                <CanAccess resource="holidays" action="delete">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        onClick={() => handleDeleteClick(item)}
                                                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 cursor-pointer"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </CanAccess>
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

                        {/* Dialog de confirmación de creación */}
                        <AlertDialog open={createConfirmOpen} onOpenChange={setCreateConfirmOpen}>
                            <AlertDialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        Confirmar Generación de Asuetos para {newYear}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Se generarán {totalHolidaysCount} fechas de asueto ({previewHolidaysGrouped.length} grupos) para el año {newYear}.
                                        Revise el listado antes de confirmar.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>

                                {/* Tabla de preview con scroll */}
                                <div className="flex-1 overflow-y-auto border rounded-md">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-background z-10">
                                            <TableRow>
                                                <TableHead className="w-[280px]">Fecha(s)</TableHead>
                                                <TableHead>Nombre</TableHead>
                                                <TableHead className="w-[100px] text-center">Días</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {previewHolidaysGrouped.map((group, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="font-mono text-sm min-w-[100px]">
                                                        {group.endDate ? (
                                                            <div className="flex gap-1 align-center">
                                                                <span>
                                                                    {new Date(group.startDate + "T00:00:00").toLocaleDateString("es-SV", {
                                                                        month: "short",
                                                                        day: "numeric",
                                                                    })}
                                                                </span>
                                                                <span className="text-muted-foreground">al</span>
                                                                <span>
                                                                    {new Date(group.endDate + "T00:00:00").toLocaleDateString("es-SV", {
                                                                        month: "short",
                                                                        day: "numeric",
                                                                    })}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            new Date(group.startDate + "T00:00:00").toLocaleDateString("es-SV", {
                                                                month: "short",
                                                                day: "numeric",
                                                            })
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="font-medium">{group.name}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="outline" className="font-mono">
                                                            {group.count}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isCreating}>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleConfirmCreate}
                                        disabled={isCreating}
                                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                                    >
                                        {isCreating ? "Generando..." : `Generar ${totalHolidaysCount} Asuetos`}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        {/* Dialog de confirmación de eliminación */}
                        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar asuetos del año {itemToDelete?.year}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción eliminará permanentemente todos los asuetos configurados para este año
                                        ({itemToDelete?.annual_holidays_count} fechas). Esta acción no se puede deshacer.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleConfirmDelete}
                                        disabled={isDeleting}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                        {isDeleting ? "Eliminando..." : "Eliminar Permanentemente"}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </>
                )}
            </div>
        </CanAccess>
    );
};

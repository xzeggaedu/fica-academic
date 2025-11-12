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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/forms/select";
import type { FixedHolidayRule, FixedHolidayRuleUpdate } from "@/types/api";
import { getTableColumnClass } from "@/components/refine-ui/theme/theme-table";
import { HardDeleteConfirmDialog } from "@/components/ui/hard-delete-confirm-dialog";
import { Unauthorized } from "../unauthorized";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTablePagination } from "@/hooks/useTablePagination";
import { useFixedHolidayRulesCrud } from "@/hooks/useFixedHolidayRulesCrud";

export const FixedHolidayRulesList = () => {
    // Hook principal de asuetos fijos con todas las operaciones CRUD
    const {
        canCreate,
        itemsList: fixedHolidayRulesData,
        isLoading: fixedHolidayRulesLoading,
        isError: fixedHolidayRulesError,
        createItem: createFixedHolidayRule,
        updateItem: updateFixedHolidayRule,
        deleteItem: deleteFixedHolidayRule,
        updateSingleField,
        isCreating: creating,
        isUpdating: updating,
        isDeleting: deleting,
        canDelete,
        canEdit,
    } = useFixedHolidayRulesCrud();

    // Hook de paginación y búsqueda (stateless)
    const {
        paginatedData: fixedHolidayRulesList,
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
    } = useTablePagination<FixedHolidayRule>({
        data: fixedHolidayRulesData,
        initialPageSize: 10,
    });

    // Estados locales
    const [error, setError] = useState<string | null>(null);
    const [visibleColumns, setVisibleColumns] = useState([
        "id", "name", "month", "day", "actions"
    ]);

    // Estados para el formulario de creación
    const [newFixedHolidayRule, setNewFixedHolidayRule] = useState({
        name: "",
        month: 1,
        day: 1,
    });

    // Estados para edición inline (específicos de UI)
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<FixedHolidayRule>({} as FixedHolidayRule);

    useEffect(() => {
        if (fixedHolidayRulesError) {
            setError("Error al cargar los asuetos fijos");
        } else {
            setError(null);
        }
    }, [fixedHolidayRulesError]);

    // Función local para validar fechas
    const validateDate = (month: number, day: number): boolean => {
        if (month < 1 || month > 12) {
            toast.error("Error de validación", {
                description: "El mes debe estar entre 1 y 12.",
                richColors: true,
            });
            return false;
        }

        if (day < 1 || day > 31) {
            toast.error("Error de validación", {
                description: "El día debe estar entre 1 y 31.",
                richColors: true,
            });
            return false;
        }

        // Validar días por mes
        const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if (day > daysInMonth[month - 1]) {
            toast.error("Error de validación", {
                description: `El mes ${month} no tiene ${day} días.`,
                richColors: true,
            });
            return false;
        }

        return true;
    };

    // Función para crear un nuevo asueto fijo
    const handleCreate = () => {
        if (!newFixedHolidayRule.name.trim()) {
            toast.error("Error de validación", {
                description: "El nombre del asueto es requerido.",
                richColors: true,
            });
            return;
        }

        if (!validateDate(newFixedHolidayRule.month, newFixedHolidayRule.day)) {
            return;
        }

        createFixedHolidayRule(
            {
                name: newFixedHolidayRule.name.trim(),
                month: newFixedHolidayRule.month,
                day: newFixedHolidayRule.day,
            },
            () => {
                setNewFixedHolidayRule({
                    name: "",
                    month: 1,
                    day: 1,
                });
                toast.success("Asueto fijo creado", {
                    description: `El asueto "${newFixedHolidayRule.name}" ha sido creado exitosamente.`,
                    richColors: true,
                });
            }
        );
    };

    // Función para iniciar edición inline
    const handleStartEdit = (item: FixedHolidayRule, field: string) => {
        setEditingId(item.id);
        setEditingField(field);
        setEditForm({ ...item });
    };

    // Función para guardar edición inline
    const handleSaveEdit = (item: FixedHolidayRule, field: string) => {
        const value = editForm[field as keyof FixedHolidayRule];

        // Verificar si el valor ha cambiado
        if (value === item[field as keyof FixedHolidayRule]) {
            // No hay cambios, cancelar edición sin hacer save
            setEditingId(null);
            setEditingField(null);
            setEditForm({} as FixedHolidayRule);
            return;
        }

        // Validaciones específicas por campo
        if (field === "month" && (typeof value !== "number" || value < 1 || value > 12)) {
            toast.error("Error de validación", {
                description: "El mes debe estar entre 1 y 12.",
                richColors: true,
            });
            return;
        }

        if (field === "day" && (typeof value !== "number" || value < 1 || value > 31)) {
            toast.error("Error de validación", {
                description: "El día debe estar entre 1 y 31.",
                richColors: true,
            });
            return;
        }

        if ((field === "month" || field === "day") && !validateDate(
            field === "month" ? value as number : item.month,
            field === "day" ? value as number : item.day
        )) {
            return;
        }

        if (field === "name" && !(value as string)?.trim()) {
            toast.error("Error de validación", {
                description: "El nombre del asueto es requerido.",
                richColors: true,
            });
            return;
        }

        updateSingleField(
            item.id,
            field as keyof FixedHolidayRuleUpdate,
            value,
            () => {
                setEditingId(null);
                setEditingField(null);
                setEditForm({} as FixedHolidayRule);
            }
        );
    };

    // Función para cancelar edición inline
    const handleCancelEdit = () => {
        setEditingId(null);
        setEditingField(null);
        setEditForm({} as FixedHolidayRule);
    };

    // Función para eliminar un asueto fijo
    const handleDelete = (item: FixedHolidayRule) => {
        deleteFixedHolidayRule(
            item.id,
            item.name,
            () => {
                toast.success("Asueto fijo eliminado", {
                    description: `El asueto "${item.name}" ha sido eliminado permanentemente.`,
                    richColors: true,
                });
            }
        );
    };

    // Estados para el diálogo de eliminación
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedFixedHolidayRule, setSelectedFixedHolidayRule] = useState<{ id: number; name: string } | null>(null);

    // Columnas disponibles para el selector
    const availableColumns = [
        { key: "id", label: "ID" },
        { key: "name", label: "Nombre" },
        { key: "month", label: "Mes" },
        { key: "day", label: "Día" },
        { key: "actions", label: "Acciones" },
    ];

    // Opciones para los meses
    const monthOptions = [
        { value: 1, label: "Enero" },
        { value: 2, label: "Febrero" },
        { value: 3, label: "Marzo" },
        { value: 4, label: "Abril" },
        { value: 5, label: "Mayo" },
        { value: 6, label: "Junio" },
        { value: 7, label: "Julio" },
        { value: 8, label: "Agosto" },
        { value: 9, label: "Septiembre" },
        { value: 10, label: "Octubre" },
        { value: 11, label: "Noviembre" },
        { value: 12, label: "Diciembre" },
    ];

    return (
        <CanAccess
            resource="fixed-holiday-rules"
            action="list"
            fallback={<Unauthorized resourceName="asuetos fijos" message="Solo los administradores pueden gestionar asuetos fijos." />}
        >
            <div className="container mx-auto py-6 space-y-6 max-w-[98%]">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">Asuetos Fijos</h1>
                        <p className="text-muted-foreground">
                            Gestiona las reglas de asuetos fijos que se aplicarán automáticamente al generar asuetos por año
                        </p>
                    </div>
                </div>

                {/* Estados de carga y error */}
                {fixedHolidayRulesLoading && (
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

                {!fixedHolidayRulesLoading && !error && (
                    <>
                        {/* Formulario de creación */}
                        {canCreate?.can && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Plus className="h-5 w-5" />
                                        Crear Nuevo Asueto Fijo
                                    </CardTitle>
                                    <CardDescription>
                                        Agregue un nuevo asueto fijo que se aplicará automáticamente cada año
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex gap-4 items-end">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Nombre del Asueto *</Label>
                                            <Input
                                                id="name"
                                                placeholder="Ej: Día de la Independencia"
                                                value={newFixedHolidayRule.name}
                                                onChange={(e) => setNewFixedHolidayRule(prev => ({ ...prev, name: e.target.value }))}
                                                disabled={creating}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="month">Mes *</Label>
                                            <Select
                                                value={newFixedHolidayRule.month.toString()}
                                                onValueChange={(value) => setNewFixedHolidayRule(prev => ({ ...prev, month: parseInt(value) }))}
                                                disabled={creating}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {monthOptions.map((month) => (
                                                        <SelectItem key={month.value} value={month.value.toString()}>
                                                            {month.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="day">Día *</Label>
                                            <Input
                                                id="day"
                                                type="number"
                                                min="1"
                                                max="31"
                                                value={newFixedHolidayRule.day}
                                                onChange={(e) => setNewFixedHolidayRule(prev => ({ ...prev, day: parseInt(e.target.value) || 1 }))}
                                                disabled={creating}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Button
                                                onClick={handleCreate}
                                                disabled={!newFixedHolidayRule.name.trim() || creating}
                                                className="w-full md:w-auto"
                                            >
                                                <Plus className="mr-1 h-4 w-4" />
                                                {creating ? "Creando..." : "Crear Asueto Fijo"}
                                            </Button>
                                        </div>
                                    </div>

                                </CardContent>
                            </Card>
                        )}

                        {/* Tabla de asuetos fijos */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Lista de Asuetos Fijos ({total})</CardTitle>
                                <CardDescription>
                                    Aquí puedes ver y administrar el listado de asuetos fijos.
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
                                                {visibleColumns.includes("name") && <TableHead>Nombre</TableHead>}
                                                {visibleColumns.includes("month") && <TableHead>Mes</TableHead>}
                                                {visibleColumns.includes("day") && <TableHead>Día</TableHead>}
                                                {canDelete?.can && visibleColumns.includes("actions") && <TableHead className="text-center w-[100px]">Acciones</TableHead>}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {fixedHolidayRulesList.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={visibleColumns.length} className="text-center text-muted-foreground py-8">
                                                        No hay asuetos fijos configurados. Crea uno para comenzar.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                fixedHolidayRulesList.map((item) => (
                                                    <TableRow key={item.id}>
                                                        {visibleColumns.includes("id") && (
                                                            <TableCell className="font-mono text-sm">{item.id}</TableCell>
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
                                                        {visibleColumns.includes("month") && (
                                                            <TableCell>
                                                                {canEdit?.can && editingId === item.id && editingField === "month" ? (
                                                                    <Select
                                                                        value={editForm.month?.toString() || ""}
                                                                        onValueChange={(value) => setEditForm(prev => ({ ...prev, month: parseInt(value) }))}
                                                                        onOpenChange={(open) => {
                                                                            if (!open) handleSaveEdit(item, "month");
                                                                        }}
                                                                    >
                                                                        <SelectTrigger className="w-full">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {monthOptions.map((month) => (
                                                                                <SelectItem key={month.value} value={month.value.toString()}>
                                                                                    {month.label}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                ) : (
                                                                    <div
                                                                        className="cursor-pointer hover:bg-gray-50 p-1 rounded"
                                                                        onClick={() => handleStartEdit(item, "month")}
                                                                    >
                                                                        {monthOptions.find(m => m.value === item.month)?.label || item.month}
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                        )}
                                                        {visibleColumns.includes("day") && (
                                                            <TableCell>
                                                                {canEdit?.can && editingId === item.id && editingField === "day" ? (
                                                                    <Input
                                                                        type="number"
                                                                        min="1"
                                                                        max="31"
                                                                        value={editForm.day || ""}
                                                                        onChange={(e) => setEditForm(prev => ({ ...prev, day: parseInt(e.target.value) || 1 }))}
                                                                        onBlur={() => handleSaveEdit(item, "day")}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === "Enter") handleSaveEdit(item, "day");
                                                                            if (e.key === "Escape") handleCancelEdit();
                                                                        }}
                                                                        autoFocus
                                                                        className="w-full"
                                                                    />
                                                                ) : (
                                                                    <div
                                                                        className="cursor-pointer hover:bg-gray-50 p-1 rounded"
                                                                        onClick={() => handleStartEdit(item, "day")}
                                                                    >
                                                                        {item.day}
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                        )}
                                                        {canDelete?.can && visibleColumns.includes("actions") && (
                                                            <TableCell className="text-center">
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>

                                                                            <Button
                                                                                variant="outline"
                                                                                size="icon"
                                                                                onClick={() => {
                                                                                    setSelectedFixedHolidayRule({ id: item.id, name: item.name });
                                                                                    setDeleteDialogOpen(true);
                                                                                }}
                                                                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>Eliminar asueto fijo</p>
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

                        {/* Diálogo de eliminación */}
                        {selectedFixedHolidayRule && (
                            <HardDeleteConfirmDialog
                                entityType="asueto fijo"
                                entityName={selectedFixedHolidayRule.name}
                                isOpen={deleteDialogOpen}
                                onClose={() => {
                                    setDeleteDialogOpen(false);
                                    setSelectedFixedHolidayRule(null);
                                }}
                                onConfirm={() => {
                                    const item = fixedHolidayRulesList.find(f => f.id === selectedFixedHolidayRule.id);
                                    if (item) {
                                        handleDelete(item);
                                        setDeleteDialogOpen(false);
                                        setSelectedFixedHolidayRule(null);
                                    }
                                }}
                                isDeleting={deleting}
                                gender="m"
                            />
                        )}
                    </>
                )}
            </div>
        </CanAccess>
    );
};

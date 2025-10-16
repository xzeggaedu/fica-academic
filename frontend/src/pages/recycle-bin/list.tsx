import React, { useState, useMemo, useCallback } from "react";
import { useList, CanAccess, useCan, useUpdate, useDelete, useInvalidate, useGetIdentity } from "@refinedev/core";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, RotateCcw, Archive, Users, Building2, BookOpen, Calendar, ChevronDown, Settings2, Clock } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/data/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/forms/input";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
} from "@/components/ui/pagination";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Unauthorized } from "../unauthorized";

interface RecycleBinItem {
    id: number;
    entity_type: string;
    entity_id: string;
    entity_display_name: string;
    deleted_by_name: string;
    deleted_at: string;
    reason?: string;
    can_restore: boolean;
    restored_at?: string;
    restored_by_name?: string;
}

export const RecycleBinList = () => {
    // Obtener usuario actual
    const { data: currentUser } = useGetIdentity<{
        id: string;
        name: string;
        email: string;
    }>();

    // Verificar permisos primero
    const { data: canAccess } = useCan({
        resource: "recycle-bin",
        action: "list",
    });

    // Estados para paginación
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const { query, result } = useList({
        resource: "recycle-bin",
        pagination: {
            currentPage: currentPage,
            pageSize: pageSize,
            mode: "server",
        },
        sorters: [
            {
                field: "deleted_at",
                order: "desc",
            },
        ],
        queryOptions: {
            enabled: canAccess?.can ?? false, // Solo hacer fetch si tiene permisos
            refetchOnWindowFocus: true,
            refetchOnMount: true,
            staleTime: 0,
            gcTime: 0,
        },
        successNotification: false,
        errorNotification: false,
    });

    const queryClient = useQueryClient();

    // Hooks para operaciones de papelera
    const { mutate: restoreItem, mutation: restoreMutation } = useUpdate();
    const { mutate: permanentDelete, mutation: deleteMutation } = useDelete();
    const invalidate = useInvalidate();

    const isRestoring = restoreMutation.isPending;
    const isDeleting = deleteMutation.isPending;

    // Estados para modales
    const [selectedItem, setSelectedItem] = useState<RecycleBinItem | null>(null);
    const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
    const [confirmationText, setConfirmationText] = useState("");

    // Debug: Monitorear cambios en selectedItem
    // Debug logging removed for production

    // Función para formatear fechas
    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString("es-ES", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch (error) {
            console.warn('Error parsing date:', dateString, error);
            return 'Error de fecha';
        }
    };

    // Función para obtener el icono según el tipo de entidad
    const getEntityIcon = (entityType: string) => {
        switch (entityType.toLowerCase()) {
            case 'user':
                return <Users className="h-4 w-4" />;
            case 'faculty':
                return <Building2 className="h-4 w-4" />;
            case 'course':
                return <BookOpen className="h-4 w-4" />;
            case 'schedule':
                return <Calendar className="h-4 w-4" />;
            default:
                return <Archive className="h-4 w-4" />;
        }
    };

    // Función para obtener el color del badge según el tipo
    const getEntityBadgeColor = (entityType: string) => {
        switch (entityType.toLowerCase()) {
            case 'user':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
            case 'faculty':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'course':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
            case 'schedule':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
        }
    };

    // Función para manejar restauración
    const handleRestore = (item: RecycleBinItem) => {
        setSelectedItem(item);
        setRestoreDialogOpen(true);
    };

    // Función para confirmar restauración
    const handleConfirmRestore = () => {
        if (!selectedItem || !currentUser) return;

        restoreItem(
            {
                resource: "recycle-bin-restore",
                id: selectedItem.id,
                values: {
                    restored_by_id: currentUser.id,
                    restored_by_name: currentUser.name,
                },
                successNotification: false,
            },
            {
                onSuccess: () => {
                    toast.success('Elemento restaurado', {
                        description: `"${selectedItem.entity_display_name}" ha sido restaurado exitosamente.`,
                        richColors: true,
                    });
                    invalidate({
                        resource: "recycle-bin",
                        invalidates: ["list"],
                    });
                    setRestoreDialogOpen(false);
                    setSelectedItem(null);
                },
                onError: (error) => {
                    console.error("Error restoring item:", error);
                    toast.error('Error al restaurar', {
                        description: error?.message || 'Error desconocido',
                        richColors: true,
                    });
                },
            }
        );
    };

    // Función para manejar eliminación permanente (Paso 1: Abrir primer modal)
    const handlePermanentDelete = useCallback((item: RecycleBinItem) => {
        setSelectedItem(item);
        setConfirmationText("");
        setDeleteDialogOpen(true);
    }, []);

    async function waitOneSecond(seconds: number): Promise<void> {
        await new Promise<void>((resolve) => setTimeout(resolve, seconds));
    }

    // Función para proceder a la confirmación final (Paso 2: Validar texto y abrir segundo modal)
    const handleProceedToFinalConfirmation = async () => {
        if (confirmationText !== "eliminar registro permanentemente") {
            toast.error('Texto de confirmación incorrecto', {
                description: 'Por favor escribe exactamente "eliminar registro permanentemente"',
                richColors: true,
            });
            return;
        }

        // Cerrar primer modal
        setDeleteDialogOpen(false);

        // Esperar 0.5 segundos
        await waitOneSecond(250);

        // Abrir segundo modal
        setConfirmDeleteDialogOpen(true);
    };

    // Función para confirmar eliminación permanente (Paso 3: Ejecutar eliminación)
    const handleConfirmPermanentDelete = useCallback((itemToDelete?: RecycleBinItem) => {
        // Usar el parámetro si está disponible, sino usar el state
        const item = itemToDelete || selectedItem;

        if (!item) {
            return;
        }

        permanentDelete(
            {
                resource: "recycle-bin",
                id: item.id,
                successNotification: false,
            },
            {
                onSuccess: () => {
                    toast.success('Elemento eliminado permanentemente', {
                        description: `"${item.entity_display_name}" ha sido eliminado permanentemente.`,
                        richColors: true,
                    });
                    invalidate({
                        resource: "recycle-bin",
                        invalidates: ["list"],
                    });
                    setConfirmDeleteDialogOpen(false);
                    setSelectedItem(null);
                    setConfirmationText("");
                },
                onError: (error) => {
                    console.error("Error deleting item permanently:", error);
                    toast.error('Error al eliminar permanentemente', {
                        description: error?.message || 'Error desconocido',
                        richColors: true,
                    });
                },
            }
        );
    }, [selectedItem, permanentDelete, invalidate]);

    // Función para cerrar primer modal sin limpiar selectedItem
    const handleCloseFirstModal = useCallback(() => {
        setDeleteDialogOpen(false);
        setConfirmationText("");
        // NO limpiar selectedItem aquí
    }, []);

    // Función para cancelar eliminación (limpia todo)
    const handleCancelDelete = useCallback(() => {
        setDeleteDialogOpen(false);
        setConfirmDeleteDialogOpen(false);
        setSelectedItem(null);
        setConfirmationText("");
    }, []);

    const items = useMemo(() => result.data || [], [result.data]);
    const total = result.total || 0;

    const [searchValue, setSearchValue] = useState("");
    const [entityTypeFilter, setEntityTypeFilter] = useState<string>("");

    const filteredData = useMemo(() => {
        let filtered = items;

        if (searchValue) {
            filtered = filtered.filter((item) =>
                (item as any).entity_display_name.toLowerCase().includes(searchValue.toLowerCase()) ||
                (item as any).deleted_by_name.toLowerCase().includes(searchValue.toLowerCase())
            );
        }

        if (entityTypeFilter) {
            filtered = filtered.filter((item) =>
                (item as any).entity_type.toLowerCase() === entityTypeFilter.toLowerCase()
            );
        }

        return filtered;
    }, [items, searchValue, entityTypeFilter]);

    const [visibleColumns, setVisibleColumns] = useState<string[]>([
        "entity_type",
        "entity_display_name",
        "deleted_by_name",
        "deleted_at",
        "status",
        "actions",
    ]);

    // Función para alternar visibilidad de columnas
    const handleColumnToggle = (columnKey: string) => {
        setVisibleColumns(prev =>
            prev.includes(columnKey)
                ? prev.filter(col => col !== columnKey)
                : [...prev, columnKey]
        );
    };

    if (query.isLoading) {
        return <div>Cargando papelera...</div>;
    }

    if (query.error) {
        return <div>Error al cargar papelera: {query.error.message}</div>;
    }

    if (canAccess?.can === false) {
        return <Unauthorized />;
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
            <div className="flex items-start gap-2">
              <Clock className="h-6 w-6 mt-1" />
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold">Papelera</h1>
              </div>
            </div>
          </div>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Trash2 className="h-5 w-5" />
                    Papelera de Reciclaje
                </CardTitle>
                <CardDescription>
                    Gestiona los elementos eliminados. Puedes restaurarlos o eliminarlos permanentemente.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between pb-4">
                    {/* Lado izquierdo: Search y Filtro de tipos */}
                    <div className="flex items-center gap-4">
                        {/* Search */}
                        <div className="relative max-w-sm">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input
                                placeholder="Buscar en papelera..."
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* Filtro por tipo de entidad */}
                        <div className="flex items-center gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline">
                                        {entityTypeFilter === "" ? "Todos los tipos" :
                                         entityTypeFilter === "user" ? "Usuarios" :
                                         entityTypeFilter === "faculty" ? "Facultades" :
                                         entityTypeFilter === "course" ? "Cursos" :
                                         entityTypeFilter === "schedule" ? "Horarios" : "Todos los tipos"}
                                        <ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setEntityTypeFilter("")}>
                                        Todos los tipos
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setEntityTypeFilter("user")}>
                                        Usuarios
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setEntityTypeFilter("faculty")}>
                                        Facultades
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setEntityTypeFilter("course")}>
                                        Cursos
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setEntityTypeFilter("schedule")}>
                                        Horarios
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Lado derecho: Dropdown de columnas */}
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    <Settings2 className="mr-2 h-4 w-4" />
                                    Columnas
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[200px]">
                                <DropdownMenuLabel>Mostrar columnas</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {[
                                    { key: "entity_type", label: "Tipo" },
                                    { key: "entity_display_name", label: "Elemento" },
                                    { key: "deleted_by_name", label: "Eliminado por" },
                                    { key: "deleted_at", label: "Fecha de Eliminación" },
                                    { key: "status", label: "Estado" },
                                    { key: "actions", label: "Acciones" },
                                ].map((column) => (
                                    <DropdownMenuCheckboxItem
                                        key={column.key}
                                        className="capitalize"
                                        checked={visibleColumns.includes(column.key)}
                                        onCheckedChange={() => handleColumnToggle(column.key)}
                                    >
                                        {column.label}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {visibleColumns.includes("entity_type") && (
                                    <TableHead className="text-left">Tipo</TableHead>
                                )}
                                {visibleColumns.includes("entity_display_name") && (
                                    <TableHead className="text-left">Elemento</TableHead>
                                )}
                                {visibleColumns.includes("deleted_by_name") && (
                                    <TableHead className="text-left">Eliminado por</TableHead>
                                )}
                                {visibleColumns.includes("deleted_at") && (
                                    <TableHead className="text-left">Fecha de Eliminación</TableHead>
                                )}
                                {visibleColumns.includes("status") && (
                                    <TableHead className="text-center w-[100px]">Estado</TableHead>
                                )}
                                {visibleColumns.includes("actions") && (
                                    <TableHead className="text-center w-[100px]">Acciones</TableHead>
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={visibleColumns.length} className="h-24 text-center">
                                        {items.length === 0
                                            ? "La papelera está vacía."
                                            : "No se encontraron elementos con los filtros aplicados."
                                        }
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredData.map((item) => (
                                    <TableRow key={item.id}>
                                        {visibleColumns.includes("entity_type") && (
                                            <TableCell className="text-left">
                                                <Badge className={`${getEntityBadgeColor((item as any).entity_type)} flex items-center gap-1 w-fit`}>
                                                    {getEntityIcon((item as any).entity_type)}
                                                    {(item as any).entity_type.charAt(0).toUpperCase() + (item as any).entity_type.slice(1)}
                                                </Badge>
                                            </TableCell>
                                        )}
                                        {visibleColumns.includes("entity_display_name") && (
                                            <TableCell className="text-left">
                                                <div className="font-medium">{(item as any).entity_display_name}</div>
                                                {(item as any).reason && (
                                                    <div className="text-sm text-muted-foreground">{(item as any).reason}</div>
                                                )}
                                            </TableCell>
                                        )}
                                        {visibleColumns.includes("deleted_by_name") && (
                                            <TableCell className="text-left">
                                                {(item as any).deleted_by_name}
                                            </TableCell>
                                        )}
                                        {visibleColumns.includes("deleted_at") && (
                                            <TableCell className="text-left">
                                                {formatDate((item as any).deleted_at)}
                                            </TableCell>
                                        )}
                                        {visibleColumns.includes("status") && (
                                            <TableCell className="text-left">
                                                {(item as any).restored_at ? (
                                                    <Badge variant="outline" className="text-green-500 border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400">
                                                        Restaurado
                                                    </Badge>
                                                ) : (item as any).can_restore ? (
                                                    <Badge variant="outline" className="text-yellow-500 border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800 dark:text-yellow-400">
                                                        Pendiente
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-red-500 border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400">
                                                        Eliminado
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        )}
                                        {visibleColumns.includes("actions") && (
                                            <TableCell className="text-center">
                                                <TooltipProvider>
                                                    <div className="flex items-center gap-2 justify-center">
                                                        {(item as any).can_restore && !(item as any).restored_at && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        onClick={() => handleRestore(item as any)}
                                                                        disabled={isRestoring || isDeleting}
                                                                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                                                                    >
                                                                        <RotateCcw className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Restaurar elemento</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                        {(item as any).can_restore && !(item as any).restored_at && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        onClick={() => handlePermanentDelete(item as any)}
                                                                        disabled={isRestoring || isDeleting}
                                                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Eliminar permanentemente</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                    </div>
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
                {!query.isLoading && !query.error && (() => {
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
                        <div className="mt-4 space-y-4">
                            {/* Información de resultados */}
                            <div className="flex items-center justify-between px-2 text-sm text-muted-foreground">
                                <div>
                                    Mostrando {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, total)} de {total} elementos
                                    {searchValue && ` (filtrados por "${searchValue}")`}
                                    {entityTypeFilter && ` (tipo: ${entityTypeFilter})`}
                                </div>
                            </div>

                            {/* Controles de paginación */}
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem className="mr-4">
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
                        </div>
                    );
                })()}
            </CardContent>

            {/* Modal de confirmación de restauración */}
            <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Restaurar elemento?</AlertDialogTitle>
                        <div className="text-sm text-muted-foreground">
                            ¿Estás seguro de que quieres restaurar "{selectedItem?.entity_display_name}"?
                            Este elemento volverá a estar disponible en el sistema.
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmRestore}
                            disabled={isRestoring}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isRestoring ? 'Restaurando...' : 'Restaurar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Paso 1: Modal de confirmación con texto */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={handleCloseFirstModal}>
                <AlertDialogContent className="max-w-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar permanentemente</AlertDialogTitle>
                        <div className="space-y-4 pt-4">
                            <div className="rounded-lg bg-red-50 dark:bg-red-950 p-4 border border-red-200 dark:border-red-800">
                                <p className="text-sm text-red-800 dark:text-red-200 font-semibold mb-2">
                                    ⚠️ ADVERTENCIA:
                                </p>
                                <p className="text-sm text-red-700 dark:text-red-300">
                                    Estás a punto de eliminar permanentemente el registro:
                                </p>
                                <p className="text-sm font-bold text-red-900 dark:text-red-100 mt-2">
                                    {selectedItem?.entity_display_name}
                                </p>
                                <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                                    Este registro será eliminado completamente de la base de datos y solo se mantendrá como historial en la papelera.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Para confirmar, escribe:{" "}
                                    <span className="font-mono px-1 py-1 italic text-red-600">
                                        eliminar registro permanentemente
                                    </span>
                                </label>
                                <Input
                                    value={confirmationText}
                                    onChange={(e) => setConfirmationText(e.target.value)}
                                    placeholder="eliminar registro permanentemente"
                                    className="font-mono mt-2"
                                    autoFocus
                                />
                            </div>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCloseFirstModal}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleProceedToFinalConfirmation}
                            disabled={confirmationText !== "eliminar registro permanentemente"}
                            className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400"
                        >
                            Continuar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Paso 2: Modal de confirmación final */}
            <AlertDialog open={confirmDeleteDialogOpen} onOpenChange={handleCancelDelete}>
                <AlertDialogContent key={selectedItem?.id || 'confirm'} className="max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle>⚠️ Confirmación final</AlertDialogTitle>
                        <div className="text-sm text-muted-foreground space-y-2">
                            <p>
                                Ok, haz elegido eliminar <strong>{selectedItem?.entity_display_name || 'N/A'}</strong>, se eliminara permanentemente de la base de datos. Esta es tu última oportunidad para cancelar.
                            </p>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCancelDelete}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => handleConfirmPermanentDelete(selectedItem)}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? 'Eliminando...' : 'Eliminar permanentemente'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
        </div>
    );
};

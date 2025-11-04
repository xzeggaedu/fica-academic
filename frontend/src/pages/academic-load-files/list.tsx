import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
import { Label } from "@/components/ui/forms/label";
import { toast } from "sonner";
import { Plus, Trash2, Eye, X, Upload, FileSpreadsheet, Save, RefreshCw, XCircle, CheckCircle, Star, Receipt } from "lucide-react";
import { TableFilters } from "@/components/ui/data/table-filters";
import { TablePagination } from "@/components/ui/data/table-pagination";
import type { AcademicLoadFile, Faculty, School, Term } from "@/types/api";
import { getTableColumnClass } from "@/components/refine-ui/theme/theme-table";
import { HardDeleteConfirmDialog } from "@/components/ui/hard-delete-confirm-dialog";
import { Unauthorized } from "../unauthorized";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { useTablePagination } from "@/hooks/useTablePagination";
import { useAcademicLoadFilesCrud } from "@/hooks/useAcademicLoadFilesCrud";
import { useList, useGetIdentity } from "@refinedev/core";
import { UserRoleEnum } from "@/types/api";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export const AcademicLoadFilesList: React.FC = () => {
    const navigate = useNavigate();
    const {
        itemsList,
        total,
        isLoading,
        isError,
        isCreating,
        canCreate,
        canAccess,
        canDelete,
        createItem,
        invalidate,
        deleteHook,
        verifyActiveVersion,
        myScope,
    } = useAcademicLoadFilesCrud();

    // Ref para tracking de items que estaban pendientes
    const previousPendingItemsRef = useRef<Set<number>>(new Set());

    // Polling para items con estado "pending" o "processing"
    useEffect(() => {
        const pendingItems = itemsList.filter(item =>
            item.ingestion_status === "pending" || item.ingestion_status === "processing"
        );

        // Detectar items que pasaron de pending/processing a completed
        const currentPendingIds = new Set(pendingItems.map(item => item.id));
        const completedItems = itemsList.filter(item => {
            const wasPending = previousPendingItemsRef.current.has(item.id);
            const isNowCompleted = item.ingestion_status === "completed";
            return wasPending && isNowCompleted;
        });

        // Mostrar toast para items completados
        completedItems.forEach(item => {
            toast.success("Carga académica procesada exitosamente", {
                description: `El archivo "${item.original_filename}" ha sido procesado correctamente.`,
                richColors: true,
            });
        });

        // Actualizar el ref con los items pendientes actuales
        previousPendingItemsRef.current = currentPendingIds;

        if (pendingItems.length === 0) {
            return;
        }

        // Interval para refetch cada 1 segundo
        const intervalId = setInterval(() => {
            invalidate({ invalidates: ["list"], resource: "academic-load-files" });
        }, 1000);

        return () => clearInterval(intervalId);
    }, [itemsList, invalidate]);

    // Estados para filtros y paginación
    const [searchTerm, setSearchTerm] = useState("");
    const [showIdColumn, setShowIdColumn] = useState(false);

    // Identidad del usuario autenticado (Refine)
    const { data: identity } = useGetIdentity<any>();
    const currentUserUuid: string | null = (
        identity?.user_uuid ?? identity?.uuid ?? identity?.id ?? null
    )?.toString?.() ?? null;
    const currentUserRole: string | null = (
        identity?.role ?? identity?.user_role ?? null
    )?.toString?.().toLowerCase?.() ?? null;
    const isDecano = currentUserRole === UserRoleEnum.DECANO.toLowerCase();

    const canDeleteRow = (item: AcademicLoadFile) => {
        // ADMIN puede eliminar cualquier archivo
        if (canDelete) return true;
        // El propietario puede eliminar sus propios archivos
        if (item.user_id && currentUserUuid) {
            return item.user_id.toString() === currentUserUuid.toString();
        }
        // DIRECTOR puede eliminar archivos de sus escuelas asignadas
        if (currentUserRole === "director" && myScope?.school_ids && Array.isArray(myScope.school_ids)) {
            return myScope.school_ids.includes(item.school_id);
        }
        return false;
    };

    // Columnas disponibles
    const availableColumns = [
        { key: "id", label: "ID" }
    ];
    const visibleColumns = showIdColumn ? ["id"] : [];

    // Estados del formulario de creación
    const [formData, setFormData] = useState({
        faculty_id: 0,
        school_id: 0,
        term_id: 0,
        strict_validation: false,
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    // Cargar facultades, escuelas y períodos
    const { result: facultiesResult } = useList<Faculty>({
        resource: "faculties",
        pagination: { currentPage: 1, pageSize: 1000 },
    });

    const { result: schoolsResult } = useList<School>({
        resource: "schools",
        pagination: { currentPage: 1, pageSize: 1000 },
    });

    const { result: termsResult } = useList<Term>({
        resource: "terms",
        pagination: { currentPage: 1, pageSize: 1000 },
    });

    const faculties = facultiesResult?.data || [];
    const schools = schoolsResult?.data || [];
    const terms = termsResult?.data || [];

    // Preseleccionar facultad/escuela para DIRECTOR según scope
    useEffect(() => {
        const scopeSchools = (myScope?.school_ids as number[] | undefined) || [];
        if (canCreate && scopeSchools.length > 0 && formData.school_id === 0) {
            const firstSchool = schools.find((s: any) => s.id === scopeSchools[0]);
            if (firstSchool) {
                setFormData((prev) => ({
                    ...prev,
                    faculty_id: firstSchool.fk_faculty,
                    school_id: firstSchool.id,
                }));
            }
        }
    }, [canCreate, myScope, schools]);

    // Filtrar y agrupar datos por versión
    const filteredItems = itemsList
        .filter((item) => {
            const matchesSearch =
                item.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.faculty?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.school?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.user_name.toLowerCase().includes(searchTerm.toLowerCase());

            return matchesSearch;
        })
        // Ordenar: Si es DECANO, primero por término, luego por escuela, luego versión
        // Si no es DECANO, por contexto (faculty, school, term) y luego por versión descendente
        .sort((a, b) => {
            if (isDecano) {
                // Primero por término
                if (a.term_id !== b.term_id) {
                    return a.term_id - b.term_id;
                }
                // Luego por escuela
                if (a.school_id !== b.school_id) {
                    return a.school_id - b.school_id;
                }
                // Finalmente por versión descendente
                return (b.version || 1) - (a.version || 1);
            } else {
                // Primero por facultad
                if (a.faculty_id !== b.faculty_id) {
                    return a.faculty_id - b.faculty_id;
                }
                // Luego por escuela
                if (a.school_id !== b.school_id) {
                    return a.school_id - b.school_id;
                }
                // Luego por término
                if (a.term_id !== b.term_id) {
                    return a.term_id - b.term_id;
                }
                // Finalmente por versión descendente
                return (b.version || 1) - (a.version || 1);
            }
        });

    // Agrupar por ciclo si es DECANO
    const groupedByTerm = React.useMemo(() => {
        if (!isDecano) {
            return null;
        }

        const grouped: Record<string, { term_id: number; term_term: number; term_year: number; items: AcademicLoadFile[] }> = {};
        const seenItemIds = new Set<number>();

        // Filtrar duplicados y agrupar
        filteredItems.forEach((item) => {
            // Evitar agregar el mismo item dos veces
            if (seenItemIds.has(item.id)) {
                return;
            }
            seenItemIds.add(item.id);

            // Usar term_term y term_year directamente del item (vienen del backend)
            // El backend envía estos campos directamente en AcademicLoadFileListResponse
            const termTerm = item.term_term !== null && item.term_term !== undefined
                ? item.term_term
                : (item.term?.term ?? null);
            const termYear = item.term_year !== null && item.term_year !== undefined
                ? item.term_year
                : (item.term?.year ?? null);

            // Solo agrupar si tenemos datos válidos del término
            if (termTerm !== null && termTerm !== undefined && termYear !== null && termYear !== undefined) {
                const termKey = `${item.term_id}_${termTerm}_${termYear}`;
                if (!grouped[termKey]) {
                    grouped[termKey] = {
                        term_id: item.term_id,
                        term_term: termTerm,
                        term_year: termYear,
                        items: []
                    };
                }
                grouped[termKey].items.push(item);
            }
        });

        return grouped;
    }, [filteredItems, isDecano]);

    // Obtener todas las planillas para verificar cuáles cargas tienen planillas
    const allBillingReports = useList<{ academic_load_file_id: number }>({
        resource: "billing-reports",
        pagination: {
            currentPage: 1,
            pageSize: 10000,
            mode: "server",
        },
    });

    const fileIdsWithReports = React.useMemo(() => {
        const reports = allBillingReports?.result?.data || [];
        return new Set(reports.map((r: any) => r.academic_load_file_id));
    }, [allBillingReports?.result?.data]);

    // Función para verificar si un grupo tiene al menos una planilla
    const groupHasReports = (items: AcademicLoadFile[]): boolean => {
        return items.some(item => fileIdsWithReports.has(item.id));
    };

    // Handler para abrir consolidado
    const handleViewConsolidated = (termId: number, items: AcademicLoadFile[]) => {
        const fileIds = items.map(f => f.id).join(',');
        navigate(`/academic-planning/billing-reports/consolidated/${termId}?fileIds=${fileIds}`);
    };

    // Función helper para renderizar celdas de una fila
    const renderTableRowCells = (item: AcademicLoadFile, isActive: boolean) => {
        return (
            <>
                {showIdColumn && (
                    <TableCell className={getTableColumnClass("id")}>
                        #{item.id}
                    </TableCell>
                )}
                <TableCell className={getTableColumnClass("name")}>
                    <div className="font-medium">{item.original_filename}</div>
                </TableCell>
                <TableCell className={getTableColumnClass("name")}>
                    {isActive ? (
                        <div className="flex items-center gap-1">
                            Versión {item.version || 1}
                            <Star className="h-3 w-3 ml-1 fill-yellow-200" />
                        </div>
                    ) : (
                        <span className="text-gray-600">
                            versión {item.version || 1}
                        </span>
                    )}
                </TableCell>
                <TableCell className={getTableColumnClass("name")}>
                    {item.faculty?.acronym ? (
                        <Badge variant="outline" className="font-mono">
                            {item.faculty.acronym}
                        </Badge>
                    ) : (
                        "N/A"
                    )}
                </TableCell>
                <TableCell className={getTableColumnClass("name")}>
                    {item.school?.acronym ? (
                        <Badge variant="secondary" className="font-mono">
                            {item.school.acronym}
                        </Badge>
                    ) : (
                        "N/A"
                    )}
                </TableCell>
                <TableCell className={getTableColumnClass("name")}>
                    Ciclo 0{item.term_name || "N/A"}
                </TableCell>
                <TableCell className={getTableColumnClass("name")}>
                    {item.user_name || "N/A"}
                </TableCell>
                <TableCell className={getTableColumnClass("date")}>
                    {format(new Date(item.upload_date), "dd/MM/yyyy HH:mm", { locale: es })}
                </TableCell>
                <TableCell className={getTableColumnClass("status")}>
                    <div className="flex items-center gap-2">
                        {item.ingestion_status === "failed" && item.notes ? (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => openErrorModal(item)}
                                className="text-xs"
                            >
                                <XCircle className="w-3 h-3 mr-1" />
                                Ver Errores ({parseErrorDetails(item.notes)?.summary?.failed || 0})
                            </Button>
                        ) : (
                            getStatusDisplay(item.ingestion_status, item.notes)
                        )}

                        {/* Botón de Cambios si hay cambios en notes */}
                        {parseChangesDetails(item.notes) && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openChangesModal(item)}
                                className="text-xs"
                            >
                                Ver Cambios
                            </Button>
                        )}
                    </div>
                </TableCell>
                <TableCell className={getTableColumnClass("actions")}>
                    <div className="flex items-center gap-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleView(item)}
                                        disabled={item.ingestion_status !== "completed"}
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>
                                        {item.ingestion_status === "completed"
                                            ? "Ver detalles"
                                            : "Solo disponible para archivos completados"}
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        {canDeleteRow(item) && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openDeleteModal(item)}
                                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                            disabled={item.ingestion_status === "pending" || item.ingestion_status === "processing" || !item.is_active}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>
                                            {!item.is_active
                                                ? "Solo se puede eliminar la versión activa"
                                                : item.ingestion_status === "pending" || item.ingestion_status === "processing"
                                                    ? "No se puede eliminar durante el procesamiento"
                                                    : item.ingestion_status === "failed"
                                                        ? "Eliminar archivo fallido"
                                                        : "Eliminar archivo"}
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                </TableCell>
            </>
        );
    };

    // Funciones del formulario de creación
    const handleFileSelect = (file: File) => {
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
        ];

        const allowedExtensions = ['.xlsx', '.xls'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
            toast.error("Error", {
                description: "Solo se permiten archivos Excel (.xlsx, .xls)",
                richColors: true,
            });
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error("Error", {
                description: "El archivo no puede ser mayor a 10MB",
                richColors: true,
            });
            return;
        }

        setSelectedFile(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const removeFile = () => {
        setSelectedFile(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validaciones
        if (!selectedFile) {
            toast.error("Error", {
                description: "Por favor seleccione un archivo Excel",
                richColors: true,
            });
            return;
        }

        if (!formData.faculty_id || !formData.school_id || !formData.term_id) {
            toast.error("Error", {
                description: "Por favor seleccione una facultad, escuela y período",
                richColors: true,
            });
            return;
        }

        // Verificar con el backend si ya existe una versión activa
        try {
            const result = await verifyActiveVersion(formData.faculty_id, formData.school_id, formData.term_id);
            console.log("🔍 Resultado de verifyActiveVersion:", result);

            if (result.exists) {
                // Ya existe una versión activa, mostrar modal de confirmación
                const submitData = new FormData();
                submitData.append('file', selectedFile);
                submitData.append('faculty_id', formData.faculty_id.toString());
                submitData.append('school_id', formData.school_id.toString());
                submitData.append('term_id', formData.term_id.toString());
                submitData.append('strict_validation', formData.strict_validation.toString());

                // Obtener nombres de facultad, escuela y término
                const faculty = faculties.find(f => f.id === formData.faculty_id);
                const school = schools.find(s => s.id === formData.school_id);
                const term = terms.find(t => t.id === formData.term_id);

                setPendingUpload(submitData);
                setVersionConfirmData({
                    facultyName: faculty?.name || '',
                    schoolName: school?.name || '',
                    termName: term ? `${term.term} ${term.year}` : ''
                });
                setIsVersionConfirmOpen(true);
                return;
            }
        } catch (error) {
            console.error("Error al verificar versión activa:", error);
            toast.error("Error", {
                description: "No se pudo verificar si existe una versión anterior",
                richColors: true,
            });
            return;
        }

        // Si no existe versión anterior, subir directamente
        await performUpload();
    };

    const performUpload = async () => {
        if (!pendingUpload && !selectedFile) {
            toast.error("Error", {
                description: "No hay archivo para subir",
                richColors: true,
            });
            return;
        }

        try {
            // Usar datos pendientes o crear nuevos
            const submitData = pendingUpload || (() => {
                const data = new FormData();
                data.append('file', selectedFile!);
                data.append('faculty_id', formData.faculty_id.toString());
                data.append('school_id', formData.school_id.toString());
                data.append('term_id', formData.term_id.toString());
                data.append('strict_validation', formData.strict_validation.toString());
                return data;
            })();

            // Llamar al hook de creación
            await createItem(submitData);

            // Resetear formulario
            resetForm();

            // Refrescar la lista
            invalidate({ invalidates: ["list"], resource: "academic-load-files" });

            // Limpiar estado de confirmación
            setPendingUpload(null);
            setVersionConfirmData(null);
            setIsVersionConfirmOpen(false);

        } catch (error) {
            console.error("Error al subir archivo:", error);
        }
    };

    const handleVersionConfirmCancel = () => {
        setIsVersionConfirmOpen(false);
        setPendingUpload(null);
        setVersionConfirmData(null);
    };

    const resetForm = () => {
        setFormData({
            faculty_id: 0,
            school_id: 0,
            term_id: 0,
            strict_validation: false,
        });
        setSelectedFile(null);
    };

    // Función para obtener el estado visual del procesamiento
    const getStatusDisplay = (status: string, notes?: string | null) => {
        const statusBadge = (() => {
            switch (status) {
                case "pending":
                    return (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                            Pendiente
                        </span>
                    );
                case "processing":
                    return (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                            Procesando
                        </span>
                    );
                case "completed":
                    return (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" /> Completado
                        </span>
                    );
                case "failed":
                    return (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <XCircle className="w-3 h-3 mr-1" /> Error
                        </span>
                    );
                default:
                    return (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                            {status}
                        </span>
                    );
            }
        })();

        return statusBadge;
    };

    // Preparar datos para paginación
    // Si es DECANO, usar grupos directamente sin aplanar (paginación se hará sobre grupos)
    const itemsForPagination = React.useMemo(() => {
        // Para DECANO, manejamos la paginación manualmente sobre grupos
        // Para otros roles, usar filteredItems normal
        return filteredItems;
    }, [filteredItems]);

    // Paginación
    const {
        currentPage,
        pageSize,
        totalPages,
        paginatedData,
        canPrevPage,
        canNextPage,
        nextPage,
        prevPage,
        goToPage,
        setPageSize,
    } = useTablePagination({
        data: itemsForPagination,
        initialPageSize: 10,
    });

    // Datos paginados
    const paginatedItems = paginatedData;

    // Estados para modales
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<AcademicLoadFile | null>(null);
    const [isVersionConfirmOpen, setIsVersionConfirmOpen] = useState(false);
    const [pendingUpload, setPendingUpload] = useState<FormData | null>(null);
    const [versionConfirmData, setVersionConfirmData] = useState<{ facultyName: string; schoolName: string; termName: string } | null>(null);
    const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
    const [errorDetails, setErrorDetails] = useState<any>(null);
    const [isChangesModalOpen, setIsChangesModalOpen] = useState(false);
    const [changesDetails, setChangesDetails] = useState<any>(null);

    // Función para parsear errores desde notes
    const parseErrorDetails = (notes: string | null) => {
        if (!notes) return null;

        try {
            // Si es JSON, parsearlo
            return JSON.parse(notes);
        } catch {
            // Si es string simple, mostrar como está
            return { summary: { message: notes } };
        }
    };

    const parseChangesDetails = (notes: string | null) => {
        if (!notes) return null;
        try {
            const data = JSON.parse(notes);
            if (data && data.changes && Array.isArray(data.changes)) return data.changes;
            return null;
        } catch {
            return null;
        }
    };

    // Función para abrir modal de errores
    const openErrorModal = (item: AcademicLoadFile) => {
        const parsed = parseErrorDetails(item.notes);
        setErrorDetails(parsed);
        setIsErrorModalOpen(true);
    };

    const openChangesModal = (item: AcademicLoadFile) => {
        const parsed = parseChangesDetails(item.notes);
        setChangesDetails(parsed || []);
        setIsChangesModalOpen(true);
    };

    // Función para abrir modal de eliminación
    const openDeleteModal = (item: AcademicLoadFile) => {
        setItemToDelete(item);
        setIsDeleteModalOpen(true);
    };

    // Función para cerrar modal de eliminación
    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setItemToDelete(null);
    };

    // Función para eliminar item
    const handleDelete = async () => {
        if (itemToDelete) {
            try {
                // Verificar si es una versión activa antes de eliminar
                const wasActive = itemToDelete.is_active;

                // Llamar al API para eliminar el archivo
                const result = await deleteHook.mutateAsync({
                    resource: "academic-load-files",
                    id: itemToDelete.id
                });

                // Mostrar mensaje según si era activa o no
                if (wasActive) {
                    toast.success("Archivo eliminado exitosamente", {
                        description: "La versión anterior ha sido establecida como activa automáticamente.",
                        richColors: true,
                        duration: 5000,
                    });
                } else {
                    toast.success("Archivo eliminado exitosamente", { richColors: true });
                }

                closeDeleteModal();
            } catch (error) {
                toast.error("Error al eliminar el archivo", { richColors: true });
            }
        }
    };

    // Función para ver detalles
    const handleView = (item: AcademicLoadFile) => {
        navigate(`/academic-planning/academic-load-files/show/${item.id}`);
    };

    if (!canAccess) {
        return <Unauthorized />;
    }

    if (isError) {
        return (
            <div className="container mx-auto py-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center">
                            <p className="text-red-500">Error al cargar los archivos de carga académica</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <CanAccess
            resource="academic-load-files"
            action="list"
            fallback={<Unauthorized resourceName="carga académica" message="No tienes permisos para acceder a esta sección." />}
        >
            <div className="container mx-auto py-6 space-y-6 max-w-[98%]">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">Carga Académica</h1>
                        <p className="text-muted-foreground">
                            Gestiona los archivos de carga académica por facultad, escuela y período académico.
                        </p>
                    </div>
                </div>

                {/* Card del formulario de creación */}
                {canCreate && (
                    <Card className="mb-6">
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Selección de archivo */}
                                <Label htmlFor="file">Archivo Excel *</Label>
                                <div className="flex space-x-4">
                                    {!selectedFile ? (
                                        <div
                                            className={`flex-1 flex flex-col justify-center items-center border-2 border-dashed rounded-lg transition-colors
                                                ${isDragOver
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-300 hover:border-gray-400'
                                                }`}
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                setIsDragOver(true);
                                            }}
                                            onDragLeave={() => setIsDragOver(false)}
                                            onDrop={handleDrop}
                                        >
                                            <FileSpreadsheet className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                                            <p className="text-lg font-medium text-gray-600 mb-2">
                                                Arrastra tu archivo Excel aquí
                                            </p>
                                            <p className="text-sm text-gray-500 mb-4">
                                                o haz clic para seleccionar
                                            </p>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => document.getElementById('file-input')?.click()}
                                            >
                                                <Upload className="h-4 w-4 mr-2" />
                                                Seleccionar Archivo
                                            </Button>
                                            <input
                                                id="file-input"
                                                type="file"
                                                accept=".xlsx,.xls"
                                                onChange={handleFileChange}
                                                className="hidden"
                                            />
                                            <p className="text-xs text-gray-400 mt-2">
                                                Formatos soportados: .xlsx, .xls (máximo 10MB)
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col justify-center border rounded-lg p-4">
                                            <div className="flex gap-4 justify-center items-start">
                                                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                                                <div>
                                                    <p className="text-green-800 text-xs">
                                                        {selectedFile.name}
                                                    </p>
                                                    <p className="text-sm text-green-600">
                                                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                                    </p>
                                                </div>

                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="bg-green-600 text-white hover:bg-green-700 rounded-full w-6 h-6"
                                                    size="sm"
                                                    onClick={removeFile}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Selección de facultad, escuela y período */}
                                    <div className="flex-1 flex flex-col gap-4 ml-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="faculty">Facultad *</Label>
                                            <select
                                                id="faculty"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                value={formData.faculty_id}
                                                onChange={(e) => {
                                                    const facultyId = parseInt(e.target.value);
                                                    setFormData({
                                                        ...formData,
                                                        faculty_id: facultyId,
                                                        school_id: 0,
                                                    });
                                                }}
                                                required
                                            >
                                                <option value={0}>Seleccione una facultad</option>
                                                {faculties.map((faculty) => (
                                                    <option key={faculty.id} value={faculty.id}>
                                                        {faculty.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="school">Escuela *</Label>
                                            <select
                                                id="school"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                value={formData.school_id}
                                                onChange={(e) => {
                                                    setFormData({
                                                        ...formData,
                                                        school_id: parseInt(e.target.value),
                                                    });
                                                }}
                                                required
                                                disabled={!formData.faculty_id}
                                            >
                                                <option value={0}>Seleccione una escuela</option>
                                                {schools
                                                    .filter((school: any) => {
                                                        const scopeSchools = (myScope?.school_ids as number[] | undefined) || null;
                                                        const inScope = scopeSchools ? scopeSchools.includes(school.id) : true;
                                                        const sameFaculty = school.fk_faculty === formData.faculty_id;
                                                        return inScope && sameFaculty;
                                                    })
                                                    .map((school: any) => (
                                                    <option key={school.id} value={school.id}>
                                                        {school.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="term">Período Académico *</Label>
                                            <select
                                                id="term"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                value={formData.term_id}
                                                onChange={(e) => {
                                                    setFormData({
                                                        ...formData,
                                                        term_id: parseInt(e.target.value),
                                                    });
                                                }}
                                                required
                                            >
                                                <option value={0}>Seleccione un período</option>
                                                {terms.map((term) => (
                                                    <option key={term.id} value={term.id}>
                                                        Ciclo 0{term.term}-{term.year}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Checkbox de validación estricta */}
                                        <div className="space-y-2">
                                            <Label htmlFor="strict_validation" className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    id="strict_validation"
                                                    checked={formData.strict_validation}
                                                    onChange={(e) => {
                                                        setFormData({
                                                            ...formData,
                                                            strict_validation: e.target.checked,
                                                        });
                                                    }}
                                                    className="w-4 h-4"
                                                />
                                                <span>Validación estricta</span>
                                            </Label>
                                            <p className="text-xs text-gray-500">
                                                Si está activado, los errores de validación bloquearán la ingestión de datos.
                                                Si está desactivado, solo se reportarán warnings.
                                            </p>
                                        </div>

                                        {/* Botones */}
                                        <div className="flex justify-end gap-4 mt-4">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={resetForm}
                                            >
                                                Limpiar
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={isCreating}
                                            >
                                                {isCreating ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                                        Subiendo...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload className="h-4 w-4 mr-2" />
                                                        Subir Archivo
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}
                {/* Card de la tabla */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Archivos de Carga Académica</CardTitle>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Filtros */}
                        <TableFilters
                            searchValue={searchTerm}
                            onSearchChange={setSearchTerm}
                            searchPlaceholder="Buscar por archivo, facultad, escuela o usuario..."
                            visibleColumns={visibleColumns}
                            availableColumns={availableColumns}
                            onVisibleColumnsChange={(cols) => setShowIdColumn(cols.includes("id"))}
                        />

                        {/* Tabla */}
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {showIdColumn && <TableHead className={getTableColumnClass("id")}>ID</TableHead>}
                                        <TableHead className={getTableColumnClass("name")}>Archivo</TableHead>
                                        <TableHead className={getTableColumnClass("name")}>Versión</TableHead>
                                        <TableHead className={getTableColumnClass("name")}>Facultad</TableHead>
                                        <TableHead className={getTableColumnClass("name")}>Escuela</TableHead>
                                        <TableHead className={getTableColumnClass("name")}>Período</TableHead>
                                        <TableHead className={getTableColumnClass("name")}>Usuario</TableHead>
                                        <TableHead className={getTableColumnClass("date")}>Fecha</TableHead>
                                        <TableHead className={getTableColumnClass("status")}>Estado</TableHead>
                                        <TableHead className={getTableColumnClass("actions")}>Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={showIdColumn ? 10 : 9} className="text-center py-8">
                                                Cargando archivos...
                                            </TableCell>
                                        </TableRow>
                                    ) : paginatedItems.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={showIdColumn ? 10 : 9} className="text-center py-8">
                                                No se encontraron archivos de carga académica
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        (() => {
                                            // Si es DECANO, renderizar con grupos
                                            if (isDecano && groupedByTerm) {
                                                const result: React.ReactNode[] = [];
                                                const renderedGroupKeys = new Set<string>();
                                                const renderedItemIds = new Set<number>();
                                                let lastGroupKey: string | null = null;

                                                // Para cada item paginado, verificar a qué grupo pertenece
                                                paginatedItems.forEach((item, itemIndex) => {
                                                    // Evitar renderizar el mismo item dos veces
                                                    if (renderedItemIds.has(item.id)) {
                                                        return;
                                                    }

                                                    // Encontrar el grupo al que pertenece este item
                                                    let itemGroup: { termKey: string; group: typeof groupedByTerm[string] } | null = null;

                                                    for (const [termKey, group] of Object.entries(groupedByTerm)) {
                                                        if (group.items.some(gItem => gItem.id === item.id)) {
                                                            itemGroup = { termKey, group };
                                                            break;
                                                        }
                                                    }

                                                    if (itemGroup) {
                                                        // Renderizar header del grupo solo una vez, antes del primer item del grupo
                                                        // Verificar si es el primer item de un nuevo grupo (comparar con el grupo anterior)
                                                        if (lastGroupKey !== itemGroup.termKey) {
                                                            // Solo renderizar si no se ha renderizado antes
                                                            if (!renderedGroupKeys.has(itemGroup.termKey)) {
                                                                renderedGroupKeys.add(itemGroup.termKey);
                                                                const hasReports = groupHasReports(itemGroup.group.items);

                                                                result.push(
                                                                    <TableRow key={`group-${itemGroup.termKey}`} className="bg-gray-50 dark:bg-gray-800 border-t-1 border-gray-200 dark:border-gray-700">
                                                                        <TableCell
                                                                            colSpan={showIdColumn ? 10 : 9}
                                                                            className="font-bold text-lg py-1"
                                                                        >
                                                                            <div className="flex items-center justify-between">
                                                                                <span>
                                                                                    Ciclo {itemGroup.group.term_term && itemGroup.group.term_term > 0
                                                                                        ? String(itemGroup.group.term_term).padStart(2, '0')
                                                                                        : 'N/A'} - {itemGroup.group.term_year && itemGroup.group.term_year > 0
                                                                                        ? itemGroup.group.term_year
                                                                                        : 'N/A'}
                                                                                </span>
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    onClick={() => handleViewConsolidated(itemGroup.group.term_id, itemGroup.group.items)}
                                                                                    disabled={!hasReports}
                                                                                    className="ml-auto"
                                                                                >
                                                                                    <Receipt className="h-4 w-4 mr-2" />
                                                                                    Ver Consolidado de Planillas
                                                                                </Button>
                                                                            </div>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            }
                                                            lastGroupKey = itemGroup.termKey;
                                                        }

                                                        // Marcar item como renderizado
                                                        renderedItemIds.add(item.id);

                                                        // Renderizar el item solo una vez
                                                        const isActive = item.is_active;
                                                        const allGroupItems = itemGroup.group.items;
                                                        const itemIndexInGroup = allGroupItems.findIndex(i => i.id === item.id);
                                                        const nextGroupItem = itemIndexInGroup < allGroupItems.length - 1 ? allGroupItems[itemIndexInGroup + 1] : null;
                                                        const hasInactiveVersions = isActive && nextGroupItem && !nextGroupItem.is_active;

                                                        result.push(
                                                            <TableRow
                                                                key={item.id}
                                                                className={`
                                                                    ${!isActive ? 'pl-8 opacity-70 bg-gray-100 dark:bg-gray-800 dark:text-gray-300' : ''}
                                                                    ${hasInactiveVersions ? 'border-b-1 border-green-600' : ''}
                                                                `}
                                                            >
                                                                {renderTableRowCells(item, isActive)}
                                                            </TableRow>
                                                        );
                                                    }
                                                });

                                                return result;
                                            } else {
                                                // Renderizado normal (no DECANO)
                                                return paginatedItems.map((item, index) => {
                                                    const isActive = item.is_active;
                                                    const prevItem = index > 0 ? paginatedItems[index - 1] : null;
                                                    const nextItem = index < paginatedItems.length - 1 ? paginatedItems[index + 1] : null;
                                                    const isNewGroup = !prevItem ||
                                                        prevItem.faculty_id !== item.faculty_id ||
                                                        prevItem.school_id !== item.school_id ||
                                                        prevItem.term_id !== item.term_id;

                                                    // Verificar si la versión activa tiene versiones anteriores (inactivas)
                                                    const hasInactiveVersions = isActive && nextItem &&
                                                        nextItem.faculty_id === item.faculty_id &&
                                                        nextItem.school_id === item.school_id &&
                                                        nextItem.term_id === item.term_id &&
                                                        !nextItem.is_active;

                                                    return (
                                                        <TableRow
                                                            key={item.id}
                                                            className={`
                                                                ${!isActive ? 'pl-8 opacity-70 bg-gray-100 dark:bg-gray-800 dark:text-gray-300' : ''}
                                                                ${isNewGroup && !isActive ? 'border-t-1 border-gray-300' : ''}
                                                                ${hasInactiveVersions ? 'border-b-1 border-green-600' : ''}
                                                            `}
                                                        >
                                                            {renderTableRowCells(item, isActive)}
                                                        </TableRow>
                                                    );
                                                });
                                            }
                                        })()
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Paginación */}
                        <div className="mt-6">
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

                {/* Modal de confirmación de eliminación */}
                {itemToDelete && (
                    <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                    <XCircle className="h-5 w-5 text-red-600" />
                                    Eliminar archivo permanentemente
                                </AlertDialogTitle>
                                <AlertDialogDescription className="space-y-3">
                                    <p className="text-base text-gray-700">
                                        El archivo <strong>{itemToDelete.original_filename}</strong> será eliminado permanentemente.
                                    </p>
                                    {itemToDelete.is_active && (
                                        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                                            <p className="text-sm text-blue-800">
                                                <strong>ℹ️ Información:</strong> Este archivo es la versión activa.
                                                Al eliminarlo, la versión anterior será automáticamente establecida como la versión activa.
                                            </p>
                                        </div>
                                    )}
                                    <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                                        <p className="text-sm text-red-800">
                                            <strong>⚠️ Esta acción no se puede deshacer.</strong> El archivo será eliminado de forma permanente del sistema.
                                        </p>
                                    </div>
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={closeDeleteModal}>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleDelete}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                    Eliminar permanentemente
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}

                {/* Modal de confirmación de versión */}
                <AlertDialog open={isVersionConfirmOpen} onOpenChange={setIsVersionConfirmOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                                Nueva versión de documento
                            </AlertDialogTitle>
                            <AlertDialogDescription className="space-y-3">
                                <p className="text-base text-gray-700">
                                    {versionConfirmData
                                        ? <>Ya existe una versión activa de la carga académica para la <span className="font-bold">{versionConfirmData.facultyName}</span> y la <span className="font-bold">{versionConfirmData.schoolName}</span> en el período académico <span className="font-bold">Ciclo 0{versionConfirmData.termName}</span>.</>
                                        : "Ya existe una versión activa para esta combinación de Facultad, Escuela y Período académico."
                                    }
                                </p>
                                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                                    <p className="text-sm text-blue-800">
                                        <strong>ℹ️ Información:</strong> Al subir este archivo, se creará una nueva versión del documento.
                                        La versión anterior se mantendrá en el historial para referencia.
                                    </p>
                                </div>
                                <p className="text-sm text-gray-600">
                                    ¿Deseas continuar con la subida del nuevo archivo?
                                </p>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={handleVersionConfirmCancel}>
                                Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={performUpload}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                Sí, subir nueva versión
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Modal de Errores */}
                <Dialog open={isErrorModalOpen} onOpenChange={setIsErrorModalOpen}>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <XCircle className="h-5 w-5 text-red-600" />
                                Detalles de Errores de Validación
                            </DialogTitle>
                        </DialogHeader>

                        {errorDetails && (
                            <div className="space-y-4">
                                {/* Resumen */}
                                {errorDetails.summary && (
                                    <div className="pt-3 flex gap-4 justify-between pb-3">
                                        <h3 className="font-semibold mb-2 max-w-[80px]">Resumen de errores</h3>
                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                            <div className="border-r border-gray-200 pr-4">
                                                <p className="text-4xl font-bold">{errorDetails.summary.total_rows}</p>
                                                <span className="text-gray-600">Total</span>

                                            </div>
                                            <div className="border-r border-gray-200 pr-4">
                                                <p className="text-4xl text-green-600 font-bold">{errorDetails.summary.inserted}</p>
                                                <span className="text-gray-600">Insertadas</span>

                                            </div>
                                            <div className="border-r border-gray-200 pr-4">
                                                <p className="text-4xl text-red-600 font-bold">{errorDetails.summary.failed}</p>
                                                <span className="text-gray-600">Fallidas</span>

                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Errores por Tipo */}
                                {errorDetails.errors_by_type && (
                                    <div>
                                        <h3 className="font-semibold mb-2">Errores por Tipo</h3>
                                        <div className="grid grid-cols-2 gap-2">
                                            {Object.entries(errorDetails.errors_by_type).map(([type, count]) => {
                                                const typeTranslations: Record<string, string> = {
                                                    missing_coordination: "Coordinación Faltante",
                                                    missing_subject: "Asignatura Faltante",
                                                    missing_professor: "Profesor Faltante",
                                                    invalid_schedule: "Horario Inválido",
                                                };
                                                const displayType = typeTranslations[type] || type.replace(/_/g, ' ');
                                                return (
                                                    <div key={type} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                                        <span className="text-sm">{displayType}</span>
                                                        <Badge variant="destructive">{count as number}</Badge>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Ejemplos de Errores */}
                                {errorDetails.sample_errors && errorDetails.sample_errors.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold mb-2">Errores encontrados</h3>
                                        <div className="space-y-2">
                                            {errorDetails.sample_errors.map((error: any, idx: number) => {
                                                const fieldTranslations: Record<string, string> = {
                                                    "COD_CATEDRA": "Código de Cátedra",
                                                    "COD_ASIG / ASIGNATURA": "Código / Asignatura",
                                                    "CODIGO / DOCENTE": "Código / Docente",
                                                    "HORARIO / DIAS": "Horario / Días",
                                                    "general": "General",
                                                };
                                                // Normaliza valores de campo que llegan con datos incrustados
                                                // Ej.: "COD_ASIG: INF1-Ikl, ASIGNATURA: INFORMÁTICA" → "COD_ASIG / ASIGNATURA"
                                                const normalizeFieldKey = (field: string | undefined) => {
                                                    if (!field) return "general";
                                                    const upper = field.toUpperCase();
                                                    if (upper.startsWith("COD_ASIG")) return "COD_ASIG / ASIGNATURA";
                                                    if (upper.startsWith("CODIGO") || upper.includes("DOCENTE")) return "CODIGO / DOCENTE";
                                                    if (upper.startsWith("COD_CATEDRA") || upper.startsWith("COORD")) return "COD_CATEDRA";
                                                    if (upper.includes("HORARIO") || upper.includes("DIAS")) return "HORARIO / DIAS";
                                                    return field;
                                                };
                                                const normalizedField = normalizeFieldKey(error.field);
                                                const displayField = fieldTranslations[normalizedField] || normalizedField;
                                                return (
                                                    <div key={idx} className="border border-red-200 rounded-lg p-3">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="font-medium text-xs uppercase">Fila {error.row}</span>
                                                            <Badge variant="outline" className="text-xs">{displayField}</Badge>
                                                        </div>
                                                        <p className="text-sm text-gray-600 mb-1">
                                                            <strong>Valor:</strong> {error.value}
                                                        </p>
                                                        <p className="text-sm text-red-600">
                                                            <strong>Razón:</strong> {error.reason}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Modal de Cambios (normalización) */}
                <Dialog open={isChangesModalOpen} onOpenChange={setIsChangesModalOpen}>
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                Cambios aplicados (normalización)
                            </DialogTitle>
                        </DialogHeader>

                        {changesDetails && Array.isArray(changesDetails) && changesDetails.length > 0 ? (
                            <div className="space-y-3">
                                {changesDetails.map((chg: any, idx: number) => (
                                    <div key={idx} className="border rounded p-3 bg-gray-50">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs uppercase tracking-wide text-gray-500">{chg.field}</span>
                                            <Badge variant="outline" className="text-[10px]">{chg.reason || "normalized"}</Badge>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <span className="text-gray-600">De:</span>
                                                <p className="font-mono break-all">{chg.from ?? ""}</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">A:</span>
                                                <p className="font-mono break-all text-green-700">{chg.to ?? ""}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-600">No se registraron cambios de normalización.</p>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </CanAccess>
    );
};

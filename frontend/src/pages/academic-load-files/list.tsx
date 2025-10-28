import React, { useState, useEffect, useRef } from "react";
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
import { Plus, Trash2, Eye, X, Upload, FileSpreadsheet, Save, RefreshCw, XCircle, CheckCircle, Star } from "lucide-react";
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
import { useList } from "@refinedev/core";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const AcademicLoadFilesList: React.FC = () => {
    const {
        itemsList,
        total,
        isLoading,
        isError,
        isCreating,
        canAccess,
        canDelete,
        createItem,
        invalidate,
        deleteHook,
        verifyActiveVersion,
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
        // Ordenar por contexto (faculty, school, term) y luego por versión descendente
        .sort((a, b) => {
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
        });

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
        });
        setSelectedFile(null);
    };

    // Función para obtener el estado visual del procesamiento
    const getStatusDisplay = (status: string, notes?: string | null) => {
        const statusDisplay = (() => {
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
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {status}
                        </span>
                    );
            }
        })();

        return statusDisplay;
    };

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
        data: filteredItems,
        initialPageSize: 10,
    });

    // Datos paginados
    const paginatedItems = paginatedData;

    // Estados para modales
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<AcademicLoadFile | null>(null);
    const [isVersionConfirmOpen, setIsVersionConfirmOpen] = useState(false);
    const [pendingUpload, setPendingUpload] = useState<FormData | null>(null);
    const [versionConfirmData, setVersionConfirmData] = useState<{facultyName: string; schoolName: string; termName: string} | null>(null);

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
        toast.info("Funcionalidad de vista en desarrollo", { richColors: true });
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
                                            {schools.filter(school =>
                                                school.fk_faculty === formData.faculty_id
                                            ).map((school) => (
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
                                        paginatedItems.map((item, index) => {
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
                                                        ${!isActive ? 'pl-8 opacity-50 bg-gray-100' : ''}
                                                        ${isNewGroup && !isActive ? 'border-t-1 border-gray-300' : ''}
                                                        ${hasInactiveVersions ? 'border-b-1 border-green-600' : ''}
                                                    `}
                                                >
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
                                                    {item.ingestion_status === "failed" && item.notes ? (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                {getStatusDisplay(item.ingestion_status, item.notes)}
                                                            </TooltipTrigger>
                                                            <TooltipContent
                                                                className="max-w-md bg-red-50 border border-red-200 text-red-900 p-5"
                                                                side="top"
                                                            >
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <span className="text-red-500 text-base">⚠️</span>
                                                                        <p className="font-semibold text-sm">Error de validación</p>
                                                                    </div>
                                                                    {/* Extraer las columnas faltantes del mensaje */}
                                                                    {(() => {
                                                                        // Extraer solo las columnas faltantes, ignorando "Columnas esperadas"
                                                                        const match = item.notes?.match(/Campos faltantes:\s*(.+?)(?:\s*\.\s*Columnas esperadas:|\.?\s*$)/);
                                                                        const missingColumns = match ? match[1].split(',').map(c => c.trim()) : [];

                                                                        if (missingColumns.length > 0) {
                                                                            return (
                                                                                <div className="mt-2">
                                                                                    <p className="text-xs font-medium mb-1">Hacen falta las siguientes columnas:</p>
                                                                                    <ul className="grid grid-cols-2 gap-x-4 gap-y-1 ml-4 mt-2">
                                                                                        {missingColumns.map((col, idx) => (
                                                                                            <li key={idx} className="text-xs list-disc">{col}</li>
                                                                                        ))}
                                                                                    </ul>
                                                                                </div>
                                                                            );
                                                                        }
                                                                        // Si no se encontró el patrón, mostrar el mensaje sin "Columnas esperadas"
                                                                        const cleanMessage = item.notes?.replace(/\s*Columnas esperadas:.+$/i, '').trim();
                                                                        return <p className="text-xs leading-relaxed whitespace-pre-wrap mt-1">{cleanMessage}</p>;
                                                                    })()}
                                                                </div>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    ) : (
                                                        getStatusDisplay(item.ingestion_status, item.notes)
                                                    )}
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

                                                        {canDelete && (
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
                                            </TableRow>
                                            );
                                        })
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
            </div>
        </CanAccess>
    );
};

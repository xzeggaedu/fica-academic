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
import { Plus, Trash2, Eye, X, Upload, FileSpreadsheet, Save, RefreshCw } from "lucide-react";
import { TableFilters } from "@/components/ui/data/table-filters";
import { TablePagination } from "@/components/ui/data/table-pagination";
import type { AcademicLoadFile, Faculty, School, Term } from "@/types/api";
import { getTableColumnClass } from "@/components/refine-ui/theme/theme-table";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Unauthorized } from "../unauthorized";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

    // Filtrar datos
    const filteredItems = itemsList.filter((item) => {
        const matchesSearch =
            item.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.faculty?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.school?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.user_name.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesSearch;
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

        try {
            // Crear FormData para enviar archivo
            const submitData = new FormData();
            submitData.append('file', selectedFile);
            submitData.append('faculty_id', formData.faculty_id.toString());
            submitData.append('school_id', formData.school_id.toString());
            submitData.append('term_id', formData.term_id.toString());

            // Llamar al hook de creación
            await createItem(submitData);

            // Resetear formulario
            resetForm();

            // Refrescar la lista
            invalidate({ invalidates: ["list"], resource: "academic-load-files" });

        } catch (error) {
            console.error("Error al subir archivo:", error);
        }
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
    const getStatusDisplay = (status: string) => {
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
                        ✓ Completado
                    </span>
                );
            case "failed":
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        ✗ Error
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {status}
                    </span>
                );
        }
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
    const handleDelete = () => {
        if (itemToDelete) {
            toast.success("Archivo eliminado exitosamente", { richColors: true });
            closeDeleteModal();
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
                                                    {term.term_name} {term.year}
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
                                <CardDescription>
                                    Gestiona los archivos subidos por facultad, escuela y período
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Filtros */}
                        <TableFilters
                            searchValue={searchTerm}
                            onSearchChange={setSearchTerm}
                            searchPlaceholder="Buscar por archivo, facultad, escuela o usuario..."
                            visibleColumns={[]}
                            availableColumns={[]}
                        />

                        {/* Tabla */}
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className={getTableColumnClass("id")}>ID</TableHead>
                                        <TableHead className={getTableColumnClass("name")}>Archivo</TableHead>
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
                                            <TableCell colSpan={9} className="text-center py-8">
                                                Cargando archivos...
                                            </TableCell>
                                        </TableRow>
                                    ) : paginatedItems.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center py-8">
                                                No se encontraron archivos de carga académica
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedItems.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className={getTableColumnClass("id")}>
                                                    #{item.id}
                                                </TableCell>
                                                <TableCell className={getTableColumnClass("name")}>
                                                    <div className="font-medium">{item.original_filename}</div>
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
                                                    {item.term ? `${item.term.term_name} ${item.term.year}` : "N/A"}
                                                </TableCell>
                                                <TableCell className={getTableColumnClass("name")}>
                                                    {item.user_name || "N/A"}
                                                </TableCell>
                                                <TableCell className={getTableColumnClass("date")}>
                                                    {format(new Date(item.upload_date), "dd/MM/yyyy HH:mm", { locale: es })}
                                                </TableCell>
                                                <TableCell className={getTableColumnClass("status")}>
                                                    {getStatusDisplay(item.ingestion_status)}
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
                                                                    >
                                                                        <Eye className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Ver detalles</p>
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
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Eliminar archivo</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
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
                <DeleteConfirmDialog
                    isOpen={isDeleteModalOpen}
                    onClose={closeDeleteModal}
                    onConfirm={handleDelete}
                    entityType="archivo"
                    entityName={itemToDelete?.original_filename || ""}
                    gender="m"
                />
            </div>
        </CanAccess>
    );
};

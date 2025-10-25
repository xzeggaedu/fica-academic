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
import { Textarea } from "@/components/ui/forms/textarea";
import { toast } from "sonner";
import { Plus, Trash2, Download, Eye, X, Upload, FileSpreadsheet, Save, RefreshCw } from "lucide-react";
import { getAuthHeaders } from "@/providers/dataProvider";
import { TableFilters } from "@/components/ui/data/table-filters";
import { TablePagination } from "@/components/ui/data/table-pagination";
import type { TemplateGeneration, TemplateGenerationCreate, TemplateGenerationUpdate, Faculty, School } from "@/types/api";
import { getTableColumnClass } from "@/components/refine-ui/theme/theme-table";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Unauthorized } from "../unauthorized";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTablePagination } from "@/hooks/useTablePagination";
import { useTemplateGenerationCrud } from "@/hooks/useTemplateGenerationCrud";
import { useList } from "@refinedev/core";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const TemplateGenerationList: React.FC = () => {
    const {
        itemsList,
        total,
        isLoading,
        isError,
        isCreateModalOpen,
        isEditModalOpen,
        editingItem,
        isCreating,
        isUpdating,
        canAccess,
        canCreate,
        canEdit,
        canDelete,
        createItem,
        updateItem,
        invalidate,
        openCreateModal,
        closeCreateModal,
        openEditModal,
        closeEditModal,
    } = useTemplateGenerationCrud();

    // Estados para filtros y paginación
    const [searchTerm, setSearchTerm] = useState("");
    const [facultyFilter, setFacultyFilter] = useState<string>("all");
    const [schoolFilter, setSchoolFilter] = useState<string>("all");

    // Estados del formulario de creación
    const [formData, setFormData] = useState({
        faculty_id: 0,
        school_id: 0,
        notes: "",
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    // Cargar facultades y escuelas
    const { result: facultiesResult } = useList<Faculty>({
        resource: "faculties",
        pagination: { currentPage: 1, pageSize: 1000 },
    });

    const { result: schoolsResult } = useList<School>({
        resource: "schools",
        pagination: { currentPage: 1, pageSize: 1000 },
    });

    const faculties = facultiesResult?.data || [];
    const schools = schoolsResult?.data || [];

    // Filtrar escuelas por facultad seleccionada
    const filteredSchools = schools.filter(school =>
        school.fk_faculty === parseInt(facultyFilter)
    );

    // Filtrar datos
    const filteredItems = itemsList.filter((item) => {
        const matchesSearch =
            item.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.faculty?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.school?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.user?.name.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFaculty = facultyFilter === "all" || item.faculty_id.toString() === facultyFilter;
        const matchesSchool = schoolFilter === "all" || item.school_id.toString() === schoolFilter;

        return matchesSearch && matchesFaculty && matchesSchool;
    });

    // Funciones del formulario de creación
    const handleFileSelect = (file: File) => {
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
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

        if (!formData.faculty_id || !formData.school_id) {
            toast.error("Error", {
                description: "Por favor seleccione una facultad y escuela",
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
            if (formData.notes) {
                submitData.append('notes', formData.notes);
            }

            // Llamar al hook de creación
            await createItem(submitData);

            toast.success("Plantilla generada exitosamente");

            // Resetear formulario
            resetForm();

            // Refrescar la lista
            invalidate({ invalidates: ["list"], resource: "template-generation" });

        } catch (error) {
            console.error("Error al generar plantilla:", error);
            toast.error("Error al generar la plantilla");
        }
    };

    const resetForm = () => {
        setFormData({
            faculty_id: 0,
            school_id: 0,
            notes: "",
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
    const [itemToDelete, setItemToDelete] = useState<TemplateGeneration | null>(null);

    // Función para abrir modal de eliminación
    const openDeleteModal = (item: TemplateGeneration) => {
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
            // TODO: Implementar eliminación
            toast.success("Plantilla eliminada exitosamente");
            closeDeleteModal();
        }
    };

    // Función para descargar archivo
    const handleDownload = async (item: TemplateGeneration) => {
        try {
            const response = await fetch(`/api/v1/template-generation/${item.id}/download`, {
                method: 'GET',
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                throw new Error('Error al descargar el archivo');
            }

            // Obtener el nombre del archivo del header Content-Disposition
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `template_${item.id}.xlsx`;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }

            // Crear blob y descargar
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success("Archivo descargado exitosamente");
        } catch (error) {
            console.error('Error downloading file:', error);
            toast.error("Error al descargar el archivo");
        }
    };

    // Función para ver detalles
    const handleView = (item: TemplateGeneration) => {
        // TODO: Implementar vista de detalles
        toast.info("Funcionalidad de vista en desarrollo");
    };

    // Función para obtener el color del badge según el estado
    const getStatusBadgeColor = (status: string) => {
        switch (status) {
            case "completed":
                return "default";
            case "processing":
                return "secondary";
            case "failed":
                return "destructive";
            default:
                return "outline";
        }
    };

    // Función para obtener el texto del estado
    const getStatusText = (status: string) => {
        switch (status) {
            case "completed":
                return "Completado";
            case "processing":
                return "Procesando";
            case "failed":
                return "Fallido";
            default:
                return status;
        }
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
                            <p className="text-red-500">Error al cargar las plantillas generadas</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (

        <CanAccess
            resource="terms"
            action="list"
            fallback={<Unauthorized resourceName="ciclos académicos" message="Solo los administradores pueden gestionar ciclos académicos." />}
        >
            <div className="container mx-auto py-6 space-y-6 max-w-[98%]">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">Generar Plantillas</h1>
                        <p className="text-muted-foreground">
                            Gestiona las plantillas de Excel generadas por facultad y escuela para el proceso de carga académica.
                        </p>
                    </div>
                </div>

                {/* Card del formulario de creación */}
                <Card className="mb-6">
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Selección de archivo */}
                            <Label htmlFor="file">Archivo Excel *</Label>
                            <div className="flex space-y-4">


                                {!selectedFile ? (
                                    <div
                                        className={`flex-1 flex flex-col justify-center items-center border-2 border-dashed rounded-lg transition-colors ${isDragOver
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
                                {/* Selección de facultad y escuela */}
                                <div className="flex-2 flex flex-col gap-6 ml-8">
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
                                                    school_id: 0, // Reset school when faculty changes
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

                                    {/* Notas */}
                                    <div className="space-y-2">
                                        <Label htmlFor="notes">Notas (opcional)</Label>
                                        <Textarea
                                            id="notes"
                                            value={formData.notes || ""}
                                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                            placeholder="Agregue cualquier nota adicional sobre la plantilla..."
                                            rows={3}
                                        />
                                    </div>

                                    {/* Botones */}
                                    <div className="flex justify-end gap-4">
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
                                                    Generando...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="h-4 w-4 mr-2" />
                                                    Generar Plantilla
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
                                <CardTitle>Plantillas Generadas</CardTitle>
                                <CardDescription>
                                    Gestiona las plantillas de Excel generadas por facultad y escuela
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Filtros */}
                        <div className="mb-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="search">Buscar</Label>
                                    <Input
                                        id="search"
                                        placeholder="Buscar por archivo, facultad, escuela o usuario..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="faculty">Facultad</Label>
                                    <select
                                        id="faculty"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        value={facultyFilter}
                                        onChange={(e) => {
                                            const facultyId = e.target.value;
                                            setFacultyFilter(facultyId);
                                            setSchoolFilter("all"); // Reset school when faculty changes
                                        }}
                                    >
                                        <option value="all">Todas las facultades</option>
                                        {faculties.map((faculty) => (
                                            <option key={faculty.id} value={faculty.id}>
                                                {faculty.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label htmlFor="school">Escuela</Label>
                                    <select
                                        id="school"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        value={schoolFilter}
                                        onChange={(e) => setSchoolFilter(e.target.value)}
                                        disabled={facultyFilter === "all"}
                                    >
                                        <option value="all">Todas las escuelas</option>
                                        {filteredSchools.map((school) => (
                                            <option key={school.id} value={school.id}>
                                                {school.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Tabla */}
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className={getTableColumnClass("id")}>ID</TableHead>
                                        <TableHead className={getTableColumnClass("name")}>Archivo</TableHead>
                                        <TableHead className={getTableColumnClass("name")}>Facultad</TableHead>
                                        <TableHead className={getTableColumnClass("name")}>Escuela</TableHead>
                                        <TableHead className={getTableColumnClass("name")}>Usuario</TableHead>
                                        <TableHead className={getTableColumnClass("date")}>Fecha</TableHead>
                                        <TableHead className={getTableColumnClass("status")}>Estado</TableHead>
                                        <TableHead className={getTableColumnClass("actions")}>Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-8">
                                                Cargando plantillas...
                                            </TableCell>
                                        </TableRow>
                                    ) : paginatedItems.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-8">
                                                No se encontraron plantillas generadas
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
                                                    {item.faculty?.name || "N/A"}
                                                </TableCell>
                                                <TableCell className={getTableColumnClass("name")}>
                                                    {item.school?.name || "N/A"}
                                                </TableCell>
                                                <TableCell className={getTableColumnClass("name")}>
                                                    {item.user?.name || "N/A"}
                                                </TableCell>
                                                <TableCell className={getTableColumnClass("date")}>
                                                    {format(new Date(item.upload_date), "dd/MM/yyyy HH:mm", { locale: es })}
                                                </TableCell>
                                                <TableCell className={getTableColumnClass("status")}>
                                                    {getStatusDisplay(item.generation_status)}
                                                </TableCell>
                                                <TableCell className={getTableColumnClass("actions")}>
                                                    <div className="flex items-center gap-2">
                                                        {item.generation_status === "completed" && (
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => handleDownload(item)}
                                                                        >
                                                                            <Download className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Descargar archivo generado</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        )}

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
                                                                        <p>Eliminar plantilla</p>
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
                    entityType="plantilla"
                    entityName={itemToDelete?.original_filename || ""}
                    gender="f"
                />
            </div>
        </CanAccess>
    );
};

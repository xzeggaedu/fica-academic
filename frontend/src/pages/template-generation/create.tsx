import React, { useState, useEffect } from "react";
import { CanAccess } from "@refinedev/core";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/forms/input";
import { Label } from "@/components/ui/forms/label";
import { Textarea } from "@/components/ui/forms/textarea";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Save, X } from "lucide-react";
import { Unauthorized } from "../unauthorized";
import { useTemplateGenerationCrud } from "@/hooks/useTemplateGenerationCrud";
import { useList } from "@refinedev/core";
import type { Faculty, School } from "@/types/api";

export const TemplateGenerationCreate: React.FC = () => {
  const {
    canCreate,
    createItem,
    isCreating,
  } = useTemplateGenerationCrud();

  // Estados del formulario
  const [formData, setFormData] = useState({
    faculty_id: 0,
    school_id: 0,
    notes: "",
  });

  // Estados para el archivo
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
    school.fk_faculty === formData.faculty_id
  );

  // Función para manejar la selección de archivo
  const handleFileSelect = (file: File) => {
    // Validar que sea un archivo Excel
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

    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Error", {
        description: "El archivo no puede ser mayor a 10MB",
        richColors: true,
      });
      return;
    }

    setSelectedFile(file);
  };

  // Función para manejar el drop de archivos
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Función para manejar el cambio de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Función para remover archivo
  const removeFile = () => {
    setSelectedFile(null);
  };

  // Función para manejar el envío del formulario (deshabilitada por ahora)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.info("Funcionalidad de envío deshabilitada temporalmente");
  };

  if (!canCreate) {
    return <Unauthorized />;
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Generar Plantilla</CardTitle>
          <CardDescription>
            Sube un archivo Excel y genera una plantilla personalizada para la facultad y escuela seleccionada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Selección de archivo */}
            <div className="space-y-4">
              <Label htmlFor="file">Archivo Excel *</Label>

              {!selectedFile ? (
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragOver
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
                <div className="border rounded-lg p-4 bg-green-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileSpreadsheet className="h-8 w-8 text-green-600 mr-3" />
                      <div>
                        <p className="font-medium text-green-800">{selectedFile.name}</p>
                        <p className="text-sm text-green-600">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removeFile}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Selección de facultad y escuela */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  {filteredSchools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>
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
                onClick={() => {
                  setFormData({
                    faculty_id: 0,
                    school_id: 0,
                    notes: "",
                  });
                  setSelectedFile(null);
                }}
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useShow, useCan, CanAccess } from "@refinedev/core";
import { useAcademicLoadClasses } from "@/hooks/useAcademicLoadClasses";
import type { AcademicLoadFile } from "@/types/api";
import { getAuthHeaders } from "@/providers/dataProvider";
import { toast } from "sonner";
import {
  AcademicLoadFileBreadcrumbs,
  AcademicLoadFileHeader,
  AcademicLoadFileInfoCard,
  AcademicLoadFileStats,
  AcademicLoadFileTable,
} from "./components";
import { getValidationBadge, getFileStatusBadge } from "./utils/badges";
import { Unauthorized } from "../unauthorized";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const AcademicLoadFileShow: React.FC = () => {
  const params = useParams<{ id: string }>();
  const [searchTerm, setSearchTerm] = useState("");
  const [validationFilter, setValidationFilter] = useState<string>("all");

  // Obtener datos del archivo usando useShow
  const { query } = useShow<AcademicLoadFile>({
    resource: "academic-load-files",
    id: params.id,
  });
  const { data, isLoading } = query;
  const file = data?.data;

  // Hook para obtener clases y estadísticas
  const { classes, statistics, isLoading: isLoadingClasses } = useAcademicLoadClasses({
    fileId: file?.id,
    enabled: !!file?.id,
  });

  // Permisos
  const { data: canAccess } = useCan({ resource: "academic-load-files", action: "show" });

  // Filtrar clases
  const filteredClasses = classes.filter((cls) => {
    const matchesSearch =
      cls.subject_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${cls.professor_academic_title || ""} ${cls.professor_name}`.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesValidation =
      validationFilter === "all" ||
      (validationFilter === "valid" && cls.validation_status === "valid") ||
      (validationFilter === "warning" && cls.validation_status === "warning") ||
      (validationFilter === "error" && cls.validation_status === "error");

    return matchesSearch && matchesValidation;
  });

  // Función para descargar archivo
  const handleDownload = async () => {
    if (!file) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/academic-load-files/${file.id}/download`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Error al descargar el archivo');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Archivo descargado exitosamente", { richColors: true });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error("Error al descargar el archivo", { richColors: true });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!canAccess?.can) {
    return <Unauthorized />;
  }

  if (!file) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">No se encontró el archivo</div>
      </div>
    );
  }

  return (
    <CanAccess
      resource="academic-load-files"
      action="show"
      fallback={<Unauthorized />}
    >
    <div className="container mx-auto py-6 space-y-6 max-w-[98%]">
      <AcademicLoadFileBreadcrumbs />

      <AcademicLoadFileHeader
        file={file}
        getFileStatusBadge={getFileStatusBadge}
      />

      <AcademicLoadFileInfoCard
        file={file}
        onDownload={handleDownload}
      />

      {statistics && <AcademicLoadFileStats statistics={statistics} />}

      <AcademicLoadFileTable
        classes={filteredClasses}
        isLoading={isLoadingClasses}
        getValidationBadge={getValidationBadge}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        validationFilter={validationFilter}
        onValidationFilterChange={setValidationFilter}
      />
    </div>
    </CanAccess>
  );
};

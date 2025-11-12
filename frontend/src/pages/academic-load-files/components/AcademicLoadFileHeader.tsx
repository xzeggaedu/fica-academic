import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { AcademicLoadFile } from "@/types/api";

interface AcademicLoadFileHeaderProps {
  file: AcademicLoadFile;
  getFileStatusBadge: (status: string) => React.ReactNode;
}

export const AcademicLoadFileHeader: React.FC<AcademicLoadFileHeaderProps> = ({
  file,
  getFileStatusBadge,
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Detalle de Carga Académica</h1>
          <p className="text-muted-foreground mt-1">
            Archivo: {file.original_filename}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {getFileStatusBadge(file.ingestion_status)}
      </div>
    </div>
  );
};

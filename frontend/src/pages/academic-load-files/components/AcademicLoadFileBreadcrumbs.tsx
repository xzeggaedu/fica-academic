import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/layout/breadcrumb";

export const AcademicLoadFileBreadcrumbs: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            onClick={() => navigate("/academic-planning/academic-load-files")}
            className="cursor-pointer text-xs"
          >
            Planificación Académica
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink
            onClick={() => navigate("/academic-planning/academic-load-files")}
            className="cursor-pointer text-xs"
          >
            Carga Académica
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage className="text-xs">
            Detalle del Archivo
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
};

import React from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/layout/breadcrumb";
import { Home } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

interface BillingReportBreadcrumbsProps {
  academicLoadFileId?: number;
}

export const BillingReportBreadcrumbs: React.FC<BillingReportBreadcrumbsProps> = ({ academicLoadFileId }) => {
  const navigate = useNavigate();
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink>
            <Link to="/academic-planning/academic-load-files"
              className="cursor-pointer text-xs">
              Planificación Académica
            </Link>
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
        {academicLoadFileId && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={() => navigate(`/academic-planning/academic-load-files/show/${academicLoadFileId}`)}
                className="cursor-pointer text-xs"
              >
                Detalle de Carga
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage className="text-xs">Planilla de Facturación</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
};

import React from "react";
import { useParams } from "react-router-dom";
import { useShow, CanAccess } from "@refinedev/core";
import type { BillingReport } from "@/types/api";
import { Unauthorized } from "../unauthorized";
import { NotFound } from "../not-found";
import {
  BillingReportBreadcrumbs,
  BillingReportHeader,
  UnifiedReportTable,
} from "./components";
import { Card, CardContent } from "@/components/ui/card";

// Función helper para extraer el status code del error
const getErrorStatus = (error: any): number | null => {
  if (!error) return null;

  // Intentar diferentes posibles estructuras del error
  if (typeof error.status === 'number') return error.status;
  if (error.response?.status) return error.response.status;
  if (error.cause?.status) return error.cause.status;
  if ((error as any)?.cause?.status) return (error as any).cause.status;

  return null;
};

export const BillingReportShow: React.FC = () => {
  const params = useParams<{ id: string }>();

  // Obtener datos del reporte usando useShow
  const { query } = useShow<BillingReport>({
    resource: "billing-reports",
    id: params.id,
  });
  const { data, isLoading, isError, error } = query;
  const report = data?.data;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Verificar si hay un error y mostrar el componente apropiado
  if (isError && error) {
    const errorStatus = getErrorStatus(error);
    if (errorStatus === 403) {
      return <Unauthorized resourceName="esta planilla" message="No tienes permisos para ver esta planilla." />;
    }
    if (errorStatus === 404) {
      return <NotFound resourceName="el reporte" message="El reporte que buscas no existe o ha sido eliminado." />;
    }
  }

  // Si no hay reporte (sin error explícito), también mostrar NotFound
  if (!report) {
    return <NotFound resourceName="el reporte" message="El reporte que buscas no existe o ha sido eliminado." />;
  }

  return (
    <CanAccess
      resource="billing-reports"
      action="show"
      fallback={<Unauthorized />}
    >
      <div className="container mx-auto py-6 space-y-6 max-w-[98%]">
        <BillingReportBreadcrumbs academicLoadFileId={report.academic_load_file_id} />

        <BillingReportHeader report={report} />

        <Card>
          <CardContent>
            <UnifiedReportTable
              summaries={report.payment_summaries}
              monthlyItems={report.monthly_items}
              rateSnapshots={report.rate_snapshots}
            />
          </CardContent>
        </Card>
      </div>
    </CanAccess>
  );
};

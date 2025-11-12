import React from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { CanAccess } from "@refinedev/core";
import type { BillingReport } from "@/types/api";
import { Unauthorized } from "../unauthorized";
import { NotFound } from "../not-found";
import {
  BillingReportBreadcrumbs,
  BillingReportHeader,
  UnifiedReportTable,
} from "./components";
import { Card, CardContent } from "@/components/ui/card";
import { useConsolidatedBillingReport } from "@/hooks/useConsolidatedBillingReport";

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

export const ConsolidatedBillingReportShow: React.FC = () => {
  const params = useParams<{ termId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const termId = params.termId ? parseInt(params.termId, 10) : 0;
  const fileIdsStr = searchParams.get('fileIds') || '';

  // Debug: Verificar que el componente se monta correctamente
  React.useEffect(() => {
    console.log("🔵 ConsolidatedBillingReportShow mounted with:", {
      params,
      termId,
      fileIdsStr,
      searchParams: Object.fromEntries(searchParams.entries())
    });
  }, [params, termId, fileIdsStr, searchParams]);

  // Parsear fileIds
  const academicLoadFileIds = fileIdsStr
    .split(',')
    .map(id => parseInt(id.trim(), 10))
    .filter(id => !isNaN(id) && id > 0);

  // Validar parámetros básicos
  const hasValidParams = termId > 0 && academicLoadFileIds.length > 0;

  // Obtener datos consolidados (solo si los parámetros son válidos)
  const { data: consolidatedReport, isLoading, isError, error } = useConsolidatedBillingReport({
    termId,
    academicLoadFileIds,
  });

  // Debug: Log para verificar datos
  React.useEffect(() => {
    console.log("🔍 Consolidated report state:", {
      isLoading,
      isError,
      hasData: !!consolidatedReport,
      hasId: consolidatedReport?.id,
      termId,
      academicLoadFileIds,
      hasValidParams
    });
    if (consolidatedReport) {
      console.log("✅ Consolidated report data:", consolidatedReport);
    }
    if (isError && error) {
      console.error("❌ Error loading consolidated report:", error);
    }
  }, [consolidatedReport, isError, error, isLoading, termId, academicLoadFileIds, hasValidParams]);

  // Si los parámetros no son válidos, mostrar error
  if (!hasValidParams) {
    return <NotFound resourceName="el consolidado" message="Parámetros inválidos para generar el consolidado." />;
  }

  // Mostrar loading mientras se cargan los datos
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <div className="ml-4 text-gray-600">Cargando consolidado...</div>
      </div>
    );
  }

  // Verificar errores después de que termine la carga
  if (isError && error) {
    const errorStatus = getErrorStatus(error);
    if (errorStatus === 403) {
      return <Unauthorized resourceName="este consolidado" message="No tienes permisos para ver este consolidado." />;
    }
    if (errorStatus === 404) {
      return <NotFound resourceName="el consolidado" message="No se pudo generar el consolidado o no se encontraron planillas." />;
    }
    // Si hay error pero no es 403/404, mostrar NotFound genérico
    return <NotFound resourceName="el consolidado" message="No se pudo generar el consolidado." />;
  }

  // Si no hay datos después de que termine la carga (sin error), mostrar NotFound
  // Verificar que exista el reporte
  // Nota: id puede ser 0 para consolidados generados al vuelo, así que no validamos id
  if (!consolidatedReport) {
    return <NotFound resourceName="el consolidado" message="No se pudo generar el consolidado." />;
  }

  // Verificar que tenga los datos mínimos necesarios (payment_summaries o monthly_items)
  if (!consolidatedReport.payment_summaries && !consolidatedReport.monthly_items) {
    return <NotFound resourceName="el consolidado" message="El consolidado no tiene datos." />;
  }

  return (
    <CanAccess
      resource="billing-reports"
      action="show"
      fallback={<Unauthorized />}
    >
      <div className="container mx-auto py-6 space-y-6 max-w-[98%]">
        <BillingReportBreadcrumbs
          academicLoadFileId={null}
          isConsolidated={true}
        />

        <BillingReportHeader
          report={consolidatedReport}
          isConsolidated={true}
        />

        <Card>
          <CardContent>
            <UnifiedReportTable
              summaries={consolidatedReport.payment_summaries}
              monthlyItems={consolidatedReport.monthly_items}
              rateSnapshots={consolidatedReport.rate_snapshots}
            />
          </CardContent>
        </Card>
      </div>
    </CanAccess>
  );
};

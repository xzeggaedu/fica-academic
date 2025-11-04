import { useCustom } from "@refinedev/core";
import type { BillingReport } from "@/types/api";

interface UseConsolidatedBillingReportParams {
  termId: number;
  academicLoadFileIds: number[];
}

export const useConsolidatedBillingReport = ({
  termId,
  academicLoadFileIds,
}: UseConsolidatedBillingReportParams) => {
  const fileIdsStr = academicLoadFileIds.join(",");

  const { query, result } = useCustom<BillingReport>({
    url: `/api/v1/billing-reports/consolidated/term/${termId}?academic_load_file_ids=${fileIdsStr}`,
    method: "get",
    queryOptions: {
      enabled: termId > 0 && academicLoadFileIds.length > 0,
    },
  });

  // useCustom devuelve { query, result, overtime }
  // query contiene isLoading, isError, etc.
  // result contiene data
  const isLoading = query.isPending || query.isLoading || false;
  const isError = query.isError || false;
  const error = query.error || null;
  const data = result?.data || null;

  // El dataProvider.custom devuelve { data: response }, y useCustom devuelve { data: { data: response } }
  // Por lo tanto, necesitamos acceder a data.data si existe, o data directamente
  const consolidatedReport = (data as any)?.data || data;

  return {
    data: consolidatedReport,
    isLoading,
    isError,
    error,
  };
};

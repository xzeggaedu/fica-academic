import { useCustom } from "@refinedev/core";

export interface DirectorDashboardResponse {
  context: {
    term_id: number;
    term_term?: number | null;
    term_year?: number | null;
    school_id: number;
    school_acronym?: string | null;
    file_id_selected?: number | null;
    file_versions: Array<{
      file_id: number;
      version: number;
      ingestion_status: string;
      upload_date: string;
      is_active: boolean;
    }>;
  };
  kpis: {
    has_billing_report: boolean;
    total_hours: number;
    total_dollars: number;
    paid_groups_full: number;
    paid_groups_partial: number;
    paid_groups_none: number;
    coverage_rate: number;
  };
  charts: {
    heatmap: Array<{ day: string; schedule: string; hours: number; dollars: number }>;
    stacked_by_schedule: Array<{ schedule: string; GDO: number; M1: number; M2: number; DR: number; BLG: number }>;
    monthly_trend: Array<{ month: string; sessions: number; hours: number; dollars: number }>;
    top_blocks?: Array<any>;
  };
  tables: {
    recent_loads: Array<{
      file_id: number;
      version: number;
      ingestion_status: string;
      upload_date: string;
      has_billing_report: boolean;
    }>;
  };
}

export const useDirectorDashboard = (termId: number | null, fileId?: number | null) => {
  const queryString = new URLSearchParams();
  if (termId) queryString.append("term_id", String(termId));
  if (fileId) queryString.append("file_id", String(fileId));

  const { query, result } = useCustom<DirectorDashboardResponse>({
    url: `/api/v1/dashboards/director?${queryString.toString()}`,
    method: "get",
    queryOptions: { enabled: !!termId },
  });

  const isLoading = query.isPending || query.isLoading || false;
  const isError = query.isError || false;
  const error = query.error || null;
  const data = (result?.data as any)?.data || result?.data || null;

  return { data, isLoading, isError, error };
};

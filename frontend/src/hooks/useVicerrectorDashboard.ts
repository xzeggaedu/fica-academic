import { useCustom } from "@refinedev/core";
import type { DirectorDashboardResponse } from "./useDirectorDashboard";

export const useVicerrectorDashboard = (
  termId: number | null,
  facultyId?: number | null,
  schoolId?: number | null,
  compareTermId?: number | null
) => {
  const queryString = new URLSearchParams();
  if (termId) queryString.append("term_id", String(termId));
  if (facultyId) queryString.append("faculty_id", String(facultyId));
  if (schoolId) queryString.append("school_id", String(schoolId));
  if (compareTermId) queryString.append("compare_term_id", String(compareTermId));

  const { query, result } = useCustom<DirectorDashboardResponse>({
    url: `/api/v1/dashboards/vicerrector?${queryString.toString()}`,
    method: "get",
    queryOptions: { enabled: !!termId },
  });

  const isLoading = query.isPending || query.isLoading || false;
  const isError = query.isError || false;
  const error = query.error || null;
  const data = (result?.data as any)?.data || result?.data || null;

  return { data, isLoading, isError, error };
};

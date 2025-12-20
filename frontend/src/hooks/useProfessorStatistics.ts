import { useCustom } from "@refinedev/core";

export interface ProfessorStatistics {
  total: number;
  active: number;
  inactive: number;
  bilingual: number;
  not_bilingual: number;
  by_category: Record<string, number>;
  by_title: Record<string, number>;
  one_master: number;
  two_or_more_masters: number;
  doctorate: number;
}

export const useProfessorStatistics = () => {
  const { query, result } = useCustom<ProfessorStatistics>({
    url: `/api/v1/catalog/professors/statistics`,
    method: "get",
  });

  const isLoading = query.isPending || query.isLoading || false;
  const isError = query.isError || false;
  const error = query.error || null;
  const data = (result?.data as any)?.data || result?.data || null;

  return { data, isLoading, isError, error };
};

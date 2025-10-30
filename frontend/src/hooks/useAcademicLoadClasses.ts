import { useState, useEffect } from "react";
import { useDataProvider } from "@refinedev/core";
import { toast } from "sonner";
import type { AcademicLoadClass, AcademicLoadStatistics } from "@/types/api";

interface UseAcademicLoadClassesProps {
  fileId?: number;
  enabled?: boolean;
}

export const useAcademicLoadClasses = ({ fileId, enabled = true }: UseAcademicLoadClassesProps = {}) => {
  const getDataProvider = useDataProvider();

  const [classes, setClasses] = useState<AcademicLoadClass[]>([]);
  const [statistics, setStatistics] = useState<AcademicLoadStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!fileId || !enabled) return;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const dataProvider = getDataProvider();

        // Cargar clases y estadísticas en paralelo
        const [classesResponse, statisticsResponse] = await Promise.all([
          dataProvider.custom<{ data: AcademicLoadClass[]; total: number }>({
            url: `/api/v1/academic-load-files/${fileId}/classes`,
            method: "get",
          }),
          dataProvider.custom<AcademicLoadStatistics>({
            url: `/api/v1/academic-load-files/${fileId}/statistics`,
            method: "get",
          }),
        ]);

        setClasses(classesResponse.data?.data || []);
        setStatistics(statisticsResponse.data || null);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Error al cargar los datos");
        setError(error);
        console.error("Error loading academic load classes:", error);
        toast.error("Error al cargar las clases y estadísticas");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [fileId, enabled, getDataProvider]);

  const refetch = async () => {
    if (!fileId) return;

    setIsLoading(true);
    setError(null);

    try {
      const dataProvider = getDataProvider();

      const [classesResponse, statisticsResponse] = await Promise.all([
        dataProvider.custom<{ data: AcademicLoadClass[]; total: number }>({
          url: `/api/v1/academic-load-files/${fileId}/classes`,
          method: "get",
        }),
        dataProvider.custom<AcademicLoadStatistics>({
          url: `/api/v1/academic-load-files/${fileId}/statistics`,
          method: "get",
        }),
      ]);

      setClasses(classesResponse.data?.data || []);
      setStatistics(statisticsResponse.data || null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Error al cargar los datos");
      setError(error);
      console.error("Error refetching academic load classes:", error);
      toast.error("Error al recargar los datos");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    classes,
    statistics,
    isLoading,
    error,
    refetch,
  };
};

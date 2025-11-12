import { useCreate, useDelete, useInvalidate, useList, useUpdate, useCan, useCustom } from "@refinedev/core";
import { toast } from "sonner";
import type {
  HourlyRateHistory,
  HourlyRateHistoryCreate,
  HourlyRateHistoryUpdate,
  HourlyRateTimelineItem,
} from "@/types/api";

interface UseHourlyRatesCrudProps {
  levelId?: number;
  isActiveOnly?: boolean;
  enabled?: boolean;
  pageSize?: number;
}

export const useHourlyRatesCrud = (props?: UseHourlyRatesCrudProps) => {
  const { levelId, isActiveOnly = false, enabled = true, pageSize = 1000 } = props || {};

  // Permisos
  const { data: canAccess } = useCan({ resource: "hourly-rates", action: "list" });
  const { data: canCreate } = useCan({ resource: "hourly-rates", action: "create" });
  const { data: canEdit } = useCan({ resource: "hourly-rates", action: "edit" });

  // Hook de useList para la lista principal
  const { query, result } = useList<HourlyRateHistory>({
    resource: "hourly-rates",
    pagination: {
      currentPage: 1,
      pageSize,
      mode: "server",
    },
    filters: [
      ...(levelId !== undefined
        ? [{ field: "level_id", operator: "eq" as const, value: levelId }]
        : []),
      ...(isActiveOnly
        ? [{ field: "is_active", operator: "eq" as const, value: true }]
        : []),
    ],
    queryOptions: {
      enabled: enabled && (canAccess?.can ?? false),
    },
  });

  const itemsList = result?.data || [];
  const total = result?.total || 0;
  const isLoading = query.isLoading;
  const isError = query.isError;

  // Hooks de Refine para operaciones CRUD
  const { mutate: createMutate, mutation: createMutation } = useCreate();
  const { mutate: updateMutate, mutation: updateMutation } = useUpdate();
  const { mutate: deleteMutate, mutation: deleteMutation } = useDelete();
  const invalidate = useInvalidate();

  // Estados de carga
  const isCreating = createMutation.isPending;
  const isUpdating = updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  // Función para obtener la tarifa vigente actual para un nivel
  const useCurrentRate = (levelId: number, referenceDate?: string) => {
    const params = referenceDate ? { reference_date: referenceDate } : {};
    return useCustom<HourlyRateHistory>({
      url: `/hourly-rates/current/${levelId}`,
      method: "get",
      config: {
        query: params,
      },
    });
  };

  // Hook para obtener el timeline de un nivel
  const useTimeline = (levelId: number) => {
    return useCustom<HourlyRateTimelineItem[]>({
      url: `/hourly-rates/timeline/${levelId}`,
      method: "get",
    });
  };

  // Función para crear tarifa
  const createItem = (
    values: HourlyRateHistoryCreate,
    onSuccess?: () => void,
    onError?: (error: any) => void
  ) => {
    createMutate(
      {
        resource: "hourly-rates",
        values,
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "hourly-rates", invalidates: ["list"] });
          toast.success("Tarifa horaria creada", {
            description: "La nueva tarifa ha sido creada y la anterior cerrada automáticamente.",
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          const errorMessage = error?.message || "Error desconocido al crear tarifa";
          toast.error("Error al crear tarifa", {
            description: errorMessage,
            richColors: true,
          });
          onError?.(error);
        },
      }
    );
  };

  // Función para actualizar tarifa
  const updateItem = (
    id: number,
    values: HourlyRateHistoryUpdate,
    onSuccess?: () => void,
    onError?: (error: any) => void
  ) => {
    updateMutate(
      {
        resource: "hourly-rates",
        id,
        values,
        successNotification: false,
        errorNotification: false,
        meta: {
          method: "patch",
        },
      },
      {
        onSuccess: () => {
          invalidate({ resource: "hourly-rates", invalidates: ["list"] });
          toast.success("Tarifa horaria actualizada", {
            description: "La corrección administrativa ha sido aplicada.",
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          const errorMessage = error?.message || "Error desconocido al actualizar tarifa";
          toast.error("Error al actualizar tarifa", {
            description: errorMessage,
            richColors: true,
          });
          onError?.(error);
        },
      }
    );
  };

  // Función para eliminar tarifa
  const deleteItem = (id: number, onSuccess?: () => void, onError?: (error: any) => void) => {
    deleteMutate(
      {
        resource: "hourly-rates",
        id,
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "hourly-rates", invalidates: ["list"] });
          toast.success("Tarifa eliminada exitosamente", {
            description: "La tarifa ha sido eliminada permanentemente.",
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          const errorMessage = error?.message || "Error desconocido al eliminar tarifa";
          toast.error("Error al eliminar tarifa", {
            description: errorMessage,
            richColors: true,
          });
          onError?.(error);
        },
      }
    );
  };

  return {
    // Permisos
    canAccess,
    canCreate,
    canEdit,

    // Datos de la lista principal
    itemsList,
    total,
    isLoading,
    isError,

    // Operaciones CRUD
    createItem,
    updateItem,
    deleteItem,

    // Funciones especiales
    useCurrentRate,
    useTimeline,

    // Estados de carga
    isCreating,
    isUpdating,
    isDeleting,
  };
};

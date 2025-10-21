import { useCreate, useInvalidate, useList, useUpdate, useCan } from "@refinedev/core";
import { toast } from "sonner";
import type { AcademicLevel, AcademicLevelCreate, AcademicLevelUpdate } from "@/types/api";

interface UseAcademicLevelsCrudProps {
  isActiveOnly?: boolean;
  enabled?: boolean;
  pageSize?: number;
  priority?: number;
}

export const useAcademicLevelsCrud = (props?: UseAcademicLevelsCrudProps) => {
  const { isActiveOnly = false, enabled = true, pageSize = 1000, priority } = props || {};

  // Permisos
  const { data: canAccess } = useCan({ resource: "academic-levels", action: "list" });
  const { data: canCreate } = useCan({ resource: "academic-levels", action: "create" });
  const { data: canEdit } = useCan({ resource: "academic-levels", action: "edit" });
  const { data: canDelete } = useCan({ resource: "academic-levels", action: "delete" });

  // Hook de useList para la lista principal
  const { query, result } = useList<AcademicLevel>({
    resource: "academic-levels",
    pagination: {
      currentPage: 1,
      pageSize,
      mode: "server",
    },
    filters: [
      ...(isActiveOnly ? [{ field: "is_active", operator: "eq" as const, value: true }] : []),
      ...(priority !== undefined ? [{ field: "priority", operator: "eq" as const, value: priority }] : []),
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
  const { mutate: deleteMutate, mutation: deleteMutation } = useUpdate();
  const invalidate = useInvalidate();

  // Estados de carga
  const isCreating = createMutation.isPending;
  const isUpdating = updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  // Función para crear nivel académico
  const createItem = (
    values: AcademicLevelCreate,
    onSuccess?: () => void,
    onError?: (error: any) => void
  ) => {
    createMutate(
      {
        resource: "academic-levels",
        values,
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "academic-levels", invalidates: ["list"] });
          toast.success("Nivel académico creado", {
            description: `El nivel "${values.name}" ha sido creado correctamente.`,
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          const errorMessage = error?.message || "Error desconocido al crear nivel académico";
          toast.error("Error al crear nivel académico", {
            description: errorMessage,
            richColors: true,
          });
          onError?.(error);
        },
      }
    );
  };

  // Función para actualizar nivel académico
  const updateItem = (
    id: number,
    values: AcademicLevelUpdate,
    onSuccess?: () => void,
    onError?: (error: any) => void
  ) => {
    updateMutate(
      {
        resource: "academic-levels",
        id,
        values,
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "academic-levels", invalidates: ["list"] });
          toast.success("Nivel académico actualizado", {
            description: "El nivel académico ha sido actualizado correctamente.",
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          const errorMessage = error?.message || "Error desconocido al actualizar nivel académico";
          toast.error("Error al actualizar nivel académico", {
            description: errorMessage,
            richColors: true,
          });
          onError?.(error);
        },
      }
    );
  };

  // Función para soft delete (marcar como inactivo)
  const softDeleteItem = (
    id: number,
    entityName: string,
    onSuccess?: () => void,
    onError?: (error: any) => void
  ) => {
    deleteMutate(
      {
        resource: "academic-levels",
        id,
        values: {},
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "academic-levels", invalidates: ["list"] });
          toast.success("Nivel académico desactivado", {
            description: `El nivel "${entityName}" ha sido desactivado.`,
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          toast.error("Error al desactivar nivel académico", {
            description: error?.message || "Error desconocido",
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
    canDelete,

    // Datos de la lista principal
    itemsList,
    total,
    isLoading,
    isError,

    // Operaciones CRUD
    createItem,
    updateItem,
    softDeleteItem,

    // Estados de carga
    isCreating,
    isUpdating,
    isDeleting,
  };
};

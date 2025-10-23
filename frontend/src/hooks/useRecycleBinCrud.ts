import { useList, useUpdate, useDelete, useCan, useInvalidate, useGetIdentity } from "@refinedev/core";

// Interface para elementos de la papelera
export interface RecycleBinItem {
  id: number;
  entity_type: string;
  entity_id: string;
  entity_display_name: string;
  deleted_by_name: string;
  deleted_at: string;
  reason?: string;
  can_restore: boolean;
  restored_at?: string;
  restored_by_name?: string;
}

// Interface para datos de restauración
export interface RestoreData {
  restored_by_id: string;
  restored_by_name: string;
}

// Props del hook
export interface UseRecycleBinCrudProps {
  pageSize?: number;
  enabled?: boolean;
}

export const useRecycleBinCrud = (props?: UseRecycleBinCrudProps) => {
  const { pageSize = 10, enabled = true } = props || {};

  // Verificar permisos
  const { data: canAccess } = useCan({ resource: "recycle-bin", action: "list" });
  const { data: canRestore } = useCan({ resource: "recycle-bin", action: "edit" });
  const { data: canDelete } = useCan({ resource: "recycle-bin", action: "delete" });

  // Obtener usuario actual para operaciones de restauración
  const { data: currentUser } = useGetIdentity<{
    id: string;
    name: string;
    email: string;
  }>();

  // Hook de useList para la lista principal
  const { query, result } = useList<RecycleBinItem>({
    resource: "recycle-bin",
    pagination: {
      currentPage: 1,
      pageSize: pageSize,
      mode: "server",
    },
    sorters: [
      {
        field: "deleted_at",
        order: "desc",
      },
    ],
    queryOptions: {
      enabled: (canAccess?.can ?? false) && enabled,
    },
    successNotification: false,
    errorNotification: false,
  });

  const itemsList = result?.data || [];
  const total = result?.total || 0;
  const isLoading = query.isLoading;
  const isError = query.isError;

  // Hooks de Refine para operaciones CRUD
  const { mutate: restoreMutate, mutation: restoreMutation } = useUpdate();
  const { mutate: deleteMutate, mutation: deleteMutation } = useDelete();
  const invalidate = useInvalidate();

  // Estados de carga
  const isRestoring = restoreMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  // Función para restaurar elemento
  const restoreItem = (
    item: RecycleBinItem,
    onSuccess?: () => void,
    onError?: (error: any) => void
  ) => {
    if (!currentUser) {
      onError?.(new Error("Usuario actual no disponible"));
      return;
    }

    restoreMutate(
      {
        resource: "recycle-bin-restore",
        id: item.id,
        values: {
          restored_by_id: currentUser.id,
          restored_by_name: currentUser.name,
        },
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: (data) => {
          invalidate({ resource: "recycle-bin", invalidates: ["list"] });
          onSuccess?.();
        },
        onError: (error) => {
          onError?.(error);
        },
      }
    );
  };

  // Función para eliminar permanentemente
  const deleteItem = (
    item: RecycleBinItem,
    onSuccess?: () => void,
    onError?: (error: any) => void
  ) => {
    deleteMutate(
      {
        resource: "recycle-bin",
        id: item.id,
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "recycle-bin", invalidates: ["list"] });
          onSuccess?.();
        },
        onError: (error) => {
          onError?.(error);
        },
      }
    );
  };

  return {
    // Datos
    itemsList,
    total,
    isLoading,
    isError,

    // Permisos
    canAccess,
    canRestore,
    canDelete,

    // Usuario actual
    currentUser,

    // Operaciones CRUD
    restoreItem,
    deleteItem,

    // Estados de carga
    isRestoring,
    isDeleting,
  };
};

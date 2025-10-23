import { useState } from "react";
import { useCreate, useUpdate, useDelete, useList, useCan, useInvalidate } from "@refinedev/core";
import { toast } from "sonner";
import type { Holiday, HolidayCreate, HolidayUpdate, FixedHolidayRule } from "@/types/api";

export const useHolidaysCrud = () => {
  // Permisos
  const { data: canAccess } = useCan({ resource: "holidays", action: "list" });
  const { data: canCreate } = useCan({ resource: "holidays", action: "create" });
  const { data: canEdit } = useCan({ resource: "holidays", action: "edit" });
  const { data: canDelete } = useCan({ resource: "holidays", action: "delete" });

  // Hook de useList para la lista principal (cargar todos los registros)
  const { query, result } = useList<Holiday>({
    resource: "holidays",
    pagination: {
      currentPage: 1,
      pageSize: 1000, // Cargar todos los registros para paginación client-side
      mode: "server",
    },
    queryOptions: {
      enabled: canAccess?.can ?? false,
    },
  });

  // Hook de useList para las reglas de asuetos fijos
  const { query: fixedRulesQuery, result: fixedRulesResult } = useList<FixedHolidayRule>({
    resource: "fixed-holiday-rules",
    pagination: {
      currentPage: 1,
      pageSize: 1000,
      mode: "server",
    },
    queryOptions: {
      enabled: canAccess?.can ?? false,
    },
  });

  const itemsList = result?.data || [];
  const total = result?.total || 0;
  const isLoading = query.isLoading;
  const isError = query.isError;

  const fixedHolidayRules = fixedRulesResult?.data || [];
  const isLoadingRules = fixedRulesQuery.isLoading;

  // Hooks de Refine para operaciones CRUD
  const { mutate: createMutate, mutation: createMutation } = useCreate();
  const { mutate: updateMutate, mutation: updateMutation } = useUpdate({
    successNotification: false,
    errorNotification: false,
  });
  const { mutate: deleteMutate, mutation: deleteMutation } = useDelete(); // Hard delete
  const invalidate = useInvalidate();

  // Estados locales para UI
  const [editingItem, setEditingItem] = useState<Holiday | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Estados de carga
  const isCreating = createMutation.isPending;
  const isUpdating = updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  // Función para crear asueto del año
  const createItem = (values: HolidayCreate, onSuccess?: () => void, onError?: (error: any) => void) => {
    createMutate(
      {
        resource: "holidays",
        values,
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: (data) => {
          invalidate({ resource: "holidays", invalidates: ["list"] });
          setIsCreateModalOpen(false);
          const holidayData = data?.data as Holiday;
          const count = holidayData?.annual_holidays_count || 0;
          toast.success("Asuetos del año creados exitosamente", {
            description: `Se generaron ${count} fechas de asueto para el año ${values.year}.`,
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          const errorMessage = error?.message || "Error desconocido al crear asuetos";
          toast.error("Error al crear asuetos", {
            description: errorMessage,
            richColors: true,
          });
          onError?.(error);
        },
      }
    );
  };

  // Función para actualizar asueto del año
  const updateItem = (id: number, values: HolidayUpdate, onSuccess?: () => void, onError?: (error: any) => void) => {
    updateMutate(
      {
        resource: "holidays",
        id,
        values,
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "holidays", invalidates: ["list"] });
          setIsEditModalOpen(false);
          setEditingItem(null);
          toast.success("Asueto actualizado exitosamente", {
            description: `El asueto del año ${values.year || id} ha sido actualizado correctamente.`,
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          const errorMessage = error?.message || "Error desconocido al actualizar asueto";
          toast.error("Error al actualizar asueto", {
            description: errorMessage,
            richColors: true,
          });
          onError?.(error);
        },
      }
    );
  };

  // Función para hard delete (eliminación permanente)
  const deleteItem = (id: number, entityName: string, onSuccess?: () => void, onError?: (error: any) => void) => {
    deleteMutate(
      {
        resource: "holidays",
        id,
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "holidays", invalidates: ["list"] });
          toast.success("Asueto eliminado permanentemente", {
            description: `El asueto del año "${entityName}" ha sido eliminado permanentemente.`,
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          toast.error("Error al eliminar asueto", {
            description: error?.message || "Error desconocido",
            richColors: true,
          });
          onError?.(error);
        },
      }
    );
  };

  // Función para actualizar un campo individual (sin validaciones específicas)
  const updateSingleField = (
    id: number,
    field: keyof HolidayUpdate,
    value: string | number | undefined,
    currentValue: any,
    onSuccess?: () => void,
    onError?: (error: any) => void
  ) => {
    // Verificar si hay cambios reales
    if (currentValue === value) {
      setIsEditing(false);
      return;
    }

    const payload: HolidayUpdate = { [field]: value } as HolidayUpdate;
    updateMutate(
      {
        resource: "holidays",
        id,
        values: payload,
        mutationMode: "optimistic",
      },
      {
        onSuccess: () => {
          invalidate({ resource: "holidays", invalidates: ["list"] });
          setIsEditing(false);
          toast.success("Campo actualizado", {
            description: "El campo ha sido actualizado correctamente.",
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          const errorMessage = error?.message || "Error desconocido al actualizar";
          toast.error("Error al actualizar", {
            description: errorMessage,
            richColors: true,
          });
          onError?.(error);
        },
      }
    );
  };

  // Funciones de control de inline editing
  const startEdit = () => setIsEditing(true);
  const cancelEdit = () => setIsEditing(false);

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

    // Reglas de asuetos fijos
    fixedHolidayRules,
    isLoadingRules,

    // Operaciones CRUD
    createItem,
    updateItem,
    deleteItem, // Hard delete

    // Operaciones de inline editing
    updateSingleField,
    startEdit,
    cancelEdit,

    // Estados UI
    editingItem,
    setEditingItem,
    isCreateModalOpen,
    setIsCreateModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    isEditing,
    setIsEditing,

    // Estados de carga
    isCreating,
    isUpdating,
    isDeleting,
  };
};

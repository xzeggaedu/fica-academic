import { useState } from "react";
import { useCreate, useUpdate, useDelete, useList, useCan, useInvalidate } from "@refinedev/core";
import { toast } from "sonner";
import type { FixedHolidayRule } from "@/types/api";

// Interfaces para CRUD
interface FixedHolidayRuleCreate {
  month: number;
  day: number;
  name: string;
}

interface FixedHolidayRuleUpdate {
  month?: number;
  day?: number;
  name?: string;
}

export const useFixedHolidayRulesCrud = () => {
  // Permisos
  const { data: canAccess } = useCan({ resource: "fixed-holiday-rules", action: "list" });
  const { data: canCreate } = useCan({ resource: "fixed-holiday-rules", action: "create" });
  const { data: canEdit } = useCan({ resource: "fixed-holiday-rules", action: "edit" });
  const { data: canDelete } = useCan({ resource: "fixed-holiday-rules", action: "delete" });

  // Hook de useList para la lista principal (cargar todos los registros)
  const { query, result } = useList<FixedHolidayRule>({
    resource: "fixed-holiday-rules",
    pagination: {
      currentPage: 1,
      pageSize: 1000, // Cargar todos los registros para paginación client-side
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

  // Hooks de Refine para operaciones CRUD
  const { mutate: createMutate, mutation: createMutation } = useCreate();
  const { mutate: updateMutate, mutation: updateMutation } = useUpdate({
    successNotification: false,
    errorNotification: false,
  });
  const { mutate: deleteMutate, mutation: deleteMutation } = useDelete(); // Hard delete
  const invalidate = useInvalidate();

  // Estados locales para UI
  const [editingItem, setEditingItem] = useState<FixedHolidayRule | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Estados de carga
  const isCreating = createMutation.isPending;
  const isUpdating = updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  // Función para crear un nuevo asueto fijo
  const createItem = (
    values: FixedHolidayRuleCreate,
    onSuccess?: () => void,
    onError?: (error: any) => void
  ) => {
    createMutate(
      {
        resource: "fixed-holiday-rules",
        values,
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "fixed-holiday-rules", invalidates: ["list"] });
          toast.success("Asueto fijo creado", {
            description: `El asueto "${values.name}" ha sido creado exitosamente.`,
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          toast.error("Error al crear asueto fijo", {
            description: error?.message || "Error desconocido",
            richColors: true,
          });
          onError?.(error);
        },
      }
    );
  };

  // Función para actualizar un asueto fijo
  const updateItem = (
    id: number,
    values: FixedHolidayRuleUpdate,
    onSuccess?: () => void,
    onError?: (error: any) => void
  ) => {
    updateMutate(
      {
        resource: "fixed-holiday-rules",
        id,
        values,
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "fixed-holiday-rules", invalidates: ["list"] });
          toast.success("Asueto fijo actualizado", {
            description: "El asueto fijo ha sido actualizado exitosamente.",
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          toast.error("Error al actualizar asueto fijo", {
            description: error?.message || "Error desconocido",
            richColors: true,
          });
          onError?.(error);
        },
      }
    );
  };

  // Función para eliminar un asueto fijo (hard delete)
  const deleteItem = (
    id: number,
    entityName: string,
    onSuccess?: () => void,
    onError?: (error: any) => void
  ) => {
    deleteMutate(
      {
        resource: "fixed-holiday-rules",
        id,
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "fixed-holiday-rules", invalidates: ["list"] });
          toast.success("Asueto fijo eliminado", {
            description: `El asueto "${entityName}" ha sido eliminado permanentemente.`,
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          toast.error("Error al eliminar asueto fijo", {
            description: error?.message || "Error desconocido",
            richColors: true,
          });
          onError?.(error);
        },
      }
    );
  };

  // Función para actualizar un campo específico (inline editing)
  const updateSingleField = (
    id: number,
    field: keyof FixedHolidayRuleUpdate,
    value: any,
    onSuccess?: () => void,
    onError?: (error: any) => void
  ) => {
    updateItem(
      id,
      { [field]: value },
      onSuccess,
      onError
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

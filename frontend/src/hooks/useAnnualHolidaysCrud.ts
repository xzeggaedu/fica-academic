import { useState } from "react";
import { useCreate, useUpdate, useDelete, useList, useCan, useInvalidate } from "@refinedev/core";
import { toast } from "sonner";
import type { AnnualHoliday } from "@/types/api";

// Interfaces para CRUD
interface AnnualHolidayCreate {
  holiday_id: number;
  date: string;
  name: string;
  type: string;
}

interface AnnualHolidayUpdate {
  holiday_id?: number;
  date?: string;
  name?: string;
  type?: string;
}

export const useAnnualHolidaysCrud = (holidayId?: number) => {
  // Permisos
  const { data: canAccess } = useCan({ resource: "annual-holidays", action: "list" });
  const { data: canCreate } = useCan({ resource: "annual-holidays", action: "create" });
  const { data: canEdit } = useCan({ resource: "annual-holidays", action: "edit" });
  const { data: canDelete } = useCan({ resource: "annual-holidays", action: "delete" });

  // Hook de useList para la lista principal (cargar todos los registros)
  const { query, result } = useList<AnnualHoliday>({
    resource: "annual-holidays",
    filters: holidayId ? [{ field: "holiday_id", operator: "eq", value: holidayId }] : [],
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
  const [editingItem, setEditingItem] = useState<AnnualHoliday | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Estados de carga
  const isCreating = createMutation.isPending;
  const isUpdating = updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  // Función para crear un nuevo asueto anual
  const createItem = (
    data: AnnualHolidayCreate,
    onSuccess?: () => void,
    onError?: (error: any) => void
  ) => {
    createMutate(
      {
        resource: "annual-holidays",
        values: data,
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "annual-holidays", invalidates: ["list"] });
          toast.success("Asueto anual creado", {
            description: `El asueto "${data.name}" ha sido creado exitosamente.`,
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          toast.error("Error al crear asueto anual", {
            description: error.message || "No se pudo crear el asueto anual",
            richColors: true,
          });
          onError?.(error);
        },
      }
    );
  };

  // Función para actualizar un asueto anual
  const updateItem = (
    id: number,
    data: AnnualHolidayUpdate,
    onSuccess?: () => void,
    onError?: (error: any) => void
  ) => {
    updateMutate(
      {
        resource: "annual-holidays",
        id,
        values: data,
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "annual-holidays", invalidates: ["list"] });
          toast.success("Asueto anual actualizado", {
            description: "El asueto anual ha sido actualizado exitosamente.",
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          toast.error("Error al actualizar asueto anual", {
            description: error.message || "No se pudo actualizar el asueto anual",
            richColors: true,
          });
          onError?.(error);
        },
      }
    );
  };

  // Función para eliminar un asueto anual (hard delete)
  const deleteItem = (
    id: number,
    entityName: string,
    onSuccess?: () => void,
    onError?: (error: any) => void
  ) => {
    deleteMutate(
      {
        resource: "annual-holidays",
        id,
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "annual-holidays", invalidates: ["list"] });
          toast.success("Asueto anual eliminado", {
            description: `El asueto "${entityName}" ha sido eliminado permanentemente.`,
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          toast.error("Error al eliminar asueto anual", {
            description: error.message || "No se pudo eliminar el asueto anual",
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
    field: keyof AnnualHolidayUpdate,
    value: any,
    onSuccess?: () => void,
    onError?: (error: any) => void
  ) => {
    updateMutate(
      {
        resource: "annual-holidays",
        id,
        values: { [field]: value },
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "annual-holidays", invalidates: ["list"] });
          onSuccess?.();
        },
        onError: (error) => {
          toast.error("Error al actualizar campo", {
            description: error.message || "No se pudo actualizar el campo",
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

    // Datos
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

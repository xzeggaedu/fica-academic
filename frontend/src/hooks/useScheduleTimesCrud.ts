import { useState } from "react";
import { useCreate, useUpdate, useList, useCan, useInvalidate } from "@refinedev/core";
import { toast } from "sonner";
import type { ScheduleTime, ScheduleTimeCreate, ScheduleTimeUpdate } from "@/types/api";

export const useScheduleTimesCrud = () => {
  // Permisos
  const { data: canAccess } = useCan({ resource: "schedule-times", action: "list" });
  const { data: canCreate } = useCan({ resource: "schedule-times", action: "create" });
  const { data: canEdit } = useCan({ resource: "schedule-times", action: "edit" });
  const { data: canDelete } = useCan({ resource: "schedule-times", action: "delete" });

  // Hook de useList para la lista principal
  const { query, result } = useList<ScheduleTime>({
    resource: "schedule-times",
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
  const { mutate: updateMutate, mutation: updateMutation } = useUpdate();
  const { mutate: softDeleteMutate, mutation: softDeleteMutation } = useUpdate();
  const invalidate = useInvalidate();

  // Estados locales para UI
  const [editingItem, setEditingItem] = useState<ScheduleTime | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Estados de carga
  const isCreating = createMutation.isPending;
  const isUpdating = updateMutation.isPending;
  const isDeleting = softDeleteMutation.isPending;

  // Función para crear horario
  const createItem = (values: ScheduleTimeCreate, onSuccess?: () => void, onError?: (error: any) => void) => {
    createMutate(
      {
        resource: "schedule-times",
        values,
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "schedule-times", invalidates: ["list"] });
          setIsCreateModalOpen(false);
          toast.success("Horario creado exitosamente", {
            description: `El horario "${values.schedule_code}" ha sido creado correctamente.`,
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          const errorMessage = error?.message || "Error desconocido al crear horario";
          toast.error("Error al crear horario", {
            description: errorMessage,
            richColors: true,
          });
          onError?.(error);
        },
      }
    );
  };

  // Función para actualizar horario
  const updateItem = (id: number, values: ScheduleTimeUpdate, onSuccess?: () => void, onError?: (error: any) => void) => {
    updateMutate(
      {
        resource: "schedule-times",
        id,
        values,
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "schedule-times", invalidates: ["list"] });
          setIsEditModalOpen(false);
          setEditingItem(null);
          toast.success("Horario actualizado exitosamente", {
            description: `El horario "${values.schedule_code || id}" ha sido actualizado correctamente.`,
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          const errorMessage = error?.message || "Error desconocido al actualizar horario";
          toast.error("Error al actualizar horario", {
            description: errorMessage,
            richColors: true,
          });
          onError?.(error);
        },
      }
    );
  };

  // Función para soft delete (marcar como eliminado)
  const softDeleteItem = (id: number, entityName: string, onSuccess?: () => void, onError?: (error: any) => void) => {
    softDeleteMutate(
      {
        resource: "soft-delete",
        id,
        values: { type: "catalog/schedule-times" },
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "schedule-times", invalidates: ["list"] });
          toast.success("Horario movido a papelera", {
            description: `El horario "${entityName}" ha sido movido a la papelera de reciclaje.`,
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          toast.error("Error al mover a papelera", {
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

    // Estados UI
    editingItem,
    setEditingItem,
    isCreateModalOpen,
    setIsCreateModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,

    // Estados de carga
    isCreating,
    isUpdating,
    isDeleting,
  };
};

import { useState } from "react";
import { useCreate, useUpdate, useList, useCan, useInvalidate } from "@refinedev/core";
import { toast } from "sonner";
import type { CrudFilters } from "@refinedev/core";
import type { Professor, ProfessorCreate, ProfessorUpdate } from "@/types/api";

interface UseProfessorsCrudProps {
  isActiveOnly?: boolean;
  enabled?: boolean;
  pageSize?: number;
}

export const useProfessorsCrud = (props?: UseProfessorsCrudProps) => {
  const { isActiveOnly = false, enabled = true, pageSize = 1000 } = props || {};

  // Permisos
  const { data: canAccess } = useCan({ resource: "professors", action: "list" });
  const { data: canCreate } = useCan({ resource: "professors", action: "create" });
  const { data: canEdit } = useCan({ resource: "professors", action: "edit" });
  const { data: canDelete } = useCan({ resource: "professors", action: "delete" });

  // Construir filtros dinámicamente
  const filters: CrudFilters = [];
  if (isActiveOnly) {
    filters.push({
      field: "is_active",
      operator: "eq",
      value: true,
    });
  }

  // Hook de useList para la lista principal (con filtros y paginación opcionales)
  const { query, result } = useList<Professor>({
    resource: "professors",
    queryOptions: {
      enabled: enabled && (canAccess?.can ?? false),
    },
    filters: filters.length > 0 ? filters : undefined,
    pagination: {
      currentPage: 1,
      pageSize: pageSize,
      mode: "server",
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
  const [editingItem, setEditingItem] = useState<Professor | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Estados de carga
  const isCreating = createMutation.isPending;
  const isUpdating = updateMutation.isPending;
  const isDeleting = softDeleteMutation.isPending;

  // Función para crear profesor
  const createItem = (values: ProfessorCreate, onSuccess?: () => void, onError?: (error: any) => void) => {
    createMutate(
      {
        resource: "professors",
        values,
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "professors", invalidates: ["list"] });
          setIsCreateModalOpen(false);
          toast.success("Profesor creado exitosamente", {
            description: `El profesor "${values.professor_name}" ha sido creado correctamente.`,
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          const errorMessage = error?.message || "Error desconocido al crear profesor";
          toast.error("Error al crear profesor", {
            description: errorMessage,
            richColors: true,
          });
          onError?.(error);
        },
      }
    );
  };

  // Función para actualizar profesor
  const updateItem = (id: number, values: ProfessorUpdate, onSuccess?: () => void, onError?: (error: any) => void) => {
    updateMutate(
      {
        resource: "professors",
        id,
        values,
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "professors", invalidates: ["list"] });
          setIsEditModalOpen(false);
          setEditingItem(null);
          toast.success("Profesor actualizado exitosamente", {
            description: `El profesor "${values.professor_name || id}" ha sido actualizado correctamente.`,
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          const errorMessage = error?.message || "Error desconocido al actualizar profesor";
          toast.error("Error al actualizar profesor", {
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
        values: { type: "catalog/professors" },
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "professors", invalidates: ["list"] });
          toast.success("Profesor movido a papelera", {
            description: `El profesor "${entityName}" ha sido movido a la papelera de reciclaje.`,
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

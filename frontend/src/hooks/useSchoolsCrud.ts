import { useState } from "react";
import { useCreate, useUpdate, useList, useCan, useInvalidate } from "@refinedev/core";
import { toast } from "sonner";
import type { CrudFilters } from "@refinedev/core";
import type { School, SchoolCreate, SchoolUpdate } from "@/types/api";

interface UseSchoolsCrudProps {
  facultyId?: number;
  enabled?: boolean;
}

export const useSchoolsCrud = (props?: UseSchoolsCrudProps) => {
  const { facultyId, enabled = true } = props || {};

  // Permisos
  const { data: canAccess } = useCan({ resource: "school", action: "list" });
  const { data: canCreate } = useCan({ resource: "school", action: "create" });
  const { data: canEdit } = useCan({ resource: "school", action: "edit" });
  const { data: canDelete } = useCan({ resource: "school", action: "delete" });

  // Construir filtros dinámicamente
  const filters: CrudFilters = [];
  if (facultyId !== undefined) {
    filters.push({
      field: "faculty_id",
      operator: "eq",
      value: facultyId,
    });
  }

  // Hook de useList para la lista principal (con filtros opcionales)
  const { query, result } = useList<School>({
    resource: "schools",
    queryOptions: {
      enabled: enabled && (canAccess?.can ?? false),
    },
    filters: filters.length > 0 ? filters : undefined,
    pagination: {
      mode: "off",
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
  const [editingItem, setEditingItem] = useState<School | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Estados de carga
  const isCreating = createMutation.isPending;
  const isUpdating = updateMutation.isPending;
  const isDeleting = softDeleteMutation.isPending;

  // Función para crear escuela
  const createItem = (values: SchoolCreate, onSuccess?: () => void, onError?: (error: any) => void) => {
    createMutate(
      {
        resource: "school",
        values,
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "school", invalidates: ["list"] });
          invalidate({ resource: "schools", invalidates: ["list"] });
          setIsCreateModalOpen(false);
          toast.success("Escuela creada exitosamente", {
            description: `La escuela "${values.name}" ha sido creada correctamente.`,
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          const errorMessage = error?.message || "Error desconocido al crear escuela";
          toast.error("Error al crear escuela", {
            description: errorMessage,
            richColors: true,
          });
          onError?.(error);
        },
      }
    );
  };

  // Función para actualizar escuela
  const updateItem = (id: number, values: SchoolUpdate, onSuccess?: () => void, onError?: (error: any) => void) => {
    updateMutate(
      {
        resource: "school",
        id,
        values,
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "school", invalidates: ["list"] });
          invalidate({ resource: "schools", invalidates: ["list"] });
          setIsEditModalOpen(false);
          setEditingItem(null);
          toast.success("Escuela actualizada exitosamente", {
            description: `La escuela "${values.name || id}" ha sido actualizada correctamente.`,
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          const errorMessage = error?.message || "Error desconocido al actualizar escuela";
          toast.error("Error al actualizar escuela", {
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
        values: { type: "school" },
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "school", invalidates: ["list"] });
          invalidate({ resource: "schools", invalidates: ["list"] });
          toast.success("Escuela movida a papelera", {
            description: `La escuela "${entityName}" ha sido movida a la papelera de reciclaje.`,
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

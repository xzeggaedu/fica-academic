import { useState } from "react";
import { useCreate, useUpdate, useList, useCan, useInvalidate } from "@refinedev/core";
import { toast } from "sonner";
import type { CrudFilters } from "@refinedev/core";
import type { Faculty, FacultyCreate, FacultyUpdate } from "@/types/api";

interface UseFacultiesCrudProps {
  isActiveOnly?: boolean;
  enabled?: boolean;
  pageSize?: number;
}

export const useFacultiesCrud = (props?: UseFacultiesCrudProps) => {
  const { isActiveOnly = false, enabled = true, pageSize = 1000 } = props || {};

  // Permisos
  const { data: canAccess } = useCan({ resource: "faculty", action: "list" });
  const { data: canCreate } = useCan({ resource: "faculty", action: "create" });
  const { data: canEdit } = useCan({ resource: "faculty", action: "edit" });
  const { data: canDelete } = useCan({ resource: "faculty", action: "delete" });

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
  const { query, result } = useList<Faculty>({
    resource: "faculties",
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
  const [editingItem, setEditingItem] = useState<Faculty | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Estados de carga
  const isCreating = createMutation.isPending;
  const isUpdating = updateMutation.isPending;
  const isDeleting = softDeleteMutation.isPending;

  // Función para crear facultad
  const createItem = (values: FacultyCreate, onSuccess?: () => void, onError?: (error: any) => void) => {
    console.log("createItem", values);
    createMutate(
      {
        resource: "faculty",
        values,
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "faculty", invalidates: ["list"] });
          invalidate({ resource: "faculties", invalidates: ["list"] });
          setIsCreateModalOpen(false);
          toast.success("Facultad creada exitosamente", {
            description: `La facultad "${values.name}" ha sido creada correctamente.`,
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          const errorMessage = error?.message || "Error desconocido al crear facultad";
          toast.error("Error al crear facultad", {
            description: errorMessage,
            richColors: true,
          });
          onError?.(error);
        },
      }
    );
  };

  // Función para actualizar facultad
  const updateItem = (id: number, values: FacultyUpdate, onSuccess?: () => void, onError?: (error: any) => void) => {
    console.log("updateItem", id, values);
    updateMutate(
      {
        resource: "faculty",
        id,
        values,
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "faculty", invalidates: ["list"] });
          invalidate({ resource: "faculties", invalidates: ["list"] });
          setIsEditModalOpen(false);
          setEditingItem(null);
          toast.success("Facultad actualizada exitosamente", {
            description: `La facultad "${values.name || id}" ha sido actualizada correctamente.`,
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          const errorMessage = error?.message || "Error desconocido al actualizar facultad";
          toast.error("Error al actualizar facultad", {
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
    console.log("softDeleteItem", id, entityName);
    softDeleteMutate(
      {
        resource: "soft-delete",
        id,
        values: { type: "faculty" },
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "faculty", invalidates: ["list"] });
          invalidate({ resource: "faculties", invalidates: ["list"] });
          toast.success("Facultad movida a papelera", {
            description: `La facultad "${entityName}" ha sido movida a la papelera de reciclaje.`,
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

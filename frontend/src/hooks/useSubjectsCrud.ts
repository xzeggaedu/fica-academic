import { useState } from "react";
import { useCreate, useUpdate, useList, useCan, useInvalidate } from "@refinedev/core";
import { toast } from "sonner";
import type { Subject, SubjectCreate, SubjectUpdate } from "@/types/api";

export const useSubjectsCrud = () => {
  // Permisos
  const { data: canAccess } = useCan({ resource: "subjects", action: "list" });
  const { data: canCreate } = useCan({ resource: "subjects", action: "create" });
  const { data: canEdit } = useCan({ resource: "subjects", action: "edit" });
  const { data: canDelete } = useCan({ resource: "subjects", action: "delete" });

  // Hook de useList para la lista principal
  const { query, result } = useList<Subject>({
    resource: "subjects",
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
  const [editingItem, setEditingItem] = useState<Subject | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Estados de carga
  const isCreating = createMutation.isPending;
  const isUpdating = updateMutation.isPending;
  const isDeleting = softDeleteMutation.isPending;

  // Función para crear asignatura
  const createItem = (values: SubjectCreate, onSuccess?: () => void, onError?: (error: any) => void) => {
    createMutate(
      {
        resource: "subjects",
        values,
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "subjects", invalidates: ["list"] });
          setIsCreateModalOpen(false);
          toast.success("Asignatura creada exitosamente", {
            description: `La asignatura "${values.subject_name}" ha sido creada correctamente.`,
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          const errorMessage = error?.message || "Error desconocido al crear asignatura";
          toast.error("Error al crear asignatura", {
            description: errorMessage,
            richColors: true,
          });
          onError?.(error);
        },
      }
    );
  };

  // Función para actualizar asignatura
  const updateItem = (id: number, values: SubjectUpdate, onSuccess?: () => void, onError?: (error: any) => void) => {
    updateMutate(
      {
        resource: "subjects",
        id,
        values,
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "subjects", invalidates: ["list"] });
          setIsEditModalOpen(false);
          setEditingItem(null);
          toast.success("Asignatura actualizada exitosamente", {
            description: `La asignatura "${values.subject_name || id}" ha sido actualizada correctamente.`,
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          const errorMessage = error?.message || "Error desconocido al actualizar asignatura";
          toast.error("Error al actualizar asignatura", {
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
        values: { type: "catalog/subjects" },
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "subjects", invalidates: ["list"] });
          toast.success("Asignatura movida a papelera", {
            description: `La asignatura "${entityName}" ha sido movida a la papelera de reciclaje.`,
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

import { useState } from "react";
import { useCreate, useUpdate, useList, useCan, useInvalidate } from "@refinedev/core";
import { toast } from "sonner";
import type { Term, TermCreate, TermUpdate } from "@/types/api";

export const useTermsCrud = () => {
  // Permisos
  const { data: canAccess } = useCan({ resource: "terms", action: "list" });
  const { data: canCreate } = useCan({ resource: "terms", action: "create" });
  const { data: canEdit } = useCan({ resource: "terms", action: "edit" });
  const { data: canDelete } = useCan({ resource: "terms", action: "delete" });

  // Hook de useList para la lista principal
  const { query, result } = useList<Term>({
    resource: "terms",
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
  const { mutate: softDeleteMutate, mutation: softDeleteMutation } = useUpdate();
  const invalidate = useInvalidate();

  // Estados locales para UI
  const [editingItem, setEditingItem] = useState<Term | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Estados de carga
  const isCreating = createMutation.isPending;
  const isUpdating = updateMutation.isPending;
  const isDeleting = softDeleteMutation.isPending;

  // Función para crear ciclo académico
  const createItem = (values: TermCreate, onSuccess?: () => void, onError?: (error: any) => void) => {
    createMutate(
      {
        resource: "terms",
        values,
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "terms", invalidates: ["list"] });
          setIsCreateModalOpen(false);
          toast.success("Ciclo académico creado exitosamente", {
            description: `El ciclo "${values.description || `Ciclo ${values.term}/${values.year}`}" ha sido creado correctamente.`,
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          const errorMessage = error?.message || "Error desconocido al crear ciclo académico";
          toast.error("Error al crear ciclo académico", {
            description: errorMessage,
            richColors: true,
          });
          onError?.(error);
        },
      }
    );
  };

  // Función para actualizar ciclo académico
  const updateItem = (id: number, values: TermUpdate, onSuccess?: () => void, onError?: (error: any) => void) => {
    updateMutate(
      {
        resource: "terms",
        id,
        values,
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "terms", invalidates: ["list"] });
          setIsEditModalOpen(false);
          setEditingItem(null);
          toast.success("Ciclo académico actualizado exitosamente", {
            description: `El ciclo "${values.description || id}" ha sido actualizado correctamente.`,
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          const errorMessage = error?.message || "Error desconocido al actualizar ciclo académico";
          toast.error("Error al actualizar ciclo académico", {
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
        values: { type: "terms" },
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "terms", invalidates: ["list"] });
          toast.success("Ciclo académico movido a papelera", {
            description: `El ciclo "${entityName}" ha sido movido a la papelera de reciclaje.`,
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

  // Función para actualizar un campo individual (sin validaciones específicas)
  const updateSingleField = (
    id: number,
    field: keyof TermUpdate,
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

    const payload: TermUpdate = { [field]: value } as TermUpdate;
    updateMutate(
      {
        resource: "terms",
        id,
        values: payload,
        mutationMode: "optimistic",
      },
      {
        onSuccess: () => {
          invalidate({ resource: "terms", invalidates: ["list"] });
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

    // Operaciones CRUD
    createItem,
    updateItem,
    softDeleteItem,

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

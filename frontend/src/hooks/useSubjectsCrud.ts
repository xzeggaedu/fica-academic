import { useEffect, useMemo, useState } from "react";
import { useCreate, useUpdate, useList, useCan, useInvalidate } from "@refinedev/core";
import { toast } from "sonner";
import type { Subject, SubjectCreate, SubjectUpdate } from "@/types/api";

export const useSubjectsCrud = () => {
  // Permisos
  const { data: canAccess } = useCan({ resource: "subjects", action: "list" });
  const { data: canCreate } = useCan({ resource: "subjects", action: "create" });
  const { data: canEdit } = useCan({ resource: "subjects", action: "edit" });
  const { data: canDelete } = useCan({ resource: "subjects", action: "delete" });

  // Hook de useList para la lista principal (cargar todos los registros)
  const { query, result } = useList<Subject>({
    resource: "subjects",
    pagination: {
      currentPage: 1,
      pageSize: 1000, // Cargar todos los registros para paginación client-side
      mode: "server",
    },
    queryOptions: {
      enabled: canAccess?.can ?? false,
      staleTime: 0, // Forzar que los datos siempre se consideren obsoletos
      refetchOnMount: true, // Siempre refetch al montar
      refetchOnWindowFocus: false, // No refetch al enfocar ventana
    },
  });

  // const itemsList = result?.data || [];
  const itemsList = useMemo(() => result?.data || [], [result?.data]);
  const total = result?.total || 0;
  const isLoading = query.isLoading;
  const isError = query.isError;

  useEffect(() => {
    console.log(itemsList);
  }, [itemsList]);
  // Hooks de Refine para operaciones CRUD
  const { mutate: createMutate, mutation: createMutation } = useCreate();
  const { mutate: updateMutate, mutation: updateMutation } = useUpdate({
    successNotification: false,
    errorNotification: false,
  });
  const { mutate: softDeleteMutate, mutation: softDeleteMutation } = useUpdate();
  const invalidate = useInvalidate();

  // Estados locales para UI
  const [editingItem, setEditingItem] = useState<Subject | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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
          invalidate({
            resource: "subjects",
            invalidates: ["list", "detail", "many"]
          });
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
          invalidate({
            resource: "subjects",
            invalidates: ["list", "detail", "many"]
          });
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
        onSuccess: (data: any) => {
          invalidate({
            resource: "subjects",
            invalidates: ["list", "detail", "many"]
          });
          console.log(data);

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

  // Función para actualizar un campo individual (sin validaciones específicas)
  const updateSingleField = (
    id: number,
    field: keyof SubjectUpdate,
    value: string | boolean | number[] | undefined,
    currentValue: any,
    onSuccess?: () => void,
    onError?: (error: any) => void
  ) => {
    // Verificar si hay cambios reales
    if (currentValue === value) {
      setIsEditing(false);
      return;
    }

    const payload: SubjectUpdate = { [field]: value } as SubjectUpdate;
    updateMutate(
      {
        resource: "subjects",
        id,
        values: payload,
        mutationMode: "optimistic",
      },
      {
        onSuccess: () => {
          invalidate({ resource: "subjects", invalidates: ["list"] });
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

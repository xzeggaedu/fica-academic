import { useState } from "react";
import { useCreate, useUpdate, useList, useCan, useInvalidate } from "@refinedev/core";
import { toast } from "sonner";
import type { User, UserCreate, UserUpdate } from "@/types/api";

export const useUsersCrud = () => {
  // Permisos
  const { data: canAccess } = useCan({ resource: "users", action: "list" });
  const { data: canCreate } = useCan({ resource: "users", action: "create" });
  const { data: canEdit } = useCan({ resource: "users", action: "edit" });
  const { data: canDelete } = useCan({ resource: "users", action: "delete" });

  // Hook de useList para la lista principal (cargar todos los registros)
  const { query, result } = useList<User>({
    resource: "users",
    pagination: {
      currentPage: 1,
      pageSize: 1000, // Cargar todos los registros para paginación client-side
      mode: "server",
    },
    queryOptions: {
      enabled: canAccess?.can ?? false,
    },
    successNotification: false,
    errorNotification: false,
  });

  const itemsList = result?.data || [];
  const total = result?.total || 0;
  const isLoading = query.isLoading;
  const isError = query.isError;

  // Hooks de Refine para operaciones CRUD
  const { mutate: createMutate, mutation: createMutation } = useCreate();
  const { mutate: updateMutate, mutation: updateMutation } = useUpdate();
  const { mutate: updatePasswordMutate, mutation: updatePasswordMutation } = useUpdate();
  const { mutate: softDeleteMutate, mutation: softDeleteMutation } = useUpdate();
  const invalidate = useInvalidate();

  // Estados locales para UI
  const [editingItem, setEditingItem] = useState<User | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Estados de carga
  const isCreating = createMutation.isPending;
  const isUpdating = updateMutation.isPending;
  const isUpdatingPassword = updatePasswordMutation.isPending;
  const isDeleting = softDeleteMutation.isPending;

  // Función para crear usuario
  const createItem = (values: UserCreate, onSuccess?: () => void, onError?: (error: any) => void) => {
    createMutate(
      {
        resource: "users",
        values,
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "users", invalidates: ["list"] });
          setIsCreateModalOpen(false);
          toast.success("Usuario creado exitosamente", {
            description: `El usuario "${values.username}" ha sido creado correctamente.`,
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          const errorMessage = error?.message || "Error desconocido al crear usuario";
          toast.error("Error al crear usuario", {
            description: errorMessage,
            richColors: true,
          });

          // Si es error de autenticación, redirigir al login
          if (errorMessage.includes("Sesión expirada")) {
            setTimeout(() => {
              window.location.href = "/login";
            }, 2000);
          }

          onError?.(error);
        },
      }
    );
  };

  // Función para actualizar usuario (usa UUID como id)
  const updateItem = (id: string, values: UserUpdate, onSuccess?: () => void, onError?: (error: any) => void) => {
    updateMutate(
      {
        resource: "users",
        id,
        values,
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "users", invalidates: ["list"] });
          setIsEditModalOpen(false);
          setEditingItem(null);
          toast.success("Usuario actualizado exitosamente", {
            description: `El usuario ha sido actualizado correctamente.`,
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          const errorMessage = error?.message || "Error desconocido al actualizar usuario";
          toast.error("Error al actualizar usuario", {
            description: errorMessage,
            richColors: true,
          });
          onError?.(error);
        },
      }
    );
  };

  // Función para soft delete (marcar como eliminado) - usa UUID y type "user/uuid"
  const softDeleteItem = (id: string, entityName: string, onSuccess?: () => void, onError?: (error: any) => void) => {
    softDeleteMutate(
      {
        resource: "soft-delete",
        id,
        values: { type: "user/uuid" },
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "users", invalidates: ["all", "list"] });
          toast.success("Usuario movido a papelera", {
            description: `El usuario "${entityName}" ha sido movido a la papelera de reciclaje.`,
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

  // Función para cambiar contraseña de usuario (endpoint especial)
  const updatePassword = (
    id: string,
    passwordData: { current_password?: string; new_password: string },
    onSuccess?: () => void,
    onError?: (error: any) => void
  ) => {
    updatePasswordMutate(
      {
        resource: "users",
        id: `${id}/password`,
        values: passwordData,
        successNotification: false,
        errorNotification: false,
        meta: {
          method: "patch",
        },
        invalidates: [], // No invalida automáticamente
      },
      {
        onSuccess: () => {
          toast.success("Contraseña actualizada", {
            description: "La contraseña ha sido cambiada correctamente.",
            richColors: true,
          });
          onSuccess?.();
        },
        onError: (error) => {
          const errorMessage = error?.message || "Error al cambiar contraseña";
          toast.error("Error al cambiar contraseña", {
            description: errorMessage,
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
    updatePassword,

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
    isUpdatingPassword,
    isDeleting,
  };
};

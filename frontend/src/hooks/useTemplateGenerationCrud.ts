import { useState } from "react";
import { useCreate, useUpdate, useDelete, useList, useCan, useInvalidate } from "@refinedev/core";
import { toast } from "sonner";
import type { TemplateGeneration, TemplateGenerationCreate, TemplateGenerationUpdate } from "@/types/api";

export const useTemplateGenerationCrud = () => {
  // Permisos
  const { data: canAccess } = useCan({ resource: "template-generation", action: "list" });
  const { data: canCreate } = useCan({ resource: "template-generation", action: "create" });
  const { data: canEdit } = useCan({ resource: "template-generation", action: "edit" });
  const { data: canDelete } = useCan({ resource: "template-generation", action: "delete" });

  // Hook de useList para la lista principal
  const { query, result } = useList<TemplateGeneration>({
    resource: "template-generation",
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

  // Hook de invalidación para refrescar datos
  const invalidate = useInvalidate();

  // Estados para formularios
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TemplateGeneration | null>(null);

  // Hook de creación
  const createHook = useCreate<TemplateGenerationCreate>({
    resource: "template-generation",
    mutationOptions: {
      onSuccess: () => {
        toast.success("Plantilla generada exitosamente");
        setIsCreateModalOpen(false);
        invalidate({ invalidates: ["list"], resource: "template-generation" });
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.detail || "Error al generar plantilla");
      },
    },
  });

  // Hook de actualización
  const updateHook = useUpdate<TemplateGenerationUpdate>({
    resource: "template-generation",
    mutationOptions: {
      onSuccess: () => {
        toast.success("Plantilla actualizada exitosamente");
        setIsEditModalOpen(false);
        setEditingItem(null);
        invalidate({ invalidates: ["list"], resource: "template-generation" });
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.detail || "Error al actualizar plantilla");
      },
    },
  });

  // Hook de eliminación (callbacks manejados manualmente por el consumidor)
  const deleteHook = useDelete();

  const createMutation = createHook.mutate;
  const updateMutation = updateHook.mutate;
  const isCreating = (createHook as any).isLoading;
  const isUpdating = (updateHook as any).isLoading;

  // Funciones de CRUD
  const createItem = (data: TemplateGenerationCreate | FormData) => {
    createMutation({ resource: "template-generation", values: data });
  };

  const updateItem = (id: number, data: TemplateGenerationUpdate) => {
    updateMutation({ resource: "template-generation", id, values: data });
  };

  const openCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const openEditModal = (item: TemplateGeneration) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingItem(null);
  };

  return {
    // Datos
    itemsList,
    total,
    isLoading,
    isError,

    // Estados de modales
    isCreateModalOpen,
    isEditModalOpen,
    editingItem,

    // Estados de carga
    isCreating,
    isUpdating,

    // Permisos
    canAccess: canAccess?.can ?? false,
    canCreate: canCreate?.can ?? false,
    canEdit: canEdit?.can ?? false,
    canDelete: canDelete?.can ?? false,

    // Funciones
    createItem,
    updateItem,
    invalidate,
    openCreateModal,
    closeCreateModal,
    openEditModal,
    closeEditModal,
    deleteHook,
  };
};

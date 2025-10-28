import { useState } from "react";
import { useCreate, useUpdate, useDelete, useList, useCan, useInvalidate } from "@refinedev/core";
import { toast } from "sonner";
import type { AcademicLoadFile, AcademicLoadFileCreate, AcademicLoadFileUpdate } from "@/types/api";

export const useAcademicLoadFilesCrud = () => {
  // Permisos
  const { data: canAccess } = useCan({ resource: "academic-load-files", action: "list" });
  const { data: canCreate } = useCan({ resource: "academic-load-files", action: "create" });
  const { data: canEdit } = useCan({ resource: "academic-load-files", action: "edit" });
  const { data: canDelete } = useCan({ resource: "academic-load-files", action: "delete" });

  // Hook de useList para la lista principal
  const { query, result } = useList<AcademicLoadFile>({
    resource: "academic-load-files",
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
  const [editingItem, setEditingItem] = useState<AcademicLoadFile | null>(null);

  // Hook de creación
  const createHook = useCreate<AcademicLoadFileCreate>({
    resource: "academic-load-files",
    mutationOptions: {
      onSuccess: () => {
        toast.success("Archivo subido exitosamente");
        setIsCreateModalOpen(false);
        invalidate({ invalidates: ["list"], resource: "academic-load-files" });
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.detail || "Error al subir archivo");
      },
    },
  });

  // Hook de actualización
  const updateHook = useUpdate<AcademicLoadFileUpdate>({
    resource: "academic-load-files",
    mutationOptions: {
      onSuccess: () => {
        toast.success("Archivo actualizado exitosamente");
        setIsEditModalOpen(false);
        setEditingItem(null);
        invalidate({ invalidates: ["list"], resource: "academic-load-files" });
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.detail || "Error al actualizar archivo");
      },
    },
  });

  // Hook de eliminación
  const deleteHook = useDelete({
    resource: "academic-load-files",
    mutationOptions: {
      onSuccess: () => {
        invalidate({ invalidates: ["list"], resource: "academic-load-files" });
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.detail || "Error al eliminar archivo");
      },
    },
  });

  const createMutation = createHook.mutate;
  const updateMutation = updateHook.mutate;
  const isCreating = (createHook as any).isLoading;
  const isUpdating = (updateHook as any).isLoading;

  // Funciones de CRUD
  const createItem = (data: AcademicLoadFileCreate | FormData) => {
    createMutation({ resource: "academic-load-files", values: data });
  };

  const updateItem = (id: number, data: AcademicLoadFileUpdate) => {
    updateMutation({ resource: "academic-load-files", id, values: data });
  };

  const openCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const openEditModal = (item: AcademicLoadFile) => {
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

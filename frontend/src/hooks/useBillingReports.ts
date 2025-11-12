import { useState } from "react";
import { useList, useCreate, useUpdate, useDelete, useCan, useInvalidate, useDataProvider } from "@refinedev/core";
import { toast } from "sonner";
import type { BillingReport, BillingReportCreate, BillingReportUpdate } from "@/types/api";

export const useBillingReports = (fileId?: number) => {
  const getDataProvider = useDataProvider();

  // Permisos
  const { data: canAccess } = useCan({ resource: "billing-reports", action: "list" });
  const { data: canCreate } = useCan({ resource: "billing-reports", action: "create" });
  const { data: canEdit } = useCan({ resource: "billing-reports", action: "edit" });
  const { data: canDelete } = useCan({ resource: "billing-reports", action: "delete" });

  // Hook de useList - filtrar por fileId si está disponible
  const { query, result } = useList<BillingReport>({
    resource: "billing-reports",
    filters: fileId ? [{ field: "academic_load_file_id", operator: "eq", value: fileId }] : [],
    pagination: {
      currentPage: 1,
      pageSize: 1000,
      mode: "server",
    },
    queryOptions: {
      enabled: (canAccess?.can ?? false) && (fileId !== undefined),
    },
  });

  const itemsList = result?.data || [];
  const total = result?.total || 0;
  const isLoading = query.isLoading;
  const isError = query.isError;

  // Hook de invalidación
  const invalidate = useInvalidate();

  // Estados para modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BillingReport | null>(null);

  // Hook de creación
  const createHook = useCreate<BillingReportCreate>({
    resource: "billing-reports",
    mutationOptions: {
      onSuccess: () => {
        toast.success("Reporte generado exitosamente");
        setIsCreateModalOpen(false);
        invalidate({ invalidates: ["list"], resource: "billing-reports" });
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.detail || "Error al generar reporte");
      },
    },
  });

  // Hook de actualización
  const updateHook = useUpdate<BillingReportUpdate>({
    resource: "billing-reports",
    mutationOptions: {
      onSuccess: () => {
        toast.success("Reporte actualizado exitosamente");
        setIsEditModalOpen(false);
        setEditingItem(null);
        invalidate({ invalidates: ["list"], resource: "billing-reports" });
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.detail || "Error al actualizar reporte");
      },
    },
  });

  // Hook de eliminación
  const deleteHook = useDelete();

  const createMutation = createHook.mutate;
  const updateMutation = updateHook.mutate;
  const isCreating = (createHook as any).isLoading;
  const isUpdating = (updateHook as any).isLoading;

  // Funciones de CRUD
  const createItem = (data: BillingReportCreate) => {
    createMutation({ resource: "billing-reports", values: data });
  };

  const updateItem = (id: number, data: BillingReportUpdate) => {
    updateMutation({ resource: "billing-reports", id, values: data });
  };

  const openCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const openEditModal = (item: BillingReport) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingItem(null);
  };

  // Función para generar reporte desde archivo
  const generateReport = async (academicLoadFileId: number) => {
    try {
      const dataProvider = getDataProvider();
      const response = await dataProvider.custom<BillingReport>({
        url: `/api/v1/academic-load-files/${academicLoadFileId}/billing-report/generate`,
        method: "post",
      });

      toast.success("Reporte generado exitosamente");

      // Invalidar y refrescar la lista
      invalidate({ invalidates: ["list"], resource: "billing-reports" });
      // Refrescar específicamente la lista filtrada por fileId si coincide
      if (fileId === academicLoadFileId && query.refetch) {
        await query.refetch();
      }

      return response.data;
    } catch (error: any) {
      console.error("Error generating report:", error);
      toast.error(error?.response?.data?.detail || "Error al generar reporte");
      throw error;
    }
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
    generateReport,
  };
};

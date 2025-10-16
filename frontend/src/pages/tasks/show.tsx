import React from "react";
import { useShow } from "@refinedev/core";

export const TaskShow = () => {
  const { query } = useShow();
  const { data, isLoading } = query;

  const record = data?.data;

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "Completado";
      case "pending":
        return "Pendiente";
      case "failed":
        return "Fallido";
      default:
        return "Desconocido";
    }
  };

  if (isLoading) {
    return <div className="max-w-4xl mx-auto p-6">Cargando...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Detalles de la Tarea</h1>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-500">ID de la Tarea</label>
              <p className="mt-1 text-sm text-gray-900 font-mono">{record?.id}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500">Mensaje</label>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-md">
                {record?.message}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Estado</label>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(record?.status)}`}>
                {getStatusText(record?.status)}
              </span>
            </div>

            {record?.created_at && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Fecha de Creación</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(record.created_at).toLocaleDateString('es-ES')}
                </p>
              </div>
            )}

            {record?.updated_at && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Fecha de Actualización</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(record.updated_at).toLocaleDateString('es-ES')}
                </p>
              </div>
            )}
          </div>
        </div>
    </div>
  );
};

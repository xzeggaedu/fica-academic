import React from "react";
import { useList } from "@refinedev/core";
import { TableContainer, Table, Thead, Tbody, Tr, Th, Td, Chip } from "./components/ui";

export const TaskList = () => {
  const { result } = useList({
    resource: "tasks",
  });

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

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Tareas</h1>
      <TableContainer>
        <Table>
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Mensaje</Th>
              <Th>Estado</Th>
              <Th>Fecha de Creación</Th>
              <Th>Acciones</Th>
            </Tr>
          </Thead>
          <Tbody>
            {result.data?.map((task: any) => (
              <Tr key={task.id}>
                <Td>{task.id}</Td>
                <Td className="max-w-xs truncate">{task.message}</Td>
                <Td>
                  <Chip className={`px-2 py-1 rounded-full text-xs ${getStatusColor(task.status)}`}>
                    {getStatusText(task.status)}
                  </Chip>
                </Td>
                <Td>{task.created_at ? new Date(task.created_at).toLocaleDateString('es-ES') : "N/A"}</Td>
                <Td>
                  <div className="flex space-x-2">
                    <a href={`/tasks/show/${task.id}`} className="text-blue-600 hover:text-blue-800">Ver</a>
                    <button className="text-red-600 hover:text-red-800">Eliminar</button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </div>
  );
};

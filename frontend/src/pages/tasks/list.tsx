import React from "react";
import { useList } from "@refinedev/core";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/data/table";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

export const TaskList = () => {
  const { result } = useList({
    resource: "tasks",
  });

  const getStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "default"; // Green variant
      case "pending":
        return "secondary"; // Yellow variant
      case "failed":
        return "destructive"; // Red variant
      default:
        return "outline"; // Gray variant
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
      <Card>
        <CardHeader>
          <CardTitle>Tareas</CardTitle>
          <CardDescription>
            Lista de todas las tareas del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Mensaje</TableHead>
                  <TableHead className="text-center w-[100px]">Estado</TableHead>
                  <TableHead>Fecha de Creación</TableHead>
                  <TableHead className="text-center w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data?.map((task: any) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.id}</TableCell>
                    <TableCell className="max-w-xs truncate">{task.message}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(task.status)}>
                        {getStatusText(task.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {task.created_at ? new Date(task.created_at).toLocaleDateString('es-ES') : "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/tasks/show/${task.id}`}>Ver</a>
                        </Button>
                        <Button variant="destructive" size="sm">
                          Eliminar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

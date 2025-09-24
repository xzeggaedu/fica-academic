import React, { useState, useMemo } from "react";
import { useList, CanAccess } from "@refinedev/core";
import { useQueryClient } from "@tanstack/react-query";
import { UserRoleEnum } from "../../types/auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { TableFilters } from "../../components/ui/table-filters";
import { UserActions } from "../../components/ui/user-actions";
import { UserCreateButton } from "../../components/ui/user-create-button";

export const UserList = () => {
  const { query, result } = useList({
    resource: "users",
  });
  const queryClient = useQueryClient();

  // Función para refrescar datos directamente
  const refreshData = async () => {
    console.log("UserList - refreshData called");
    // Refetch todas las queries que contengan "users"
    await queryClient.refetchQueries({
      predicate: (query) => {
        const queryKey = query.queryKey;
        return queryKey.some(key =>
          typeof key === 'string' && key.includes('users')
        );
      }
    });
    console.log("UserList - Data refreshed successfully");
  };

  // Estados para filtros y columnas
  const [searchValue, setSearchValue] = useState("");
  const [visibleColumns, setVisibleColumns] = useState([
    "id", "avatar", "name", "username", "email", "role", "created_at", "actions"
  ]);

  // Debug: Log para verificar los datos
  console.log("UserList - useList query:", query);
  console.log("UserList - useList result:", result);
  console.log("UserList - isLoading:", query.isLoading);
  console.log("UserList - error:", query.error);

  // Debug: Log para verificar el formato de fecha
  if (result.data && result.data.length > 0) {
    console.log("UserList - first user created_at:", result.data[0].created_at);
    console.log("UserList - first user created_at type:", typeof result.data[0].created_at);
  }

  // Configuración de columnas disponibles
  const availableColumns = [
    { key: "id", label: "ID" },
    { key: "avatar", label: "Avatar" },
    { key: "name", label: "Nombre" },
    { key: "username", label: "Usuario" },
    { key: "email", label: "Correo" },
    { key: "role", label: "Rol" },
    { key: "created_at", label: "Fecha de Creación" },
    { key: "actions", label: "Acciones" },
  ];

  // Filtrar datos basado en búsqueda
  const filteredData = useMemo(() => {
    if (!result.data) return [];

    if (!searchValue.trim()) return result.data;

    const searchLower = searchValue.toLowerCase();
    return result.data.filter((user: any) =>
      user.name?.toLowerCase().includes(searchLower) ||
      user.username?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.role?.toLowerCase().includes(searchLower)
    );
  }, [result.data, searchValue]);

  const getRoleVariant = (role: string) => {
    switch (role) {
      case UserRoleEnum.ADMIN:
        return "destructive";
      case UserRoleEnum.DIRECTOR:
        return "secondary";
      case UserRoleEnum.DECANO:
        return "default";
      case UserRoleEnum.VICERRECTOR:
        return "outline";
      case UserRoleEnum.UNAUTHORIZED:
      default:
        return "secondary";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case UserRoleEnum.ADMIN:
        return "Administrador";
      case UserRoleEnum.DIRECTOR:
        return "Director";
      case UserRoleEnum.DECANO:
        return "Decano";
      case UserRoleEnum.VICERRECTOR:
        return "Vicerrector";
      case UserRoleEnum.UNAUTHORIZED:
      default:
        return "No Autorizado";
    }
  };

  // Helper function para formatear fechas
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString);
        return 'Fecha inválida';
      }
      return date.toLocaleDateString('es-ES');
    } catch (error) {
      console.warn('Error parsing date:', dateString, error);
      return 'Error de fecha';
    }
  };

  // Función para alternar visibilidad de columnas
  const handleColumnToggle = (columnKey: string) => {
    setVisibleColumns(prev =>
      prev.includes(columnKey)
        ? prev.filter(col => col !== columnKey)
        : [...prev, columnKey]
    );
  };

  // Función para manejar éxito de operaciones
  const handleSuccess = async () => {
    console.log("UserList - handleSuccess called");
    console.log("UserList - Current data before refresh:", result.data);

    // Refrescar datos directamente
    await refreshData();

    console.log("UserList - Success handled successfully");
  };

  return (
    <CanAccess
      resource="users"
      action="list"
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-800 p-4">
          <h1 className="text-4xl font-bold mb-4">Acceso Denegado</h1>
          <p className="text-lg text-center mb-8">
            No tienes los permisos necesarios para ver esta página.
          </p>
          <p className="text-md text-center text-gray-600">
            Solo los administradores pueden gestionar usuarios.
          </p>
        </div>
      }
    >
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Usuarios</CardTitle>
                <CardDescription>
                  Gestiona todos los usuarios del sistema
                </CardDescription>
              </div>
              <UserCreateButton onSuccess={handleSuccess} />
            </div>
          </CardHeader>
          <CardContent>
            {/* Filtros y controles */}
            <TableFilters
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              visibleColumns={visibleColumns}
              onColumnToggle={handleColumnToggle}
              availableColumns={availableColumns}
            />

            {/* Tabla */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleColumns.includes("id") && <TableHead>ID</TableHead>}
                    {visibleColumns.includes("avatar") && <TableHead>Avatar</TableHead>}
                    {visibleColumns.includes("name") && <TableHead>Nombre</TableHead>}
                    {visibleColumns.includes("username") && <TableHead>Usuario</TableHead>}
                    {visibleColumns.includes("email") && <TableHead>Correo</TableHead>}
                    {visibleColumns.includes("role") && <TableHead>Rol</TableHead>}
                    {visibleColumns.includes("created_at") && <TableHead>Fecha de Creación</TableHead>}
                    {visibleColumns.includes("actions") && <TableHead className="w-[70px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={visibleColumns.length} className="text-center py-8">
                        Cargando usuarios...
                      </TableCell>
                    </TableRow>
                  ) : query.error ? (
                    <TableRow>
                      <TableCell colSpan={visibleColumns.length} className="text-center py-8 text-red-600">
                        Error al cargar usuarios: {query.error.message}
                      </TableCell>
                    </TableRow>
                  ) : filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={visibleColumns.length} className="text-center py-8">
                        {searchValue ? "No se encontraron usuarios que coincidan con la búsqueda" : "No hay usuarios registrados"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((user: any) => (
                      <TableRow key={user.id}>
                        {visibleColumns.includes("id") && (
                          <TableCell className="font-medium">{user.id}</TableCell>
                        )}
                        {visibleColumns.includes("avatar") && (
                          <TableCell>
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.profile_image_url} alt={user.name} />
                              <AvatarFallback>
                                {user.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </TableCell>
                        )}
                        {visibleColumns.includes("name") && (
                          <TableCell>{user.name}</TableCell>
                        )}
                        {visibleColumns.includes("username") && (
                          <TableCell>{user.username}</TableCell>
                        )}
                        {visibleColumns.includes("email") && (
                          <TableCell>{user.email}</TableCell>
                        )}
                        {visibleColumns.includes("role") && (
                          <TableCell>
                            <Badge variant={getRoleVariant(user.role)}>
                              {getRoleLabel(user.role)}
                            </Badge>
                          </TableCell>
                        )}
                        {visibleColumns.includes("created_at") && (
                          <TableCell>
                            {formatDate(user.created_at)}
                          </TableCell>
                        )}
                        {visibleColumns.includes("actions") && (
                          <TableCell>
                            <UserActions
                              userId={user.id}
                              userName={user.name}
                              onSuccess={handleSuccess}
                            />
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Información de resultados */}
            {!query.isLoading && !query.error && (
              <div className="flex items-center justify-between px-2 py-4 text-sm text-muted-foreground">
                <div>
                  Mostrando {filteredData.length} de {result.data?.length || 0} usuarios
                  {searchValue && ` (filtrados por "${searchValue}")`}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CanAccess>
  );
};

import React, { useState, useMemo } from "react";
import { useList, CanAccess, useGetIdentity } from "@refinedev/core";
import { useQueryClient } from "@tanstack/react-query";
import { UserRoleEnum } from "../../types/auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/data/table";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { TableFilters } from "../../components/ui/data/table-filters";
import { UserActions } from "../../components/ui/users/user-actions";
import { UserCreateButton } from "../../components/ui/users/user-create-button";
import { UserViewSheet } from "../../components/ui/users/user-view-sheet";
import { getTableColumnClass } from "../../components/refine-ui/theme/theme-table";

export const UserList = () => {
  const { query, result } = useList({
    resource: "users",
  });
  const queryClient = useQueryClient();
  const { data: identity } = useGetIdentity<{ id: number; username: string }>();

  // Función para refrescar datos directamente
  const refreshData = async () => {
    // Refetch todas las queries que contengan "users"
    await queryClient.refetchQueries({
      predicate: (query) => {
        const queryKey = query.queryKey;
        return queryKey.some(key =>
          typeof key === 'string' && key.includes('users')
        );
      }
    });
  };

  // Estados para filtros y columnas
  const [searchValue, setSearchValue] = useState("");
  const [visibleColumns, setVisibleColumns] = useState([
    "id", "avatar", "name", "username", "email", "role", "created_at", "actions"
  ]);

  // Estado para el sheet de visualización desde la fila
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>("");
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);

  // Debug: Log para verificar los datos

  // Debug: Log para verificar el formato de fecha
  if (result.data && result.data.length > 0) {
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
    // Refrescar datos directamente
    await refreshData();
  };

  // Función para manejar click en la fila
  const handleRowClick = (user: any, event: React.MouseEvent) => {
    // Evitar abrir si se hizo click en la celda de acciones
    const target = event.target as HTMLElement;
    if (target.closest('[data-actions-cell]')) {
      return;
    }

    setSelectedUserId(user.id);
    setSelectedUserName(user.name);
    setIsViewSheetOpen(true);
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
                    {visibleColumns.includes("id") && <TableHead className={getTableColumnClass("id")}>ID</TableHead>}
                    {visibleColumns.includes("avatar") && <TableHead className={getTableColumnClass("avatar")}>Avatar</TableHead>}
                    {visibleColumns.includes("name") && <TableHead className={getTableColumnClass("name")}>Nombre</TableHead>}
                    {visibleColumns.includes("username") && <TableHead className={getTableColumnClass("username")}>Usuario</TableHead>}
                    {visibleColumns.includes("email") && <TableHead className={getTableColumnClass("email")}>Correo</TableHead>}
                    {visibleColumns.includes("role") && <TableHead className={getTableColumnClass("role")}>Rol</TableHead>}
                    {visibleColumns.includes("created_at") && <TableHead className={getTableColumnClass("date")}>Fecha de Creación</TableHead>}
                    {visibleColumns.includes("actions") && <TableHead className={getTableColumnClass("actions")}></TableHead>}
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
                      <TableRow
                        key={user.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={(e) => handleRowClick(user, e)}
                      >
                        {visibleColumns.includes("id") && (
                          <TableCell className={getTableColumnClass("id", "font-medium")}>{user.id}</TableCell>
                        )}
                        {visibleColumns.includes("avatar") && (
                          <TableCell className={getTableColumnClass("avatar")}>
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.profile_image_url} alt={user.name} />
                              <AvatarFallback>
                                {user.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </TableCell>
                        )}
                        {visibleColumns.includes("name") && (
                          <TableCell className={getTableColumnClass("name")}>{user.name}</TableCell>
                        )}
                        {visibleColumns.includes("username") && (
                          <TableCell className={getTableColumnClass("username")}>{user.username}</TableCell>
                        )}
                        {visibleColumns.includes("email") && (
                          <TableCell className={getTableColumnClass("email")}>{user.email}</TableCell>
                        )}
                        {visibleColumns.includes("role") && (
                          <TableCell className={getTableColumnClass("role")}>
                            <Badge variant={getRoleVariant(user.role)}>
                              {getRoleLabel(user.role)}
                            </Badge>
                          </TableCell>
                        )}
                        {visibleColumns.includes("created_at") && (
                          <TableCell className={getTableColumnClass("date")}>
                            {formatDate(user.created_at)}
                          </TableCell>
                        )}
                        {visibleColumns.includes("actions") && (
                          <TableCell className={getTableColumnClass("actions")} data-actions-cell onClick={(e) => e.stopPropagation()}>
                            <UserActions
                              userId={user.id}
                              userName={user.name}
                              userRole={user.role}
                              onSuccess={handleSuccess}
                              isCurrentUser={identity?.id === user.id}
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

      {/* Sheet para ver detalles desde la fila */}
      {selectedUserId && (
        <UserViewSheet
          userId={selectedUserId}
          userName={selectedUserName}
          isOpen={isViewSheetOpen}
          onClose={() => {
            setIsViewSheetOpen(false);
            setSelectedUserId(null);
            setSelectedUserName("");
          }}
        />
      )}
    </CanAccess>
  );
};

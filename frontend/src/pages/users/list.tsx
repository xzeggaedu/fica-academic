import React, { useState, useMemo, useEffect } from "react";
import { useList, CanAccess, useGetIdentity, useCan, useUpdate, useInvalidate, useCreate } from "@refinedev/core";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { Unauthorized } from "../unauthorized";
import { Clock } from "lucide-react";

export const UserList = () => {
  // Verificar permisos primero
  const { data: canAccess } = useCan({
    resource: "users",
    action: "list",
  });

  const { query, result } = useList({
    resource: "users",
    queryOptions: {
      enabled: canAccess?.can ?? false,
    },
    successNotification: false,
    errorNotification: false,
  });

  const users = result.data;

  const queryClient = useQueryClient();
  const { data: identity } = useGetIdentity<{ id: number; username: string }>();

  // Hooks para operaciones CRUD
  const { mutate: softDeleteUser, mutation: deleteState } = useUpdate();
  const { mutate: createUser, mutation: createState } = useCreate();

  const invalidate = useInvalidate();
  const isDeleting = deleteState.isPending;
  const isCreating = createState.isPending;

  // Función para manejar creación de usuario
  const handleCreateUser = (
    userData: {
      name: string;
      username: string;
      email: string;
      password: string;
      profile_image_url: string;
      role: string;
    },
    onSuccessCallback?: () => void
  ) => {
    createUser(
      {
        resource: "users",
        values: userData,
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          // invalidate({
          //   resource: "users",
          //   invalidates: ["all", "list"],
          // });

          toast.success('Usuario creado exitosamente', {
            description: `El usuario "${userData.username}" ha sido creado correctamente.`,
            richColors: true,
          });

          // Llamar al callback de éxito para cerrar el sheet
          if (onSuccessCallback) {
            onSuccessCallback();
          }
        },
        onError: (error) => {
          console.error("UserList - Create error:", error);
          const errorMessage = error?.message || "Error desconocido al crear usuario";

          toast.error('Error al crear usuario', {
            description: errorMessage,
            richColors: true,
          });

          // Si es error de autenticación, redirigir al login
          if (errorMessage.includes("Sesión expirada")) {
            setTimeout(() => {
              window.location.href = "/login";
            }, 2000);
          }
        },
      }
    );
  };

  // Función para manejar eliminación de usuario (soft delete)
  const handleDeleteUser = (userId: string, userName: string) => {
    softDeleteUser(
      {
        resource: "soft-delete",
        id: userId,
        values: { type: "user/uuid" },
        successNotification: false,
      },
      {
        onSuccess: async () => {
          invalidate({
            resource: "users",
            invalidates: ["all", "list"],
          });

          toast.success('Usuario movido a papelera', {
            description: `El usuario "${userName}" ha sido movido a la papelera de reciclaje.`,
            richColors: true,
          });
        },
        onError: (error) => {
          console.error("UserList - Soft delete error:", error);
          toast.error('Error al mover a papelera', {
            description: error.message,
            richColors: true,
          });
        },
      }
    );
  };

  // Estados para filtros y columnas
  const [searchValue, setSearchValue] = useState("");
  const [visibleColumns, setVisibleColumns] = useState([
    "id", "avatar", "name", "username", "email", "role", "created_at", "actions"
  ]);

  // Estado para el sheet de visualización desde la fila
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>("");
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);


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
    if (!users) return [];

    if (!searchValue.trim()) return users;

    const searchLower = searchValue.toLowerCase();
    console.log("users", users);
    return users.filter((user: any) =>
      user.name?.toLowerCase().includes(searchLower) ||
      user.username?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.role?.toLowerCase().includes(searchLower)
    );
  }, [users, searchValue]);

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

  // Helper function para truncar UUID
  const truncateUuid = (uuid: string | undefined) => {
    if (!uuid) return 'N/A';
    return `${uuid.substring(0, 8)}...`;
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
    setIsViewSheetOpen(false);
  };

  // Función para manejar click en la fila
  const handleRowClick = (user: any, event: React.MouseEvent) => {
    // Evitar abrir si se hizo click en la celda de acciones
    const target = event.target as HTMLElement;
    if (target.closest('[data-actions-cell]')) {
      return;
    }

    setSelectedUserId(user.uuid);
    setSelectedUserName(user.name);
    setIsViewSheetOpen(true);
  };

  return (
    <CanAccess
      resource="users"
      action="list"
      fallback={<Unauthorized resourceName="usuarios" message="Solo los administradores pueden gestionar usuarios." />}
    >
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Usuarios</h1>
          </div>
        </div>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Usuarios</CardTitle>
                <CardDescription>
                  Gestiona todos los usuarios del sistema
                </CardDescription>
              </div>
              <UserCreateButton
                onSuccess={handleSuccess}
                onCreate={handleCreateUser}
                isCreating={isCreating}
              />
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
            <div className="overflow-x-auto">
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
                    {visibleColumns.includes("actions") && <TableHead className={`${getTableColumnClass("actions")} w-[40px] max-w-[40px]`}></TableHead>}
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
                        key={user.uuid}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={(e) => handleRowClick(user, e)}
                      >
                        {visibleColumns.includes("id") && (
                          <TableCell className={getTableColumnClass("id", "font-medium")}>{truncateUuid(user.uuid)}</TableCell>
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
                          <TableCell className={`${getTableColumnClass("actions")} w-[40px] max-w-[40px]`} data-actions-cell onClick={(e) => e.stopPropagation()}>
                            <UserActions
                              userId={user.uuid}
                              userName={user.name}
                              userRole={user.role}
                              onSuccess={handleSuccess}
                              isCurrentUser={identity?.id === user.uuid}
                              onDelete={handleDeleteUser}
                              isDeleting={isDeleting}
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

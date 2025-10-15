import React from "react";
import { useShow, CanAccess } from "@refinedev/core";
import { UserRoleEnum } from "../../types/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";

export const UserShow = () => {
  const { query } = useShow();
  const { data, isLoading } = query;

  const record = data?.data;

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

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <CanAccess
      resource="users"
      action="show"
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-800 p-4">
          <h1 className="text-4xl font-bold mb-4">Acceso Denegado</h1>
          <p className="text-lg text-center mb-8">
            No tienes los permisos necesarios para ver usuarios.
          </p>
          <p className="text-md text-center text-gray-600">
            Solo los administradores pueden ver usuarios.
          </p>
        </div>
      }
    >
      <div className="max-w-4xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage
                      src={record?.profile_image_url}
                      alt={record?.name}
                    />
                    <AvatarFallback className="text-lg">
                      {record?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold">{record?.name}</h2>
                    <p className="text-muted-foreground">@{record?.username}</p>
                    <Badge variant={getRoleVariant(record?.role)} className="text-sm">
                      {getRoleLabel(record?.role)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Details */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Detalles del Usuario</CardTitle>
                <CardDescription>
                  Información completa del usuario
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">ID</label>
                    <p className="text-sm font-mono bg-muted p-2 rounded">{record?.id}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Nombre de Usuario</label>
                    <p className="text-sm">{record?.username}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Correo Electrónico</label>
                    <p className="text-sm">{record?.email}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Rol</label>
                    <Badge variant={getRoleVariant(record?.role)}>
                      {getRoleLabel(record?.role)}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Fecha de Creación</label>
                    <p className="text-sm">
                      {record?.created_at ? new Date(record.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>

                  {record?.updated_at && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Fecha de Actualización</label>
                      <p className="text-sm">
                        {new Date(record.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                {record?.profile_image_url && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">URL de Imagen de Perfil</label>
                      <p className="text-sm break-all bg-muted p-2 rounded">{record?.profile_image_url}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </CanAccess>
  );
};

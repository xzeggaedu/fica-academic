import React from "react";
import { UserRoleEnum } from "../../../types/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface UserDetailsProps {
  data: any;
  isLoading: boolean;
  error: any;
}

export function UserDetails({ data, isLoading, error }: UserDetailsProps) {
  const record = data; // ✅ Datos recibidos directamente como prop

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

  // Debug: Log para verificar el estado

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-red-600">Error al cargar los datos del usuario</div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-600">
          No se encontraron datos del usuario
          <br />
          <small>Debug: data = {JSON.stringify(data)}</small>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Profile Card */}
      <Card>
        <CardContent className="pt-0 pb-4">
          <div className="flex flex-col items-center text-center space-y-4">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={record?.profile_image_url}
                alt={record?.name}
              />
              <AvatarFallback className="text-lg">
                {record?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <h2 className="text-xl font-bold">{record?.name}</h2>
              <p className="text-muted-foreground">@{record?.username}</p>
              <Badge variant={getRoleVariant(record?.role)} className="text-sm">
                {getRoleLabel(record?.role)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Usuario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 py-2">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2 flex flex-row">
              <label className="text-sm font-medium text-muted-foreground mr-2">ID:</label>
              <p className="text-sm font-mono">{record?.id}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Nombre de Usuario</label>
              <p className="text-sm">{record?.username}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Correo Electrónico</label>
              <p className="text-sm">{record?.email}</p>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground mr-2">Rol:</label>
              <Badge variant={getRoleVariant(record?.role)}>
                {getRoleLabel(record?.role)}
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Fecha de Creación</label>
              <p className="text-sm">
                {record?.created_at ? new Date(record.created_at).toLocaleDateString('es-ES') : 'N/A'}
              </p>
            </div>

            {record?.updated_at && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Fecha de Actualización</label>
                <p className="text-sm">
                  {new Date(record.updated_at).toLocaleDateString('es-ES')}
                </p>
              </div>
            )}
          </div>

          {record?.profile_image_url && (
            <>
              <Separator />
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">URL de Imagen de Perfil</label>
                <p className="text-sm break-all">{record?.profile_image_url}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import React from "react";
import { UserRoleEnum } from "../../../types/auth";
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
    <div className="space-y-6">
      {/* Profile Section */}
      <div className="space-y-4">
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
      </div>

      {/* Details Section */}
      <Separator />
      <div className="space-y-6">
        <h3 className="text-lg font-semibold flex justify-between items-center">
          <span>Información del Usuario</span>
        </h3>

        <div className="space-y-4">
          <div className="space-y-3">
          <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">ID de Usuario:</label>
              <p className="text-sm">{record?.id}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Nombre de Usuario</label>
              <p className="text-sm">{record?.username}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Correo Electrónico</label>
              <p className="text-sm">{record?.email}</p>
            </div>

          </div>



          <div className="space-y-3">
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
        </div>
      </div>
    </div>
  );
}

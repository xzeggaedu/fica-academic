import React from "react";
import { useForm } from "@refinedev/react-hook-form";
import { useNavigation, CanAccess } from "@refinedev/core";
import { UserRoleEnum } from "../../types/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";

export const UserEdit = () => {
  const { saveButtonProps, formLoading, queryResult, register, formState: { errors } } = useForm();
  const { goBack } = useNavigation();

  const userData = queryResult?.data?.data;

  const roleOptions = [
    { value: UserRoleEnum.UNAUTHORIZED, label: "No Autorizado" },
    { value: UserRoleEnum.ADMIN, label: "Administrador" },
    { value: UserRoleEnum.DIRECTOR, label: "Director" },
    { value: UserRoleEnum.DECANO, label: "Decano" },
    { value: UserRoleEnum.VICERRECTOR, label: "Vicerrector" },
  ];

  return (
    <CanAccess
      resource="users"
      action="edit"
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-800 p-4">
          <h1 className="text-4xl font-bold mb-4">Acceso Denegado</h1>
          <p className="text-lg text-center mb-8">
            No tienes los permisos necesarios para editar usuarios.
          </p>
          <p className="text-md text-center text-gray-600">
            Solo los administradores pueden editar usuarios.
          </p>
        </div>
      }
    >
      <div className="max-w-2xl mx-auto p-0">
        <Card>
          <CardHeader>
            <CardTitle>Editar Usuario</CardTitle>
            <CardDescription>
              Modifica la información del usuario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre Completo *</Label>
                  <Input
                    {...register("name", {
                      required: "Este campo es obligatorio",
                      minLength: { value: 2, message: "El nombre debe tener al menos 2 caracteres" },
                      maxLength: { value: 30, message: "El nombre debe tener máximo 30 caracteres" },
                    })}
                    id="name"
                    type="text"
                    placeholder="Ingrese el nombre completo"
                    defaultValue={userData?.name || ""}
                  />
                  {errors?.name && (
                    <p className="text-sm text-red-600">{errors.name?.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Nombre de Usuario *</Label>
                  <Input
                    {...register("username", {
                      required: "Este campo es obligatorio",
                      minLength: { value: 2, message: "El nombre de usuario debe tener al menos 2 caracteres" },
                      maxLength: { value: 20, message: "El nombre de usuario debe tener máximo 20 caracteres" },
                      pattern: {
                        value: /^[a-z0-9]+$/,
                        message: "El nombre de usuario solo puede contener letras minúsculas y números",
                      },
                    })}
                    id="username"
                    type="text"
                    placeholder="Ingrese el nombre de usuario"
                    defaultValue={userData?.username || ""}
                  />
                  {errors?.username && (
                    <p className="text-sm text-red-600">{errors.username?.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico *</Label>
                <Input
                  {...register("email", {
                    required: "Este campo es obligatorio",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Dirección de correo electrónico inválida",
                    },
                  })}
                  id="email"
                  type="email"
                  placeholder="Ingrese el correo electrónico"
                  defaultValue={userData?.email || ""}
                />
                {errors?.email && (
                  <p className="text-sm text-red-600">{errors.email?.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="profile_image_url">URL de Imagen de Perfil</Label>
                  <Input
                    {...register("profile_image_url", {
                      pattern: {
                        value: /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/,
                        message: "Formato de URL inválido",
                      },
                    })}
                    id="profile_image_url"
                    type="url"
                    placeholder="Ingrese la URL de la imagen de perfil"
                    defaultValue={userData?.profile_image_url || ""}
                  />
                  {errors?.profile_image_url && (
                    <p className="text-sm text-red-600">{errors.profile_image_url?.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Rol *</Label>
                  <Select defaultValue={userData?.role || UserRoleEnum.UNAUTHORIZED}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors?.role && (
                    <p className="text-sm text-red-600">{errors.role?.message}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => goBack()}
                >
                  Cancelar
                </Button>
                <Button
                  {...saveButtonProps}
                  type="submit"
                >
                  Actualizar Usuario
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </CanAccess>
  );
};

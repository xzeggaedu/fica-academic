import React from "react";
import { useForm } from "@refinedev/react-hook-form";
import { CanAccess } from "@refinedev/core";
import { UserRoleEnum } from "../../types/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/forms/input";
import { Label } from "../../components/ui/forms/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/forms/select";

export const UserCreate = () => {
  const { saveButtonProps, register, formState: { errors } } = useForm();

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
      action="create"
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-800 p-4">
          <h1 className="text-4xl font-bold mb-4">Acceso Denegado</h1>
          <p className="text-lg text-center mb-8">
            No tienes los permisos necesarios para crear usuarios.
          </p>
          <p className="text-md text-center text-gray-600">
            Solo los administradores pueden crear usuarios.
          </p>
        </div>
      }
    >
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Crear Usuario</CardTitle>
            <CardDescription>
              Agrega un nuevo usuario al sistema
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
                />
                {errors?.email && (
                  <p className="text-sm text-red-600">{errors.email?.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña *</Label>
                  <Input
                    {...register("password", {
                      required: "Este campo es obligatorio",
                      minLength: { value: 8, message: "La contraseña debe tener al menos 8 caracteres" },
                      pattern: {
                        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                        message: "La contraseña debe contener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial",
                      },
                    })}
                    id="password"
                    type="password"
                    placeholder="Ingrese la contraseña"
                  />
                  {errors?.password && (
                    <p className="text-sm text-red-600">{errors.password?.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Rol *</Label>
                  <Select>
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
                >
                  Cancelar
                </Button>
                <Button
                  {...saveButtonProps}
                  type="submit"
                >
                  Crear Usuario
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </CanAccess>
  );
};

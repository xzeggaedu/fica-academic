import React, { useState } from "react";
import { UserRoleEnum } from "../../types/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserCreateFormProps {
  onSuccess?: () => void;
}

interface FormErrors {
  name?: string;
  username?: string;
  email?: string;
  password?: string;
  confirm_password?: string;
  profile_image_url?: string;
  role?: string;
  submit?: string;
}

export function UserCreateForm({ onSuccess }: UserCreateFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirm_password: "",
    profile_image_url: "",
    role: UserRoleEnum.UNAUTHORIZED,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const roleOptions = [
    { value: UserRoleEnum.UNAUTHORIZED, label: "No Autorizado" },
    { value: UserRoleEnum.ADMIN, label: "Administrador" },
    { value: UserRoleEnum.DIRECTOR, label: "Director" },
    { value: UserRoleEnum.DECANO, label: "Decano" },
    { value: UserRoleEnum.VICERRECTOR, label: "Vicerrector" },
  ];

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Este campo es obligatorio";
    } else if (formData.name.length < 2) {
      newErrors.name = "El nombre debe tener al menos 2 caracteres";
    } else if (formData.name.length > 30) {
      newErrors.name = "El nombre debe tener máximo 30 caracteres";
    }

    if (!formData.username.trim()) {
      newErrors.username = "Este campo es obligatorio";
    } else if (formData.username.length < 2) {
      newErrors.username = "El nombre de usuario debe tener al menos 2 caracteres";
    } else if (formData.username.length > 20) {
      newErrors.username = "El nombre de usuario debe tener máximo 20 caracteres";
    } else if (!/^[a-z0-9]+$/.test(formData.username)) {
      newErrors.username = "El nombre de usuario solo puede contener letras minúsculas y números";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Este campo es obligatorio";
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
      newErrors.email = "Dirección de correo electrónico inválida";
    }

    if (!formData.password.trim()) {
      newErrors.password = "La contraseña es obligatoria";
    } else if (formData.password.length < 8) {
      newErrors.password = "La contraseña debe tener al menos 8 caracteres";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(formData.password)) {
      newErrors.password = "La contraseña debe contener al menos una letra minúscula, una mayúscula, un número y un carácter especial";
    }

    if (!formData.confirm_password.trim()) {
      newErrors.confirm_password = "La confirmación de contraseña es obligatoria";
    } else if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = "Las contraseñas no coinciden";
    }

    if (formData.profile_image_url && !/^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(formData.profile_image_url)) {
      newErrors.profile_image_url = "Formato de URL inválido";
    }

    if (!formData.role) {
      newErrors.role = "Debe seleccionar un rol";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleConfirmCreate = async () => {
    setIsSubmitting(true);
    setShowConfirmDialog(false);

    try {
      const token = localStorage.getItem("fica-access-token");

      if (!token) {
        throw new Error("No hay token de autenticación disponible");
      }

      const url = `http://localhost:8000/api/v1/user/admin`;

      const dataToSend = {
        name: formData.name,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        profile_image_url: formData.profile_image_url || "https://www.profileimageurl.com",
        role: formData.role,
      };

      console.log("UserCreateForm - Creating user:", dataToSend);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expirado o inválido
          localStorage.removeItem("fica-access-token");
          localStorage.removeItem("fica-refresh-token");
          throw new Error("Sesión expirada. Por favor, inicia sesión nuevamente.");
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      console.log("UserCreateForm - Create successful");

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("UserCreateForm - Create error:", err);
      const errorMessage = (err as Error).message;
      setErrors({ submit: errorMessage });

      // Si es error de autenticación, redirigir al login
      if (errorMessage.includes("Sesión expirada")) {
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormErrors, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <>
      <Card className="border-0 shadow-none">
        <CardHeader className="px-4 pb-4">
          <CardTitle className="text-lg font-semibold">Crear Usuario</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Completa todos los campos obligatorios para crear un nuevo usuario.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-sm font-medium">Nombre Completo *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Ingrese el nombre completo"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="h-11"
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">{errors.name}</p>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="username" className="text-sm font-medium">Nombre de Usuario *</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Ingrese el nombre de usuario"
                  value={formData.username}
                  onChange={(e) => handleInputChange("username", e.target.value)}
                  className="h-11"
                />
                {errors.username && (
                  <p className="text-sm text-red-600 mt-1">{errors.username}</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="email" className="text-sm font-medium">Correo Electrónico *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Ingrese el correo electrónico"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="h-11"
              />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="password" className="text-sm font-medium">Contraseña *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Ingrese la contraseña"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  className="h-11"
                />
                {errors.password && (
                  <p className="text-sm text-red-600 mt-1">{errors.password}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Mínimo 8 caracteres con al menos una letra minúscula, una mayúscula, un número y un carácter especial
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="confirm_password" className="text-sm font-medium">Confirmar Contraseña *</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  placeholder="Confirme la contraseña"
                  value={formData.confirm_password}
                  onChange={(e) => handleInputChange("confirm_password", e.target.value)}
                  className="h-11"
                />
                {errors.confirm_password && (
                  <p className="text-sm text-red-600 mt-1">{errors.confirm_password}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="profile_image_url" className="text-sm font-medium">URL de Imagen de Perfil</Label>
                <Input
                  id="profile_image_url"
                  type="url"
                  placeholder="Ingrese la URL de la imagen de perfil"
                  value={formData.profile_image_url}
                  onChange={(e) => handleInputChange("profile_image_url", e.target.value)}
                  className="h-11"
                />
                {errors.profile_image_url && (
                  <p className="text-sm text-red-600 mt-1">{errors.profile_image_url}</p>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="role" className="text-sm font-medium">Rol *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => handleInputChange("role", value)}
                >
                  <SelectTrigger className="h-11">
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
                {errors.role && (
                  <p className="text-sm text-red-600 mt-1">{errors.role}</p>
                )}
              </div>
            </div>

            {errors.submit && (
              <div className="text-sm text-red-600 text-center py-2">{errors.submit}</div>
            )}

            <div className="flex justify-end space-x-4 pt-6">
              <Button
                type="submit"
                className="w-full h-11"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creando..." : "Crear Usuario"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Creación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas crear este usuario?
              Esta acción agregará un nuevo usuario al sistema con los datos proporcionados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCreate}>
              Confirmar Creación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

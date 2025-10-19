import React, { useEffect, useState } from "react";
import { UserRoleEnum } from "../../../types/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/forms/input";
import { Label } from "@/components/ui/forms/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/forms/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useGetIdentity } from "@refinedev/core";

interface UpdateState {
  functionCallback: ((userData: any) => void) | ((passwordData: any) => void) | null;
  payload: any | null;
  enable: boolean;
}

interface UserEditFormProps {
  data: any;
  isLoading: boolean;
  error: any;
  onActiveTabChange?: (activeTab: string) => void;
  setUpdateState: React.Dispatch<React.SetStateAction<UpdateState>>;
}

interface FormErrors {
  name?: string;
  username?: string;
  email?: string;
  profile_image_url?: string;
  role?: string;
  submit?: string;
}

interface PasswordErrors {
  current_password?: string;
  new_password?: string;
  confirm_password?: string;
  submit?: string;
}

export function UserEditForm({
  data,
  isLoading,
  error,
  onActiveTabChange,
  setUpdateState
}: UserEditFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    profile_image_url: "",
    role: UserRoleEnum.UNAUTHORIZED,
  });
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [activeTab, setActiveTab] = useState("profile");

  const { data: currentUser } = useGetIdentity();
  // Comparar usando uuid ya que el backend devuelve uuid, no id
  const isCurrentUser = currentUser?.id === (data?.uuid || data?.id);

  // Notificar al parent cuando cambie la pestaña activa
  useEffect(() => {
    onActiveTabChange?.(activeTab);
  }, [activeTab, onActiveTabChange]);

  // Update form data when data prop changes
  useEffect(() => {
    if (data && data.role) {
      setFormData({
        name: data.name || "",
        username: data.username || "",
        email: data.email || "",
        profile_image_url: data.profile_image_url || "",
        role: data.role,
      });
    }
  }, [data]);

  // Effect para manejar cambios en el formulario de perfil
  useEffect(() => {
    if (activeTab === "profile" && data) {
      const payload: any = {};

      if (formData.name !== (data?.name || "")) {
        payload.name = formData.name;
      }

      if (formData.username !== (data?.username || "")) {
        payload.username = formData.username;
      }

      if (formData.email !== (data?.email || "")) {
        payload.email = formData.email;
      }

      if (formData.profile_image_url !== (data?.profile_image_url || "")) {
        payload.profile_image_url = formData.profile_image_url;
      }

      if (formData.role !== data?.role) {
        payload.role = formData.role;
      }

      // Validar formulario
      const isValid = validateForm();

      // Si hay cambios y es válido, actualizar payload y habilitar; si no, limpiar y deshabilitar
      if (Object.keys(payload).length > 0 && isValid) {
        setUpdateState(prev => ({
          ...prev,
          payload: payload,
          enable: true
        }));
      } else {
        setUpdateState(prev => ({
          ...prev,
          payload: null,
          enable: false
        }));
      }
    }
  }, [formData, activeTab, data, setUpdateState]);

  // Effect para manejar cambios en el formulario de contraseña
  useEffect(() => {
    if (activeTab === "password") {
      const payload: any = {};

      if (passwordData.new_password.trim()) {
        payload.new_password = passwordData.new_password;
      }

      if (isCurrentUser && passwordData.current_password.trim()) {
        payload.current_password = passwordData.current_password;
      }

      // Validar formulario de contraseña
      const isValid = validatePasswordForm();

      // Si hay cambios y es válido, actualizar payload y habilitar; si no, limpiar y deshabilitar
      if (Object.keys(payload).length > 0 && isValid) {
        setUpdateState(prev => ({
          ...prev,
          payload: payload,
          enable: true
        }));
      } else {
        setUpdateState(prev => ({
          ...prev,
          payload: null,
          enable: false
        }));
      }
    }
  }, [passwordData, activeTab, isCurrentUser, setUpdateState]);

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
    } else if (formData.name.length < 1) {
      newErrors.name = "El nombre debe tener al menos 1 carácter";
    } else if (formData.name.length > 50) {
      newErrors.name = "El nombre debe tener máximo 50 caracteres";
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-'\.\(\)]+$/.test(formData.name)) {
      newErrors.name = "El nombre solo puede contener letras, espacios, acentos, guiones, apóstrofes, puntos y paréntesis";
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

    if (formData.profile_image_url && !/^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(formData.profile_image_url)) {
      newErrors.profile_image_url = "Formato de URL inválido";
    }

    if (!formData.role) {
      newErrors.role = "Debe seleccionar un rol";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = () => {
    const newErrors: PasswordErrors = {};

    // Solo requerir contraseña actual si el usuario está editando su propio perfil
    if (isCurrentUser && !passwordData.current_password.trim()) {
      newErrors.current_password = "La contraseña actual es obligatoria";
    }

    if (!passwordData.new_password.trim()) {
      newErrors.new_password = "La nueva contraseña es obligatoria";
    } else if (passwordData.new_password.length < 8) {
      newErrors.new_password = "La nueva contraseña debe tener al menos 8 caracteres";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(passwordData.new_password)) {
      newErrors.new_password = "La nueva contraseña debe contener al menos una letra minúscula, una mayúscula, un número y un carácter especial";
    }

    if (!passwordData.confirm_password.trim()) {
      newErrors.confirm_password = "La confirmación de contraseña es obligatoria";
    } else if (passwordData.new_password !== passwordData.confirm_password) {
      newErrors.confirm_password = "Las contraseñas no coinciden";
    }

    // Solo comparar contraseñas si se proporciona la contraseña actual
    if (isCurrentUser && passwordData.current_password && passwordData.current_password === passwordData.new_password) {
      newErrors.new_password = "La nueva contraseña debe ser diferente a la actual";
    }

    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordInputChange = (field: string, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (passwordErrors[field]) {
      setPasswordErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleInputChange = (field: keyof FormErrors, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
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

  if (!data) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-600">No se encontraron datos del usuario</div>
      </div>
    );
  }

  return (
    <form id="user-edit-form" className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="profile">Perfil</TabsTrigger>
        <TabsTrigger value="password">Contraseña</TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="mt-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Editar Perfil</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Actualiza la información del usuario.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="name" className="text-sm font-medium">Nombre Completo *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Ingrese el nombre completo"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="h-11 mt-3"
              />
              {errors.name && (
                <p className="text-sm text-red-600 mt-1">{errors.name}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Solo letras, espacios, acentos, guiones, apóstrofes, puntos y paréntesis.
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="username" className="text-sm font-medium">Nombre de Usuario *</Label>
              <Input
                id="username"
                type="text"
                placeholder="Ingrese el nombre de usuario"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                className="h-11 mt-3"
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
              className="h-11 mt-3"
            />
            {errors.email && (
              <p className="text-sm text-red-600 mt-1">{errors.email}</p>
            )}
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
                className="h-11 mt-3"
              />
              {errors.profile_image_url && (
                <p className="text-sm text-red-600 mt-1">{errors.profile_image_url}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="role" className={`text-sm font-medium ${isCurrentUser ? "text-gray-600" : ""}`}>
                Rol
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Select
                      key={formData.role || 'default'}
                      value={formData.role}
                      onValueChange={(value) => handleInputChange("role", value)}
                      disabled={isCurrentUser}

                    >
                      <SelectTrigger className="h-11 mt-3">
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
                  </div>
                </TooltipTrigger>
                {isCurrentUser && (
                  <TooltipContent>
                    <p>No puedes cambiar tu propio rol</p>
                  </TooltipContent>
                )}
              </Tooltip>
              {errors.role && (
                <p className="text-sm text-red-600 mt-1">{errors.role}</p>
              )}
            </div>
          </div>

          {errors.submit && (
            <div className="text-sm text-red-600 text-center py-2">{errors.submit}</div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="password" className="mt-6">
        <div id="user-password-form" className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Cambiar Contraseña</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {isCurrentUser
                ? "Actualiza tu contraseña. Se requiere la contraseña actual para verificar tu identidad."
                : "Actualiza la contraseña del usuario. Como administrador, no necesitas la contraseña actual."
              }
            </p>
          </div>

          {/* Solo mostrar campo de contraseña actual si es el usuario editando su propio perfil */}
          {isCurrentUser && (
            <div className="space-y-3">
              <Label htmlFor="current_password" className="text-sm font-medium">Contraseña Actual *</Label>
              <Input
                id="current_password"
                type="password"
                placeholder="Ingrese la contraseña actual"
                value={passwordData.current_password}
                onChange={(e) => handlePasswordInputChange("current_password", e.target.value)}
                className="h-11 mt-3"
              />
              {passwordErrors.current_password && (
                <p className="text-sm text-red-600 mt-1">{passwordErrors.current_password}</p>
              )}
            </div>
          )}

          <div className="space-y-3 mt-6">
            <Label htmlFor="new_password" className="text-sm font-medium">Nueva Contraseña *</Label>
            <Input
              id="new_password"
              type="password"
              placeholder="Ingrese la nueva contraseña"
              value={passwordData.new_password}
              onChange={(e) => handlePasswordInputChange("new_password", e.target.value)}
              className="h-11 mt-3"
            />
            {passwordErrors.new_password && (
              <p className="text-sm text-red-600 mt-1">{passwordErrors.new_password}</p>
            )}
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Mínimo 8 caracteres con al menos una letra minúscula, una mayúscula, un número y un carácter especial
            </p>
          </div>

          <div className="space-y-3 mt-2">
            <Label htmlFor="confirm_password" className="text-sm font-medium">Confirmar Nueva Contraseña *</Label>
            <Input
              id="confirm_password"
              type="password"
              placeholder="Confirme la nueva contraseña"
              value={passwordData.confirm_password}
              onChange={(e) => handlePasswordInputChange("confirm_password", e.target.value)}
              className="h-11 mt-3"
            />
            {passwordErrors.confirm_password && (
              <p className="text-sm text-red-600 mt-1">{passwordErrors.confirm_password}</p>
            )}
          </div>

          {passwordErrors.submit && (
            <div className="text-sm text-red-600 text-center py-2">{passwordErrors.submit}</div>
          )}
        </div>
      </TabsContent>
    </Tabs>
    </form>
  );
}

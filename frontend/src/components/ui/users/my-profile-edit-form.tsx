import { forwardRef, useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/forms/input";
import { Label } from "@/components/ui/forms/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UpdateState {
  functionCallback: ((profileData: any) => void) | ((passwordData: any) => void) | null;
  payload: any | null;
  enable: boolean;
}

interface MyProfileEditFormProps {
  data: any;
  isLoading: boolean;
  error: any;
  onActiveTabChange?: (activeTab: string) => void;
  setUpdateState: React.Dispatch<React.SetStateAction<UpdateState>>;
}

interface MyProfileEditFormRef {
  handleConfirmUpdate: () => void;
}

interface FormErrors {
  name?: string;
  username?: string;
  email?: string;
  profile_image_url?: string;
  submit?: string;
}

interface PasswordErrors {
  current_password?: string;
  new_password?: string;
  confirm_password?: string;
  submit?: string;
}

export const MyProfileEditForm = ({
  data,
  isLoading,
  error,
  onActiveTabChange,
  setUpdateState
}: MyProfileEditFormProps) => {

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    profile_image_url: "",
  });
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [activeTab, setActiveTab] = useState("profile");

  // Siempre es el usuario actual en mi perfil
  const isCurrentUser = true;


  // Notificar al padre cuando cambie el tab activo
  useEffect(() => {
    onActiveTabChange?.(activeTab);
  }, [activeTab, onActiveTabChange]);

  // Cargar datos cuando el componente se monta
  useEffect(() => {
    if (data && !isLoading) {
      setFormData({
        name: data.name || "",
        username: data.username || "",
        email: data.email || "",
        profile_image_url: data.profile_image_url || "",
      });
    }
  }, [data?.name, data?.username, data?.email, data?.profile_image_url, isLoading]);

  // Función para actualizar el estado de perfil con datos específicos
  const updateProfileStateWithData = (currentFormData: typeof formData) => {
    if (activeTab !== "profile" || !data) return;

    const payload: any = {};

    if (currentFormData.name !== (data?.name || "")) {
      payload.name = currentFormData.name;
    }

    if (currentFormData.email !== (data?.email || "")) {
      payload.email = currentFormData.email;
    }

    if (currentFormData.profile_image_url !== (data?.profile_image_url || "")) {
      payload.profile_image_url = currentFormData.profile_image_url;
    }

    // Validar con los datos actuales
    const newErrors: FormErrors = {};
    if (!currentFormData.name.trim()) {
      newErrors.name = "Este campo es obligatorio";
    } else if (currentFormData.name.length < 2) {
      newErrors.name = "El nombre debe tener al menos 2 caracteres";
    }

    if (!currentFormData.email.trim()) {
      newErrors.email = "Este campo es obligatorio";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentFormData.email)) {
      newErrors.email = "Email inválido";
    }

    const isValid = Object.keys(newErrors).length === 0;

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
  };

  // Función para actualizar el estado del perfil (wrapper)
  const updateProfileState = () => {
    updateProfileStateWithData(formData);
  };

  // Función para actualizar el estado de contraseña con datos específicos
  const updatePasswordStateWithData = (currentPasswordData: typeof passwordData) => {
    if (activeTab !== "password") return;

    const payload: any = {};

    if (currentPasswordData.new_password.trim()) {
      payload.new_password = currentPasswordData.new_password;
    }

    if (isCurrentUser && currentPasswordData.current_password.trim()) {
      payload.current_password = currentPasswordData.current_password;
    }

    // Validar con los datos actuales
    const newErrors: PasswordErrors = {};

    if (isCurrentUser && !currentPasswordData.current_password.trim()) {
      newErrors.current_password = "Este campo es obligatorio";
    }

    if (!currentPasswordData.new_password.trim()) {
      newErrors.new_password = "Este campo es obligatorio";
    } else if (currentPasswordData.new_password.trim().length < 6) {
      newErrors.new_password = "La contraseña debe tener al menos 6 caracteres";
    }

    if (!currentPasswordData.confirm_password.trim()) {
      newErrors.confirm_password = "Este campo es obligatorio";
    } else if (currentPasswordData.new_password.trim() !== currentPasswordData.confirm_password.trim()) {
      newErrors.confirm_password = "Las contraseñas no coinciden";
    }

    const isValid = Object.keys(newErrors).length === 0;

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
  };

  // Función para actualizar el estado de contraseña (wrapper)
  const updatePasswordState = () => {
    updatePasswordStateWithData(passwordData);
  };


  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Este campo es obligatorio";
    } else if (formData.name.length < 2) {
      newErrors.name = "El nombre debe tener al menos 2 caracteres";
    } else if (formData.name.length > 30) {
      newErrors.name = "El nombre debe tener máximo 30 caracteres";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Este campo es obligatorio";
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
      newErrors.email = "Dirección de correo electrónico inválida";
    }

    if (formData.profile_image_url && !/^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(formData.profile_image_url)) {
      newErrors.profile_image_url = "Formato de URL inválido";
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
     } else if (passwordData.new_password.length < 6) {
       newErrors.new_password = "La nueva contraseña debe tener al menos 6 caracteres";
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
    const newPasswordData = { ...passwordData, [field]: value };
    setPasswordData(newPasswordData);

    // Clear error when user starts typing
    if (passwordErrors[field]) {
      setPasswordErrors(prev => ({ ...prev, [field]: undefined }));
    }

    // Actualizar estado con los nuevos datos
    updatePasswordStateWithData(newPasswordData);
  };

  const handleInputChange = (field: keyof FormErrors, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }

    // Actualizar estado con los nuevos datos
    updateProfileStateWithData(newFormData);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Limpiar errores al cambiar de tab
    setErrors({});
    setPasswordErrors({});
    // Actualizar estado después de cambiar de tab directamente
    if (value === "profile") {
      updateProfileState();
    } else if (value === "password") {
      updatePasswordState();
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

  if (!isCurrentUser) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-600">No tienes permisos para editar este perfil</div>
      </div>
    );
  }

  return (
     <form id="user-edit-form" className="w-full">
       <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="password">Contraseña</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6 mt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre Completo</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Ingresa tu nombre completo"
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Nombre de Usuario</Label>
              <Input
                id="username"
                type="text"
                value={formData.username}
                disabled
                placeholder="Nombre de usuario"
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                El nombre de usuario no se puede modificar
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="Ingresa tu correo electrónico"
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile_image_url">URL de Imagen de Perfil</Label>
              <Input
                id="profile_image_url"
                type="url"
                value={formData.profile_image_url}
                onChange={(e) => handleInputChange("profile_image_url", e.target.value)}
                placeholder="https://ejemplo.com/imagen.jpg"
                className={errors.profile_image_url ? "border-red-500" : ""}
              />
              {errors.profile_image_url && (
                <p className="text-sm text-red-500">{errors.profile_image_url}</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="password" className="space-y-6 mt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current_password">Contraseña Actual</Label>
              <Input
                id="current_password"
                type="password"
                value={passwordData.current_password}
                onChange={(e) => handlePasswordInputChange("current_password", e.target.value)}
                placeholder="Ingresa tu contraseña actual"
                className={passwordErrors.current_password ? "border-red-500" : ""}
              />
              {passwordErrors.current_password && (
                <p className="text-sm text-red-500">{passwordErrors.current_password}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {isCurrentUser
                  ? "Ingresa tu contraseña actual para confirmar el cambio"
                  : "No se requiere contraseña actual para cambios de administrador"
                }
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_password">Nueva Contraseña</Label>
              <Input
                id="new_password"
                type="password"
                value={passwordData.new_password}
                onChange={(e) => handlePasswordInputChange("new_password", e.target.value)}
                placeholder="Ingresa tu nueva contraseña"
                className={passwordErrors.new_password ? "border-red-500" : ""}
              />
              {passwordErrors.new_password && (
                <p className="text-sm text-red-500">{passwordErrors.new_password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirmar Nueva Contraseña</Label>
              <Input
                id="confirm_password"
                type="password"
                value={passwordData.confirm_password}
                onChange={(e) => handlePasswordInputChange("confirm_password", e.target.value)}
                placeholder="Confirma tu nueva contraseña"
                className={passwordErrors.confirm_password ? "border-red-500" : ""}
              />
              {passwordErrors.confirm_password && (
                <p className="text-sm text-red-500">{passwordErrors.confirm_password}</p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </form>
  );
};

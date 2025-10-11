import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/forms/input";
import { Label } from "@/components/ui/forms/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/forms/select";
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
import { useApiDebug, createApiError, apiRequestWithDebug } from "@/hooks/use-api-debug";
import { ErrorDebugPanel } from "@/components/ui/debug/error-debug-panel";
import { toast } from "sonner";

interface FacultyCreateFormProps {
  onSuccess?: () => void;
  onClose?: () => void;
}

interface FormErrors {
  name?: string;
  acronym?: string;
  is_active?: string;
  submit?: string;
}

export function FacultyCreateForm({ onSuccess, onClose }: FacultyCreateFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    acronym: "",
    is_active: true,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Hook para debug de API
  const { error: apiError, setError: setApiError, clearError, isDevelopment } = useApiDebug();

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Este campo es obligatorio";
    } else if (formData.name.length < 2) {
      newErrors.name = "El nombre debe tener al menos 2 caracteres";
    } else if (formData.name.length > 255) {
      newErrors.name = "El nombre debe tener máximo 255 caracteres";
    }

    if (!formData.acronym.trim()) {
      newErrors.acronym = "Este campo es obligatorio";
    } else if (formData.acronym.length < 2) {
      newErrors.acronym = "El acrónimo debe tener al menos 2 caracteres";
    } else if (formData.acronym.length > 20) {
      newErrors.acronym = "El acrónimo debe tener máximo 20 caracteres";
    } else if (!/^[A-Z]+$/.test(formData.acronym)) {
      newErrors.acronym = "El acrónimo debe contener solo letras mayúsculas";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof FormErrors];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmDialog(false);
    setIsSubmitting(true);
    setErrors({});
    clearError(); // Limpiar errores previos

    try {
      const token = localStorage.getItem('fica-access-token');
      if (!token) {
        const authError = createApiError(
          'No se encontró el token de autenticación',
          undefined,
          'Unauthorized',
          `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_BASE_PATH}/faculty`,
          'POST'
        );
        setApiError(authError);
        setErrors({
          submit: 'No se encontró el token de autenticación'
        });
        return;
      }

      const url = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_BASE_PATH}/faculty`;

      const data = await apiRequestWithDebug(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formData.name,
            acronym: formData.acronym,
            is_active: formData.is_active,
          }),
        },
        (error) => {
          // Callback para manejar errores
          setApiError(error);
          setErrors({
            submit: error.message
          });
        }
      );

      console.log('Facultad creada exitosamente:', data);

      // Mostrar toast de éxito
      toast.success('Facultad creada exitosamente', {
        description: `La facultad "${formData.name}" (${formData.acronym}) ha sido creada correctamente.`,
        richColors: true,
      });

      // Limpiar formulario
      setFormData({
        name: "",
        acronym: "",
        is_active: true,
      });

      // Llamar al callback de éxito
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error al crear facultad:', error);

      // Mostrar toast de error
      toast.error('Error al crear facultad', {
        description: error.message || 'Ocurrió un error al intentar crear la facultad.',
        richColors: true,
      });

      // Si no es un error de API manejado, crear uno
      if (!error.status) {
        const networkError = createApiError(
          error.message || 'Error de conexión',
          undefined,
          'Network Error',
          `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_BASE_PATH}/faculty`,
          'POST'
        );
        setApiError(networkError);
      }

      setErrors({
        submit: error.message || 'Error al crear la facultad'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form id="faculty-create-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Información Básica */}
        <div className="space-y-6">

          {/* Nombre */}
          <div className="space-y-3">
            <Label htmlFor="name" className="text-sm font-medium">
              Nombre <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Ej: Facultad de Ingeniería y Arquitectura"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`h-11 mt-3 ${errors.name ? 'border-red-500' : ''}`}
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Acrónimo */}
          <div className="space-y-3">
            <Label htmlFor="acronym" className="text-sm font-medium">
              Acrónimo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="acronym"
              placeholder="Ej: FICA"
              value={formData.acronym}
              onChange={(e) => handleChange('acronym', e.target.value.toUpperCase())}
              className={`h-11 mt-3 font-mono ${errors.acronym ? 'border-red-500' : ''}`}
              disabled={isSubmitting}
              maxLength={20}
            />
            {errors.acronym && (
              <p className="text-sm text-red-500">{errors.acronym}</p>
            )}
          </div>

          {/* Estado */}
          <div className="space-y-3">
            <Label htmlFor="is_active" className="text-sm font-medium">
              Estado <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.is_active ? "true" : "false"}
              onValueChange={(value) => handleChange('is_active', value === "true")}
              disabled={isSubmitting}
            >
              <SelectTrigger id="is_active" className={`h-11 mt-3 ${errors.is_active ? 'border-red-500' : ''}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Activa</SelectItem>
                <SelectItem value="false">Inactiva</SelectItem>
              </SelectContent>
            </Select>
            {errors.is_active && (
              <p className="text-sm text-red-500">{errors.is_active}</p>
            )}
          </div>
        </div>

        {/* Error de envío */}
        {errors.submit && (
          <div className="p-3">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        {/* Panel de debug de errores */}
        {apiError && isDevelopment && (
          <ErrorDebugPanel
            error={apiError}
            onDismiss={clearError}
            title="Error al Crear Facultad"
          />
        )}

      </form>

      {/* Dialog de confirmación */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar creación de facultad</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas crear la facultad <strong>{formData.name}</strong> ({formData.acronym})?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

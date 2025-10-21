import { useState, useEffect } from "react";
import { useOne } from "@refinedev/core";
import { Input } from "@/components/ui/forms/input";
import { Label } from "@/components/ui/forms/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/forms/select";
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
import { useFacultiesCrud } from "@/hooks/useFacultiesCrud";

interface FacultyEditFormProps {
  facultyId: number;
  onSuccess?: () => void;
  onClose?: () => void;
}

interface FormErrors {
  name?: string;
  acronym?: string;
  is_active?: string;
  submit?: string;
}

export function FacultyEditForm({ facultyId, onSuccess, onClose }: FacultyEditFormProps) {
  // Hook para operaciones CRUD de facultades
  const { updateItem: updateFaculty, isUpdating } = useFacultiesCrud();

  // Refine hook para obtener los datos de la facultad
  const { result: faculty, query: facultyQuery } = useOne({
    resource: "faculty",
    id: facultyId,
    queryOptions: {
      enabled: !!facultyId,
    },
  });

  // Estados
  const [formData, setFormData] = useState({
    name: "",
    acronym: "",
    is_active: true,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Derivar estados de la query
  const isLoading = facultyQuery.isLoading;
  const error = facultyQuery.error?.message || null;

  // Poblar formData cuando se cargan los datos de la facultad
  useEffect(() => {
    if (faculty) {
      setFormData({
        name: faculty.name || "",
        acronym: faculty.acronym || "",
        is_active: faculty.is_active !== undefined ? faculty.is_active : true,
      });
    }
  }, [faculty]);

  // Manejar errores de carga
  useEffect(() => {
    if (error) {
      setErrors({ submit: error });
    }
  }, [error]);

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

  const handleConfirmSubmit = () => {
    setShowConfirmDialog(false);
    setErrors({});

    updateFaculty(
      facultyId,
      {
        name: formData.name,
        acronym: formData.acronym,
        is_active: formData.is_active,
      },
      () => {
        if (onSuccess) {
          onSuccess();
        }
      },
      (error) => {
        setErrors({ submit: error?.message || 'Error al actualizar la facultad' });
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-muted-foreground">Cargando datos de la facultad...</p>
      </div>
    );
  }

  return (
    <>
      <form id="faculty-edit-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Información Básica */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Editar Facultad</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Actualiza la información de la facultad.
            </p>
          </div>

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
              disabled={isUpdating}
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
              disabled={isUpdating}
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
              disabled={isUpdating}
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

      </form>

      {/* Dialog de confirmación */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar actualización de facultad</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas actualizar la facultad <strong>{formData.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit} disabled={isUpdating}>
              {isUpdating ? 'Actualizando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

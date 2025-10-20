import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/forms/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/forms/select";
import { Textarea } from "@/components/ui/forms/textarea";
import { useFacultiesCrud } from "@/hooks/useFacultiesCrud";
import { useProfessorsCrud } from "@/hooks/useProfessorsCrud";

interface CoordinationFormData {
  code: string;
  name: string;
  description: string;
  faculty_id: number | null;
  coordinator_professor_id: number | null;
  is_active: boolean;
}

interface Coordination {
  id: number;
  code: string;
  name: string;
  description: string | null;
  faculty_id: number;
  coordinator_professor_id: number | null;
  is_active: boolean;
  deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string | null;
}

interface Faculty {
  id: number;
  name: string;
  acronym: string;
  is_active: boolean;
}

interface Professor {
  id: number;
  professor_id: string;
  professor_name: string;
  is_active: boolean;
}

interface CoordinationFormSheetProps {
  isOpen: boolean;
  onClose: () => void;
  editingCoordination: Coordination | null;
  formData: CoordinationFormData;
  onFormChange: (data: CoordinationFormData) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function CoordinationFormSheet({
  isOpen,
  onClose,
  editingCoordination,
  formData,
  onFormChange,
  onSubmit,
  isSubmitting,
}: CoordinationFormSheetProps) {
  // Cargar facultades activas solo cuando el sheet está abierto
  const { itemsList: faculties } = useFacultiesCrud({
    isActiveOnly: true,
    enabled: isOpen
  });

  // Cargar profesores activos solo cuando el sheet está abierto
  const { itemsList: professors } = useProfessorsCrud({
    isActiveOnly: true,
    enabled: isOpen
  });

  const isFormValid = formData.code && formData.name && formData.faculty_id;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[500px] sm:max-w-[90vw] flex flex-col">
        <SheetHeader className="flex-shrink-0 px-6">
          <SheetTitle className="text-xl font-bold">
            {editingCoordination ? 'Editar Coordinación' : 'Crear Coordinación'}
          </SheetTitle>
          <SheetDescription>
            {editingCoordination
              ? 'Modifica la información de la coordinación seleccionada.'
              : 'Completa la información para crear una nueva coordinación.'
            }
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-0 px-6 space-y-6">
          {/* Formulario */}
          <div className="space-y-4">
            <div><h2 className="text-md font-bold pb-2 border-b border-gray-200">Información General</h2></div>

            {/* Código y Nombre */}
            <div className="flex gap-4">
              <div className="space-y-2 w-32">
                <label className="text-sm font-medium">Código *</label>
                <Input
                  placeholder="Ej: RED"
                  value={formData.code}
                  onChange={(e) => onFormChange({ ...formData, code: e.target.value.trim().toUpperCase() })}
                  maxLength={10}
                />
              </div>
              <div className="space-y-2 flex-1">
                <label className="text-sm font-medium">Nombre *</label>
                <Input
                  placeholder="Ej: Coordinación de Redes"
                  value={formData.name}
                  onChange={(e) => onFormChange({ ...formData, name: e.target.value.trim() })}
                  maxLength={100}
                />
              </div>
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <Textarea
                placeholder="Área de conocimiento que agrupa la coordinación..."
                value={formData.description}
                onChange={(e) => onFormChange({ ...formData, description: e.target.value.trim() })}
                rows={3}
              />
            </div>

            {/* Relaciones */}
            <div><h2 className="text-md font-bold pt-2 pb-2 border-b border-gray-200">Relaciones</h2></div>

            {/* Facultad */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Facultad *</label>
              <Select
                value={formData.faculty_id?.toString() || undefined}
                onValueChange={(value) => onFormChange({ ...formData, faculty_id: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una facultad" />
                </SelectTrigger>
                <SelectContent>
                  {faculties.map((faculty) => (
                    <SelectItem key={faculty.id} value={faculty.id.toString()}>
                      {faculty.acronym} - {faculty.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Profesor Coordinador */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Coordinador</label>
              <Select
                value={formData.coordinator_professor_id?.toString() || "none"}
                onValueChange={(value) => {
                  onFormChange({
                    ...formData,
                    coordinator_professor_id: value === "none" ? null : parseInt(value)
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un profesor (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin coordinador</SelectItem>
                  {professors
                    .filter((prof) => prof.is_active)
                    .map((professor) => (
                      <SelectItem key={professor.id} value={professor.id.toString()}>
                        {professor.professor_id} - {professor.professor_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Estado */}
            <div><h2 className="text-md font-bold pt-2 pb-2 border-b border-gray-200">Estado</h2></div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => onFormChange({ ...formData, is_active: checked })}
                />
                <label className="text-sm font-medium">Activo</label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer con botones */}
        <div className="flex-shrink-0 px-6 py-4 border-t">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={onSubmit}
              disabled={isSubmitting || !isFormValid}
            >
              {isSubmitting ? 'Guardando...' : (editingCoordination ? 'Actualizar' : 'Crear')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

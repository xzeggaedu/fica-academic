import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/forms/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/forms/select";

interface ProfessorFormData {
  professor_id: string;
  professor_name: string;
  institutional_email: string;
  personal_email: string;
  phone_number: string;
  professor_category: string;
  academic_title: string;
  doctorates: number;
  masters: number;
  is_bilingual: boolean;
  is_paid: boolean;
  is_active: boolean;
}

interface Professor {
  id: number;
  professor_id: string;
  professor_name: string;
  institutional_email: string | null;
  personal_email: string | null;
  phone_number: string | null;
  professor_category: string | null;
  academic_title: string | null;
  doctorates: number;
  masters: number;
  is_bilingual: boolean;
  is_paid: boolean;
  is_active: boolean;
}

interface ProfessorFormSheetProps {
  isOpen: boolean;
  onClose: () => void;
  editingProfessor: Professor | null;
  formData: ProfessorFormData;
  onFormChange: (data: ProfessorFormData) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function ProfessorFormSheet({
  isOpen,
  onClose,
  editingProfessor,
  formData,
  onFormChange,
  onSubmit,
  isSubmitting,
}: ProfessorFormSheetProps) {
  const isFormValid = formData.professor_id && formData.professor_name;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[500px] sm:max-w-[90vw] flex flex-col">
        <SheetHeader className="flex-shrink-0 px-6">
          <SheetTitle className="text-xl font-bold">
            {editingProfessor ? 'Editar Profesor' : 'Crear Profesor'}
          </SheetTitle>
          <SheetDescription>
            {editingProfessor
              ? 'Modifica la información del profesor seleccionado.'
              : 'Completa la información para crear un nuevo profesor.'
            }
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-0 px-6 space-y-6">
          {/* Formulario */}
          <div className="space-y-4">
            <div><h2 className="text-md font-bold pb-2 border-b border-gray-200">General</h2></div>

            {/* Fila 1: Título, Nombre */}
            <div className="flex gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Título</label>
                <Select
                  value={formData.academic_title}
                  onValueChange={(value) => onFormChange({ ...formData, academic_title: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione Título" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ing.">Ing.</SelectItem>
                    <SelectItem value="Lic.">Lic.</SelectItem>
                    <SelectItem value="Dr.">Dr.</SelectItem>
                    <SelectItem value="Arq.">Arq.</SelectItem>
                    <SelectItem value="Tec.">Tec.</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex-1">
                <label className="text-sm font-medium">Nombre *</label>
                <Input
                  placeholder=""
                  value={formData.professor_name}
                  onChange={(e) => onFormChange({ ...formData, professor_name: e.target.value })}
                />
              </div>
            </div>

            {/* Fila 2: Código, Categoría */}
            <div className="flex gap-4 pb-4">
              <div className="space-y-2 flex-1">
                <label className="text-sm font-medium">Código *</label>
                <Input
                  placeholder="Ej: P001"
                  value={formData.professor_id}
                  onChange={(e) => onFormChange({ ...formData, professor_id: e.target.value.toUpperCase() })}
                  maxLength={20}
                />
              </div>
              <div className="space-y-2 flex-2">
                <label className="text-sm font-medium">Categoría</label>
                <Select
                  value={formData.professor_category}
                  onValueChange={(value) => onFormChange({ ...formData, professor_category: value })}
                  className="w-full"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DHC">DHC - Docente Hora Clase</SelectItem>
                    <SelectItem value="ADM">ADM - Administrativo</SelectItem>
                    <SelectItem value="DTC">DTC - Docente Tiempo Completo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contacto */}
            <div><h2 className="text-md font-bold pt-2 pb-2 border-b border-gray-200">Contacto</h2></div>
            <div className="flex flex-col gap-4">
              <div className="space-y-2 flex-1">
                <label className="text-sm font-medium">Teléfono</label>
                <Input
                  placeholder="7777-7777"
                  value={formData.phone_number}
                  onChange={(e) => onFormChange({ ...formData, phone_number: e.target.value })}
                />
              </div>
              <div className="space-y-2 flex-1">
                <label className="text-sm font-medium">Email Institucional</label>
                <Input
                  type="email"
                  className="w-full"
                  placeholder="profesor@utec.edu.sv"
                  value={formData.institutional_email}
                  onChange={(e) => onFormChange({ ...formData, institutional_email: e.target.value })}
                />
              </div>
              <div className="space-y-2 flex-1">
                <label className="text-sm font-medium">Email Personal</label>
                <Input
                  type="email"
                  className="w-full"
                  placeholder="profesor@gmail.com"
                  value={formData.personal_email}
                  onChange={(e) => onFormChange({ ...formData, personal_email: e.target.value })}
                />
              </div>
            </div>

            {/* Grados Académicos */}
            <div className="flex gap-4">
              <div className="space-y-2 w-32">
                <label className="text-sm font-medium">Doctorados</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.doctorates}
                  onChange={(e) => onFormChange({ ...formData, doctorates: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2 w-32">
                <label className="text-sm font-medium">Maestrías</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.masters}
                  onChange={(e) => onFormChange({ ...formData, masters: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Switches */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.is_bilingual}
                  onCheckedChange={(checked) => onFormChange({ ...formData, is_bilingual: checked })}
                />
                <label className="text-sm font-medium">Bilingüe</label>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.is_paid}
                  onCheckedChange={(checked) => onFormChange({ ...formData, is_paid: checked })}
                />
                <label className="text-sm font-medium">Remunerado</label>
              </div>

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
              {isSubmitting ? 'Guardando...' : (editingProfessor ? 'Actualizar' : 'Crear')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

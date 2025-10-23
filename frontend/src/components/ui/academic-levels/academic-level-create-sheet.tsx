import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/forms/input";
import { Label } from "@/components/ui/forms/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/forms/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/forms/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AcademicLevelCreate, AcademicLevel } from "@/types/api";
import { Alert, AlertDescription, AlertTitle } from "../alert";

// Códigos permitidos para niveles académicos
const ALLOWED_CODES = [
  { code: "GDO", name: "Grado Base" },
  { code: "M1", name: "Una Maestría" },
  { code: "M2", name: "Dos o más Maestrías" },
  { code: "DR", name: "Doctorado" },
  { code: "BLG", name: "Bilingüe" },
] as const;

interface AcademicLevelCreateSheetProps {
  isOpen: boolean;
  onClose: () => void;
  newLevel: AcademicLevelCreate;
  onNewLevelChange: (level: AcademicLevelCreate) => void;
  onCreate: () => void;
  isCreating: boolean;
  existingLevels: AcademicLevel[];
}

export function AcademicLevelCreateSheet({
  isOpen,
  onClose,
  newLevel,
  onNewLevelChange,
  onCreate,
  isCreating,
  existingLevels,
}: AcademicLevelCreateSheetProps) {
  const [validationMessage, setValidationMessage] = useState<string>("");

  // Verificar si ya existen 5 niveles académicos (solo niveles activos, no eliminados)
  const activeLevels = existingLevels.filter(level => !level.deleted);
  const isMaxLevelsReached = activeLevels.length >= 5;

  // Obtener códigos ya utilizados (solo niveles activos, no eliminados)
  const usedCodes = existingLevels
    .filter(level => !level.deleted)
    .map(level => level.code);

  // Obtener prioridades ya utilizadas (solo niveles activos, no eliminados)
  const usedPriorities = existingLevels
    .filter(level => !level.deleted)
    .map(level => level.priority);

  // Calcular la prioridad por defecto (siguiente número disponible entre 1-5)
  const getDefaultPriority = () => {
    for (let i = 1; i <= 5; i++) {
      if (!usedPriorities.includes(i)) {
        return i;
      }
    }
    return 1; // Fallback
  };

  // Validar prioridad
  const validatePriority = (priority: number) => {
    if (priority < 1 || priority > 5) {
      setValidationMessage("La prioridad debe estar entre 1 y 5");
      return false;
    }

    if (usedPriorities.includes(priority)) {
      setValidationMessage(`La prioridad ${priority} ya existe. Use un número único.`);
      return false;
    }

    setValidationMessage("");
    return true;
  };

  // Validar código
  const validateCode = (code: string) => {
    if (usedCodes.includes(code)) {
      setValidationMessage(`El código ${code} ya existe. Use un código único.`);
      return false;
    }
    return true;
  };

  // Handler para cambio de código
  const handleCodeChange = (code: string) => {
    const updatedLevel = { ...newLevel, code };
    onNewLevelChange(updatedLevel);
    validateCode(code);
  };

  // Handler para cambio de prioridad
  const handlePriorityChange = (priority: string) => {
    const priorityNum = parseInt(priority);
    const updatedLevel = { ...newLevel, priority: priorityNum };
    onNewLevelChange(updatedLevel);
    validatePriority(priorityNum);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Nuevo Nivel Académico</SheetTitle>
          <SheetDescription>
            Crear una nueva regla de compensación docente
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-4">
          {/* Mensaje si ya existen 5 niveles */}
          {isMaxLevelsReached && (
            <Alert variant="destructive" className="text-xs bg-red-100 border-0">
              <AlertTitle>Límite alcanzado</AlertTitle>
              <AlertDescription className="text-xs">
                Ya existen 5 niveles académicos. No se pueden crear más.
              </AlertDescription>
            </Alert>
          )}

          {/* Código y Prioridad en la misma línea */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código *</Label>
              <Select
                value={newLevel.code}
                onValueChange={handleCodeChange}
                disabled={isMaxLevelsReached}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar código" />
                </SelectTrigger>
                <SelectContent>
                  {ALLOWED_CODES.filter(codeItem => !usedCodes.includes(codeItem.code)).map((codeItem) => (
                    <SelectItem key={codeItem.code} value={codeItem.code}>
                      {codeItem.code} - {codeItem.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridad *</Label>
              <Select
                value={newLevel.priority.toString()}
                onValueChange={handlePriorityChange}
                disabled={isMaxLevelsReached}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar prioridad" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].filter(priority => !usedPriorities.includes(priority)).map((priority) => (
                    <SelectItem key={priority} value={priority.toString()}>
                      {priority} - {priority === 1 ? "Más alta" : priority === 5 ? "Base" : "Media"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mensaje de validación */}
          {validationMessage && (
            <p className="text-xs text-red-500 mt-1">
              {validationMessage}
            </p>
          )}

          <Alert variant="default" className="text-xs alert-info">
            <AlertTitle>Información</AlertTitle>
            <AlertDescription className="text-xs alert-info">
              Solo se pueden crear 5 niveles académicos con códigos específicos: GDO, M1, M2, DR, BLG.
              Cada código y prioridad debe ser único.
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={newLevel.name}
              onChange={(e) => onNewLevelChange({ ...newLevel, name: e.target.value })}
              placeholder="ej: Bilingüe (Clase y Profesor)"
              maxLength={100}
              required
              disabled={isMaxLevelsReached}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={newLevel.description || ""}
              onChange={(e) =>
                onNewLevelChange({ ...newLevel, description: e.target.value })
              }
              placeholder="Descripción opcional del nivel académico"
              rows={3}
              disabled={isMaxLevelsReached}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={newLevel.is_active}
              onCheckedChange={(checked) =>
                onNewLevelChange({ ...newLevel, is_active: checked })
              }
              disabled={isMaxLevelsReached}
            />
            <Label htmlFor="is_active">Activo</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating || isMaxLevelsReached}>
              {isCreating ? "Creando..." : "Crear Nivel"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

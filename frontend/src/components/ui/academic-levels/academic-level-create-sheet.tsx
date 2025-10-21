import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/forms/input";
import { Label } from "@/components/ui/forms/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/forms/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AcademicLevelCreate } from "@/types/api";

interface AcademicLevelCreateSheetProps {
  isOpen: boolean;
  onClose: () => void;
  newLevel: AcademicLevelCreate;
  onNewLevelChange: (level: AcademicLevelCreate) => void;
  onCreate: () => void;
  isCreating: boolean;
}

export function AcademicLevelCreateSheet({
  isOpen,
  onClose,
  newLevel,
  onNewLevelChange,
  onCreate,
  isCreating,
}: AcademicLevelCreateSheetProps) {
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
          <div className="space-y-2">
            <Label htmlFor="code">Código *</Label>
            <Input
              id="code"
              value={newLevel.code}
              onChange={(e) =>
                onNewLevelChange({ ...newLevel, code: e.target.value.toUpperCase() })
              }
              placeholder="ej: BLG, DR, GDO"
              maxLength={10}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={newLevel.name}
              onChange={(e) => onNewLevelChange({ ...newLevel, name: e.target.value })}
              placeholder="ej: Bilingüe (Clase y Profesor)"
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Prioridad *</Label>
            <Input
              id="priority"
              type="number"
              min="1"
              max="5"
              value={newLevel.priority}
              onChange={(e) =>
                onNewLevelChange({ ...newLevel, priority: parseInt(e.target.value) })
              }
              placeholder="1-5"
              required
            />
            <p className="text-xs text-muted-foreground">
              5 = Muy Alta, 4 = Alta, 3 = Media, 2 = Baja, 1 = Base
            </p>
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
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={newLevel.is_active}
              onCheckedChange={(checked) =>
                onNewLevelChange({ ...newLevel, is_active: checked })
              }
            />
            <Label htmlFor="is_active">Activo</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Creando..." : "Crear Nivel"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

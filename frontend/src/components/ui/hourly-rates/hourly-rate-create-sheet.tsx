import React from "react";
import { TrendingUp, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/forms/input";
import { Label } from "@/components/ui/forms/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/forms/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { HourlyRateHistoryCreate, AcademicLevel } from "@/types/api";

interface HourlyRateCreateSheetProps {
  isOpen: boolean;
  onClose: () => void;
  newRate: HourlyRateHistoryCreate;
  onNewRateChange: (rate: HourlyRateHistoryCreate) => void;
  onCreate: () => void;
  isCreating: boolean;
  academicLevels: AcademicLevel[];
}

export function HourlyRateCreateSheet({
  isOpen,
  onClose,
  newRate,
  onNewRateChange,
  onCreate,
  isCreating,
  academicLevels,
}: HourlyRateCreateSheetProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Nuevo Aumento Salarial
          </SheetTitle>
          <SheetDescription>
            Crear una nueva tarifa. La tarifa anterior se cerrará automáticamente.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-4">
          <div className="space-y-2">
            <Label htmlFor="level_id">Nivel Académico *</Label>
            <Select
              value={newRate.level_id.toString()}
              onValueChange={(value) =>
                onNewRateChange({ ...newRate, level_id: parseInt(value) })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar nivel académico" />
              </SelectTrigger>
              <SelectContent>
                {academicLevels
                  .sort((a, b) => b.priority - a.priority)
                  .map((level) => (
                    <SelectItem key={level.id} value={level.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Badge className="text-xs">{level.code}</Badge>
                        <span>{level.name}</span>
                        <span className="text-xs text-muted-foreground">
                          (Prioridad: {level.priority})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rate_per_hour">Tarifa por Hora (USD) *</Label>
            <Input
              id="rate_per_hour"
              type="number"
              step="0.01"
              min="0.01"
              value={newRate.rate_per_hour || ""}
              onChange={(e) =>
                onNewRateChange({ ...newRate, rate_per_hour: parseFloat(e.target.value) || 0 })
              }
              placeholder="15.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="start_date">Fecha de Inicio de Vigencia *</Label>
            <Input
              id="start_date"
              type="date"
              value={newRate.start_date}
              onChange={(e) =>
                onNewRateChange({ ...newRate, start_date: e.target.value })
              }
              required
            />
            <p className="text-sm text-muted-foreground">
              La tarifa anterior se cerrará automáticamente el día antes
            </p>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex gap-2">
              <TrendingUp className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                  Aumento Salarial
                </p>
                <p className="text-yellow-700 dark:text-yellow-300">
                  Esta acción cerrará automáticamente la tarifa vigente anterior y
                  creará una nueva tarifa activa desde la fecha especificada.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isCreating} className="flex-1">
              <DollarSign className="h-4 w-4 mr-2" />
              Crear Aumento
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isCreating}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

import React, { useState, useEffect } from "react";
import { TrendingUp, DollarSign, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/forms/input";
import { Label } from "@/components/ui/forms/label";
import { Badge } from "@/components/ui/badge";
import { getCurrentGMT6Date, validateSameDayRate } from "@/utils/timezone";
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { HourlyRateHistoryCreate, AcademicLevel, HourlyRateHistory } from "@/types/api";

interface HourlyRateCreateSheetProps {
  isOpen: boolean;
  onClose: () => void;
  newRate: HourlyRateHistoryCreate;
  onNewRateChange: (rate: HourlyRateHistoryCreate) => void;
  onCreate: () => void;
  isCreating: boolean;
  academicLevels: AcademicLevel[];
  hourlyRates: HourlyRateHistory[];
}

export function HourlyRateCreateSheet({
  isOpen,
  onClose,
  newRate,
  onNewRateChange,
  onCreate,
  isCreating,
  academicLevels,
  hourlyRates,
}: HourlyRateCreateSheetProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate();
  };

  // Función para obtener información sobre la última tarifa del nivel seleccionado
  const getLastRateInfo = () => {
    if (!newRate.level_id) return null;

    try {
      // Validar si ya existe una tarifa para el mismo nivel el mismo día
      const sameDayValidation = validateSameDayRate(
        hourlyRates,
        newRate.level_id,
        newRate.start_date,
        academicLevels
      );

      if (!sameDayValidation.isValid) {
        return {
          canCreate: false,
          error: sameDayValidation.message,
          existingRate: sameDayValidation.existingRate
        };
      }

      return {
        canCreate: true
      };
    } catch (error) {
      console.error('Error in getLastRateInfo:', error);
      return {
        canCreate: false,
        error: "Error al validar tarifas existentes"
      };
    }
  };

  const [lastRateInfo, setLastRateInfo] = useState<any>(null);

  // Effect para calcular la información de la última tarifa cuando cambia el nivel académico
  useEffect(() => {
    if (newRate.level_id) {
      const info = getLastRateInfo();
      setLastRateInfo(info);
    } else {
      setLastRateInfo(null);
    }
  }, [newRate.level_id, newRate.start_date, hourlyRates]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Nuevo Tarifa
          </SheetTitle>
          <SheetDescription>
            Crear una nueva tarifa. La tarifa anterior se cerrará automáticamente.
          </SheetDescription>
        </SheetHeader>

        <form id="hourly-rate-form" onSubmit={handleSubmit} className="space-y-4 px-6 pb-4">
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
                  .sort((a, b) => a.priority - b.priority)
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

          {/* Advertencia sobre tiempo mínimo */}
          {lastRateInfo && !lastRateInfo.error && (
            <div className={`p-3 rounded-lg border ${lastRateInfo.canCreate
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
              }`}>
              <div className="flex items-start gap-2">
                <DollarSign className={`h-4 w-4 mt-0.5 ${lastRateInfo.canCreate
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-yellow-600 dark:text-yellow-400'
                  }`} />
                <div className="text-sm">
                  {lastRateInfo.canCreate ? (
                    <div className="text-green-800 dark:text-green-200">
                      ✅ Puede crear una nueva tarifa para este nivel académico.
                      <br />
                      <span className="text-xs text-green-600 dark:text-green-400">
                        Listo para crear nueva tarifa.
                      </span>
                    </div>
                  ) : (
                    <div className="text-yellow-800 dark:text-yellow-200">
                      ⏰ No se puede crear tarifa duplicada.
                      <br />
                      <span className="text-xs text-yellow-600 dark:text-yellow-400">
                        Listo para crear nueva tarifa.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Mensaje de error separado */}
          {lastRateInfo && lastRateInfo.error && (
            <div className="p-3 rounded-lg border bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <div className="flex items-start gap-2">
                <div className="text-sm text-red-800 dark:text-red-200">
                  <div className="flex items-center gap-2 font-semibold mb-1">
                    <AlertCircle className="h-4 w-4 mt-0.5 text-red-600 dark:text-red-400" />
                    <span>No se puede crear la tarifa</span>
                  </div>
                  <div>{lastRateInfo.error}</div>
                  <div className="flex items-start gap-2 mt-2 text-xs text-red-600 dark:text-red-400 pt-2 border-t border-red-200 dark:border-red-800">
                    <div className="mt-0.5">💡</div><div><strong>Solución:</strong> Cambie a otro nivel académico o elimine la tarifa existente desde la lista principal.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

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
              disabled={lastRateInfo && lastRateInfo.error}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="start_date">Fecha de Inicio de Vigencia *</Label>
            <Input
              id="start_date"
              type="date"
              value={newRate.start_date || getCurrentGMT6Date()}
              onChange={(e) =>
                onNewRateChange({ ...newRate, start_date: e.target.value })
              }
              required
              disabled={lastRateInfo && lastRateInfo.error}
            />
            <p className="text-sm text-muted-foreground">
              La tarifa anterior se cerrará automáticamente 1 segundo antes
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
        </form>

        <SheetFooter className="flex-shrink-0 flex flex-row justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isCreating}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="hourly-rate-form"
            disabled={isCreating || (lastRateInfo && lastRateInfo.error)}
          >
            Crear Tarifa
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

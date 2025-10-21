import React, { useState, useEffect } from "react";
import { DollarSign, Plus, TrendingUp, Calendar, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/forms/input";
import { Label } from "@/components/ui/forms/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/data/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Unauthorized } from "../unauthorized";
import { useHourlyRatesCrud } from "@/hooks/useHourlyRatesCrud";
import { useAcademicLevelsCrud } from "@/hooks/useAcademicLevelsCrud";
import type { HourlyRateHistory, HourlyRateHistoryCreate, AcademicLevel } from "@/types/api";
import { HourlyRateCreateSheet } from "@/components/ui/hourly-rates";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/forms/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function HourlyRatesList() {
  const {
    canAccess,
    canCreate,
    canEdit,
    itemsList: hourlyRates,
    total,
    isLoading,
    isError,
    createRate,
    updateRate,
    isCreating,
    isUpdating,
  } = useHourlyRatesCrud();

  const { itemsList: academicLevels, isLoading: loadingLevels } = useAcademicLevelsCrud({
    isActiveOnly: true,
  });

  // Estados locales
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [newRate, setNewRate] = useState<HourlyRateHistoryCreate>({
    level_id: 0,
    rate_per_hour: 0,
    start_date: new Date().toISOString().split("T")[0],
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  // Agrupar tarifas por nivel académico
  const groupedRates = hourlyRates.reduce((acc, rate) => {
    const levelId = rate.level_id;
    if (!acc[levelId]) {
      acc[levelId] = [];
    }
    acc[levelId].push(rate);
    return acc;
  }, {} as Record<number, HourlyRateHistory[]>);

  // Función para obtener el nombre del nivel académico
  const getLevelName = (levelId: number): string => {
    const level = academicLevels.find((l) => l.id === levelId);
    return level ? `${level.code} - ${level.name}` : `Nivel ${levelId}`;
  };

  // Función para obtener el código del nivel académico
  const getLevelCode = (levelId: number): string => {
    const level = academicLevels.find((l) => l.id === levelId);
    return level?.code || `L${levelId}`;
  };

  // Función para obtener la prioridad del nivel académico
  const getLevelPriority = (levelId: number): number => {
    const level = academicLevels.find((l) => l.id === levelId);
    return level?.priority || 0;
  };

  // Función para crear nueva tarifa (Aumento Salarial)
  const handleCreate = () => {
    // Validaciones
    if (!newRate.level_id || newRate.level_id === 0) {
      toast.error("Error de validación", {
        description: "Debe seleccionar un nivel académico",
        richColors: true,
      });
      return;
    }

    if (newRate.rate_per_hour <= 0) {
      toast.error("Tarifa inválida", {
        description: "La tarifa debe ser mayor que cero",
        richColors: true,
      });
      return;
    }

    if (!newRate.start_date) {
      toast.error("Fecha requerida", {
        description: "Debe especificar la fecha de inicio",
        richColors: true,
      });
      return;
    }

    createRate(newRate, () => {
      setIsCreateSheetOpen(false);
      setNewRate({
        level_id: 0,
        rate_per_hour: 0,
        start_date: new Date().toISOString().split("T")[0],
      });
    });
  };

  // Función para manejar edición inline
  const handleEdit = (id: number, field: string, value: string | number) => {
    setEditingId(id);
    setEditingField(field);
    setEditingValue(String(value));
  };

  // Función para guardar edición inline (Corrección Administrativa)
  const handleSaveEdit = (id: number, field: string, value: string) => {
    const rate = hourlyRates.find((r) => r.id === id);
    if (!rate) return;

    const updateData: any = {};

    if (field === "rate_per_hour") {
      const rateValue = parseFloat(value);
      if (isNaN(rateValue) || rateValue <= 0) {
        toast.error("Tarifa inválida", {
          description: "La tarifa debe ser un número mayor que cero",
          richColors: true,
        });
        return;
      }
      updateData.rate_per_hour = rateValue;
    } else if (field === "start_date" || field === "end_date") {
      updateData[field] = value || null;
    }

    updateRate(id, updateData, () => {
      setEditingId(null);
      setEditingField(null);
      setEditingValue("");
    });
  };

  if (!canAccess?.can) {
    return <Unauthorized />;
  }

  if (isError) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Error al cargar tarifas horarias</h1>
        <p className="text-red-500">Ha ocurrido un error al cargar los datos.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tarifas Horarias</h1>
          <p className="text-muted-foreground">
            Motor de compensación docente - Historial financiero
          </p>
        </div>
        {canCreate?.can && (
          <Button onClick={() => setIsCreateSheetOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Aumento Salarial
          </Button>
        )}
      </div>

      {/* Información de contexto */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Niveles Académicos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{academicLevels.length}</div>
            <p className="text-xs text-muted-foreground">Niveles configurados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Tarifas Vigentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {hourlyRates.filter((r) => r.end_date === null).length}
            </div>
            <p className="text-xs text-muted-foreground">Tarifas activas actualmente</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Registros Históricos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground">Total de registros</p>
          </CardContent>
        </Card>
      </div>

      {/* Vista agrupada por nivel académico */}
      <div className="space-y-6">
        {Object.keys(groupedRates)
          .sort(
            (a, b) => getLevelPriority(parseInt(b)) - getLevelPriority(parseInt(a))
          )
          .map((levelIdStr) => {
            const levelId = parseInt(levelIdStr);
            const rates = groupedRates[levelId];
            const currentRate = rates.find((r) => r.end_date === null);

            return (
              <Card key={levelId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className="text-lg px-3 py-1">
                        {getLevelCode(levelId)}
                      </Badge>
                      <div>
                        <CardTitle className="text-xl">{getLevelName(levelId)}</CardTitle>
                        {currentRate && (
                          <CardDescription className="text-lg font-semibold text-green-600">
                            <DollarSign className="h-4 w-4 inline" />
                            ${parseFloat(currentRate.rate_per_hour).toFixed(2)} / hora (VIGENTE)
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-sm">
                      Prioridad: {getLevelPriority(levelId)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Tarifa/Hora</TableHead>
                        <TableHead>Fecha Inicio</TableHead>
                        <TableHead>Fecha Fin</TableHead>
                        <TableHead className="text-center">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rates
                        .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
                        .map((rate) => (
                          <TableRow key={rate.id}>
                            <TableCell className="font-medium">{rate.id}</TableCell>
                            <TableCell>
                              {editingId === rate.id && editingField === "rate_per_hour" ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onBlur={() => handleSaveEdit(rate.id, "rate_per_hour", editingValue)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleSaveEdit(rate.id, "rate_per_hour", editingValue);
                                    }
                                    if (e.key === "Escape") {
                                      setEditingId(null);
                                      setEditingField(null);
                                      setEditingValue("");
                                    }
                                  }}
                                  autoFocus
                                  className="h-8 w-32"
                                />
                              ) : (
                                <span
                                  className="cursor-pointer hover:bg-muted px-2 py-1 rounded font-mono"
                                  onClick={() =>
                                    canEdit?.can && handleEdit(rate.id, "rate_per_hour", rate.rate_per_hour)
                                  }
                                >
                                  ${parseFloat(rate.rate_per_hour).toFixed(2)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {editingId === rate.id && editingField === "start_date" ? (
                                <Input
                                  type="date"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onBlur={() => handleSaveEdit(rate.id, "start_date", editingValue)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleSaveEdit(rate.id, "start_date", editingValue);
                                    }
                                    if (e.key === "Escape") {
                                      setEditingId(null);
                                      setEditingField(null);
                                      setEditingValue("");
                                    }
                                  }}
                                  autoFocus
                                  className="h-8"
                                />
                              ) : (
                                <span
                                  className="cursor-pointer hover:bg-muted px-2 py-1 rounded"
                                  onClick={() =>
                                    canEdit?.can && handleEdit(rate.id, "start_date", rate.start_date)
                                  }
                                >
                                  {new Date(rate.start_date).toLocaleDateString()}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {editingId === rate.id && editingField === "end_date" ? (
                                <Input
                                  type="date"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onBlur={() => handleSaveEdit(rate.id, "end_date", editingValue)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleSaveEdit(rate.id, "end_date", editingValue);
                                    }
                                    if (e.key === "Escape") {
                                      setEditingId(null);
                                      setEditingField(null);
                                      setEditingValue("");
                                    }
                                  }}
                                  autoFocus
                                  className="h-8"
                                />
                              ) : (
                                <span
                                  className="cursor-pointer hover:bg-muted px-2 py-1 rounded"
                                  onClick={() =>
                                    canEdit?.can && handleEdit(rate.id, "end_date", rate.end_date || "")
                                  }
                                >
                                  {rate.end_date ? new Date(rate.end_date).toLocaleDateString() : "-"}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {rate.end_date === null ? (
                                <Badge className="bg-green-500">VIGENTE</Badge>
                              ) : (
                                <Badge variant="outline">HISTÓRICO</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* Sheet para crear nuevo aumento salarial */}
      <HourlyRateCreateSheet
        isOpen={isCreateSheetOpen}
        onClose={() => setIsCreateSheetOpen(false)}
        newRate={newRate}
        onNewRateChange={setNewRate}
        onCreate={handleCreate}
        isCreating={isCreating}
        academicLevels={academicLevels}
      />
    </div>
  );
}

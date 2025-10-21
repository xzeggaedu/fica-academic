import React, { useState } from "react";
import { DollarSign, Plus, Trash2 } from "lucide-react";
import { CanAccess } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/data/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Unauthorized } from "../unauthorized";
import { useHourlyRatesCrud } from "@/hooks/useHourlyRatesCrud";
import { useAcademicLevelsCrud } from "@/hooks/useAcademicLevelsCrud";
import type { HourlyRateHistory, HourlyRateHistoryCreate } from "@/types/api";
import { formatDateTimeForDisplay, convertDateInputToUTCDateTime, getCurrentGMT6Date, validateSameDayRate, wasCreatedToday } from "@/utils/timezone";
import { HourlyRateCreateSheet } from "@/components/ui/hourly-rates";
import { HardDeleteConfirmDialog } from "@/components/ui/hard-delete-confirm-dialog";

const PRIORITY_BORDER_COLORS: Record<number, string> = {
  1: "border-purple-500 text-purple-700",
  2: "border-blue-500 text-blue-700",
  3: "border-green-500 text-green-700",
  4: "border-yellow-500 text-yellow-700",
  5: "border-gray-500 text-gray-700",
};

const PRIORITY_LABELS: Record<number, string> = {
  1: "Muy Alta",
  2: "Alta",
  3: "Media",
  4: "Baja",
  5: "Base",
};

export function HourlyRatesList() {
  const {
    canCreate,
    itemsList: hourlyRates,
    isError,
    createItem,
    deleteItem,
    isCreating,
    isDeleting,
  } = useHourlyRatesCrud();

  const { itemsList: academicLevels } = useAcademicLevelsCrud({
    isActiveOnly: true,
  });

  // Estados locales
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [newRate, setNewRate] = useState<HourlyRateHistoryCreate>({
    level_id: 0,
    rate_per_hour: 0,
    start_date: getCurrentGMT6Date(), // GMT-6 date para display
  });

  // Estados para modal de eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rateToDelete, setRateToDelete] = useState<{ id: number; levelName: string; rate: string } | null>(null);


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
  const handleCreate = async () => {
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

    // Validar que no exista una tarifa del mismo nivel el mismo día
    const sameDayValidation = validateSameDayRate(
      hourlyRates,
      newRate.level_id,
      newRate.start_date,
      academicLevels
    );

    if (!sameDayValidation.isValid) {
      toast.error("Tarifa duplicada", {
        description: sameDayValidation.message,
        richColors: true,
      });
      return;
    }

    try {
      // Convert GMT-6 datetime to UTC with current server time before sending to server
      const rateToSend = {
        ...newRate,
        start_date: await convertDateInputToUTCDateTime(newRate.start_date),
      };

      createItem(rateToSend, () => {
        setIsCreateSheetOpen(false);
        setNewRate({
          level_id: 0,
          rate_per_hour: 0,
          start_date: getCurrentGMT6Date(), // GMT-6 date para display
        });
      });
    } catch (error) {
      console.error('Error creating hourly rate:', error);
      toast.error("Error al crear tarifa", {
        description: "No se pudo obtener la hora del servidor",
        richColors: true,
      });
    }
  };

  // Función para abrir el modal de eliminación
  const openDeleteDialog = (id: number, levelName: string, rate: string) => {
    setRateToDelete({ id, levelName, rate });
    setDeleteDialogOpen(true);
  };

  // Función para confirmar la eliminación
  const handleConfirmDelete = async () => {
    if (!rateToDelete) return;
    const { id } = rateToDelete;

    deleteItem(id, () => {
      setDeleteDialogOpen(false);
      setRateToDelete(null);
    });
  };

  // Calcular estadísticas
  const activeRates = hourlyRates.filter(rate => rate.end_date === null).length;
  const historicalRates = hourlyRates.filter(rate => rate.end_date !== null).length;

  if (isError) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Error al cargar tarifas horarias</h1>
        <p className="text-red-500">Ha ocurrido un error al cargar los datos.</p>
      </div>
    );
  }

  return (
    <CanAccess
      resource="hourly-rates"
      action="list"
      fallback={<Unauthorized resourceName="usuarios" message="Solo los administradores pueden gestionar usuarios." />}
    >
      <div className="container mx-auto py-6 space-y-6 max-w-[98%]">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Tarifas Horarias</h1>
            <p className="text-muted-foreground">
              Motor de compensación docente - Historial financiero
            </p>
          </div>
          {canCreate?.can && (
            <Button onClick={() => setIsCreateSheetOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Tarifa Horaria
            </Button>
          )}
        </div>

        {/* Información de contexto */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="gap-2">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-medium">Niveles Académicos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold">{academicLevels.length}</div>
              <p className="text-xs text-muted-foreground">Niveles configurados</p>
            </CardContent>
          </Card>
          <Card className="gap-2">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-medium">Tarifas Vigentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold">{activeRates}</div>
              <p className="text-xs text-muted-foreground">Tarifas activas actualmente</p>
            </CardContent>
          </Card>
          <Card className="gap-2">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-medium">Registros Históricos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold">{historicalRates}</div>
              <p className="text-xs text-muted-foreground">Registros con fecha fin</p>
            </CardContent>
          </Card>
        </div>

        {/* Vista agrupada por nivel académico */}
        <div className="space-y-6">
          {Object.keys(groupedRates)
            .sort(
              (a, b) => getLevelPriority(parseInt(a)) - getLevelPriority(parseInt(b))
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
                              {parseFloat(currentRate.rate_per_hour).toFixed(2)} / hora (VIGENTE)
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm  text-muted-foreground">Prioridad:</span>
                        <Badge
                          variant="outline"
                          className={`text-sm min-w-[75px] ${PRIORITY_BORDER_COLORS[getLevelPriority(levelId)] || 'border-gray-500 text-gray-700'}`}
                        >
                          {PRIORITY_LABELS[getLevelPriority(levelId)] || 'Desconocida'}
                        </Badge>
                      </div>
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
                          <TableHead className="text-center">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rates
                          .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
                          .map((rate) => (
                            <TableRow key={rate.id}>
                              <TableCell className="font-medium">{rate.id}</TableCell>
                              <TableCell>
                                <span className="font-mono">
                                  ${parseFloat(rate.rate_per_hour).toFixed(2)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span>
                                  {formatDateTimeForDisplay(rate.start_date)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span>
                                  {rate.end_date ? formatDateTimeForDisplay(rate.end_date) : "-"}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                {rate.end_date === null ? (
                                  <Badge className="bg-green-500">VIGENTE</Badge>
                                ) : (
                                  <Badge variant="outline">HISTÓRICO</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {wasCreatedToday(rate) && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                      const level = academicLevels.find(l => l.id === rate.level_id);
                                      const levelName = level ? `${level.code} - ${level.name}` : `Nivel ${rate.level_id}`;
                                      const rateValue = `$${parseFloat(rate.rate_per_hour).toFixed(2)}`;
                                      openDeleteDialog(rate.id, levelName, rateValue);
                                    }}
                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
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
          hourlyRates={hourlyRates}
        />

        {/* Modal de confirmación para eliminar tarifa */}
        <HardDeleteConfirmDialog
          entityType="tarifa horaria"
          entityName={rateToDelete ? `${rateToDelete.levelName} (${rateToDelete.rate})` : ""}
          isOpen={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setRateToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
          gender="f"
        />
      </div>
    </CanAccess >
  );
}

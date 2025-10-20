import React, { useState, useEffect } from "react";
import { Clock, Plus, Trash2, ChevronDown, List, Grid3X3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/forms/input";
import { Label } from "@/components/ui/forms/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/data/table";
import { Checkbox } from "@/components/ui/forms/checkbox";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotification, CanAccess } from "@refinedev/core";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Unauthorized } from "../unauthorized";
import { useScheduleTimesCrud } from "@/hooks/useScheduleTimesCrud";
import type { ScheduleTimeCreatePayload, ScheduleTimeUpdatePayload } from "@/hooks/useScheduleTimesCrud";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
// Constantes para los días de la semana (0=Lunes, 6=Domingo)
const WEEK_DAYS = [
  { index: 0, key: 'monday', label: 'Lunes', short: 'Lu' },
  { index: 1, key: 'tuesday', label: 'Martes', short: 'Ma' },
  { index: 2, key: 'wednesday', label: 'Miércoles', short: 'Mi' },
  { index: 3, key: 'thursday', label: 'Jueves', short: 'Ju' },
  { index: 4, key: 'friday', label: 'Viernes', short: 'Vi' },
  { index: 5, key: 'saturday', label: 'Sábado', short: 'Sá' },
  { index: 6, key: 'sunday', label: 'Domingo', short: 'Do' },
] as const;

// Función para generar day_group_name basado en array de índices
const generateDayGroupName = (selectedDayIndexes: number[]): string => {
  if (selectedDayIndexes.length === 0) return '';

  // Mapear índices a abreviaciones
  const dayMap: Record<number, string> = {
    0: 'Lu', 1: 'Ma', 2: 'Mi', 3: 'Ju', 4: 'Vi', 5: 'Sá', 6: 'Do'
  };

  // Ordenar los índices
  const sortedIndexes = [...selectedDayIndexes].sort((a, b) => a - b);
  const shortNames = sortedIndexes.map(index => dayMap[index]);

  if (selectedDayIndexes.length === 1) {
    return shortNames[0];
  }

  // Siempre usar formato separado por guiones (no rangos automáticos)
  // Lu-Vi significa lunes y viernes, no lunes a viernes
  return shortNames.join('-');
};

// Función para generar range_text basado en las horas
const generateRangeText = (startTime: string, endTime: string): string => {
  if (!startTime || !endTime) return '';

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const min = parseInt(minutes);

    if (hour === 0 && min === 0) return '12:00 a.m.';
    if (hour < 12) return `${hour}:${min.toString().padStart(2, '0')} a.m.`;
    if (hour === 12) return `${hour}:${min.toString().padStart(2, '0')} p.m.`;
    return `${hour - 12}:${min.toString().padStart(2, '0')} p.m.`;
  };

  return `${formatTime(startTime)} a ${formatTime(endTime)}`;
};

// Función para parsear day_group_name de vuelta a array de índices
const parseDayGroupName = (dayGroupName: string): number[] => {
  if (!dayGroupName) return [];

  const shortToIndex: Record<string, number> = {
    'Lu': 0, 'Ma': 1, 'Mi': 2, 'Ju': 3, 'Vi': 4, 'Sá': 5, 'Do': 6
  };

  // Si es un solo día
  if (dayGroupName in shortToIndex) {
    return [shortToIndex[dayGroupName]];
  }

  // Si es un rango (ej: Lu-Vi)
  if (dayGroupName.includes('-')) {
    const [start, end] = dayGroupName.split('-');
    const startIndex = shortToIndex[start];
    const endIndex = shortToIndex[end];

    if (startIndex !== undefined && endIndex !== undefined && startIndex < endIndex) {
      return Array.from({ length: endIndex - startIndex + 1 }, (_, i) => startIndex + i);
    }
  }

  // Si es múltiples días separados por guión (ej: Ma-Ju-Sá)
  const parts = dayGroupName.split('-');
  return parts.map(part => shortToIndex[part]).filter(index => index !== undefined);
};

interface ScheduleTime {
  id: number;
  days_array: number[];
  day_group_name: string;
  range_text: string;
  start_time: string;
  end_time: string;
  duration_min: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

interface NewScheduleTime {
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export function ScheduleTimesList() {
  // Hook personalizado para CRUD de horarios
  const {
    canAccess,
    canCreate,
    canEdit,
    canDelete,
    itemsList: scheduleTimesList,
    total,
    isLoading,
    isError,
    createItem,
    updateItem,
    softDeleteItem,
    isCreating,
    isUpdating,
    isDeleting,
  } = useScheduleTimesCrud();

  // Estados locales para la UI
  const [scheduleTimes, setScheduleTimes] = useState<ScheduleTime[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newScheduleTime, setNewScheduleTime] = useState<NewScheduleTime>({
    start_time: "00:00",
    end_time: "01:00",
    is_active: true,
  });
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [isDayDropdownOpen, setIsDayDropdownOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [editingDays, setEditingDays] = useState<number[]>([]);
  const [isEditingDayDropdownOpen, setIsEditingDayDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grouped'>('table');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<{ id: number, range: string, dayGroup: string } | null>(null);

  // Estado para animación de highlight
  const [highlightedId, setHighlightedId] = useState<number | null>(null);

  const { open } = useNotification();

  // Los hooks de eliminación ya están disponibles desde useScheduleTimesCrud

  // Función para manejar highlight con animación
  const highlightRow = (id: number) => {
    setHighlightedId(id);
    // Remover highlight después de 3 segundos
    setTimeout(() => {
      setHighlightedId(null);
    }, 3000);
  };

  // Función para ordenar horarios por days_array y luego por start_time
  const sortScheduleTimesByDaysArray = (scheduleTimes: ScheduleTime[]): ScheduleTime[] => {
    return [...scheduleTimes].sort((a, b) => {
      const aDays = a.days_array || [];
      const bDays = b.days_array || [];

      // Primero comparar por days_array (elemento por elemento)
      for (let i = 0; i < Math.min(aDays.length, bDays.length); i++) {
        if (aDays[i] !== bDays[i]) {
          return aDays[i] - bDays[i];
        }
      }

      // Si los days_array son iguales, comparar por longitud
      const daysComparison = aDays.length - bDays.length;
      if (daysComparison !== 0) {
        return daysComparison;
      }

      // Si los days_array son completamente iguales, ordenar por start_time
      return a.start_time.localeCompare(b.start_time);
    });
  };

  // Función para agrupar horarios por day_group_name
  const groupScheduleTimesByDayGroup = (scheduleTimes: ScheduleTime[]): Record<string, ScheduleTime[]> => {
    const grouped: Record<string, ScheduleTime[]> = {};

    scheduleTimes.forEach(scheduleTime => {
      const dayGroup = scheduleTime.day_group_name;
      if (!grouped[dayGroup]) {
        grouped[dayGroup] = [];
      }
      grouped[dayGroup].push(scheduleTime);
    });

    // Ordenar cada grupo por start_time
    Object.keys(grouped).forEach(dayGroup => {
      grouped[dayGroup].sort((a, b) => a.start_time.localeCompare(b.start_time));
    });

    return grouped;
  };

  // Cargar horarios al montar el componente solo si tiene permisos

  // Función para convertir ScheduleTime del API al formato local
  const convertAPIToLocal = (apiData: any[]): ScheduleTime[] => {
    return apiData.map(item => {
      // La data ya viene con todos los campos necesarios
      return {
        id: item.id,
        days_array: item.days_array || [],
        day_group_name: item.day_group_name || '',
        range_text: item.range_text || '',
        start_time: item.start_time || '',
        end_time: item.end_time || '',
        duration_min: item.duration_min || 0,
        is_active: item.is_active || false,
        created_at: item.created_at || '',
        updated_at: item.updated_at || null,
      };
    });
  };

  // Sincronizar datos del hook con estado local
  useEffect(() => {
    if (scheduleTimesList && Array.isArray(scheduleTimesList)) {
      // Convertir datos y ordenar por days_array
      const convertedData = convertAPIToLocal(scheduleTimesList);
      const sortedTimes = sortScheduleTimesByDaysArray(convertedData);
      setScheduleTimes((prev) => {
        // Evitar actualizaciones si no hay cambios reales
        if (
          prev.length === sortedTimes.length &&
          prev.every((item, idx) => item.id === sortedTimes[idx]?.id && item.updated_at === sortedTimes[idx]?.updated_at)
        ) {
          return prev; // sin cambios
        }
        return sortedTimes;
      });
    }
  }, [scheduleTimesList]);

  // Manejar errores
  useEffect(() => {
    if (isError) {
      setError("Error al cargar horarios");
      open?.({
        type: "error",
        message: "Error",
        description: "Error al cargar horarios",
      });
    }
  }, [isError, open]);

  // Función para manejar cambio de hora de inicio con auto-incremento
  const handleStartTimeChange = (newStartTime: string) => {
    // Calcular hora fin automáticamente (+1 hora)
    const startTime = new Date(`2000-01-01T${newStartTime}`);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // +1 hora

    // Formatear a HH:MM
    const formattedEndTime = `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;

    setNewScheduleTime({
      ...newScheduleTime,
      start_time: newStartTime,
      end_time: formattedEndTime,
    });
  };

  // Función para manejar cambio de hora fin con validación
  const handleEndTimeChange = (newEndTime: string) => {
    // Validar que la hora fin no sea menor que la hora inicio
    const startTime = new Date(`2000-01-01T${newScheduleTime.start_time}`);
    const endTime = new Date(`2000-01-01T${newEndTime}`);

    if (endTime <= startTime) {
      toast.error('Hora inválida', {
        description: 'La hora de fin debe ser mayor que la hora de inicio',
        richColors: true,
      });
      return;
    }

    setNewScheduleTime({
      ...newScheduleTime,
      end_time: newEndTime,
    });
  };

  const handleCreate = () => {
    if (selectedDays.length === 0 || !newScheduleTime.start_time || !newScheduleTime.end_time) {
      toast.error('Error de validación', {
        description: 'Todos los campos son requeridos',
        richColors: true,
      });
      return;
    }

    // Validación adicional: verificar que la hora fin sea mayor que la hora inicio
    const startTime = new Date(`2000-01-01T${newScheduleTime.start_time}`);
    const endTime = new Date(`2000-01-01T${newScheduleTime.end_time}`);

    if (endTime <= startTime) {
      toast.error('Horarios inválidos', {
        description: 'La hora de fin debe ser mayor que la hora de inicio',
        richColors: true,
      });
      return;
    }

    const payload: ScheduleTimeCreatePayload = {
      days_array: selectedDays,
      start_time: newScheduleTime.start_time,
      end_time: newScheduleTime.end_time,
      is_active: newScheduleTime.is_active,
    };

    createItem(payload, () => {
      // Limpiar formulario con valores por defecto
      setNewScheduleTime({
        start_time: "00:00",
        end_time: "01:00",
        is_active: true,
      });
      setSelectedDays([]);
    });
  };

  const handleEdit = (id: number, field: string, value: string | number[]) => {
    setEditingId(id);
    setEditingField(field);
    setEditingValue(typeof value === 'string' ? value : '');

    // Si estamos editando days_array, usar el array directamente
    if (field === 'days_array') {
      setEditingDays(Array.isArray(value) ? value : []);
    }
  };

  const handleSaveEdit = (id: number, field: string, value: string) => {

    const scheduleTime = scheduleTimes.find(st => st.id === id);

    if (!scheduleTime) {
      return;
    }

    let updateData: ScheduleTimeUpdatePayload = {};

    if (field === "days_array") {
      // Si estamos editando días, usar el array de índices
      // Guardar solo si cambió
      const currentSorted = [...scheduleTime.days_array].sort();
      const nextSorted = [...editingDays].sort();
      const same = currentSorted.length === nextSorted.length && currentSorted.every((v, i) => v === nextSorted[i]);
      if (same) {
        setEditingId(null);
        setEditingField(null);
        setEditingDays([]);
        return;
      }
      updateData.days_array = editingDays;
    } else {
      if ((scheduleTime as any)[field] === value) {
        setEditingId(null);
        setEditingField(null);
        setEditingValue("");
        return;
      }

      // Validación para horas
      if (field === 'end_time') {
        // Validar que la hora fin no sea menor o igual que la hora inicio
        const startTime = new Date(`2000-01-01T${scheduleTime.start_time}`);
        const endTime = new Date(`2000-01-01T${value}`);

        if (endTime <= startTime) {
          toast.error('Hora inválida', {
            description: 'La hora de fin debe ser mayor que la hora de inicio',
            richColors: true,
          });
          return; // No guardar si es inválido
        }
        updateData[field] = value;
      } else if (field === 'start_time') {
        // Validar que la hora inicio no sea mayor o igual que la hora fin
        const startTime = new Date(`2000-01-01T${value}`);
        const endTime = new Date(`2000-01-01T${scheduleTime.end_time}`);

        if (startTime >= endTime) {
          toast.error('Hora inválida', {
            description: 'La hora de inicio debe ser menor que la hora de fin',
            richColors: true,
          });
          return; // No guardar si es inválido
        }
        updateData[field] = value;
      } else if (field === 'is_active') {
        updateData.is_active = value === 'true';
      }
    }

    console.log(`🔍 DEBUG Updating schedule ${id}, field: ${field}, updateData:`, updateData);

    updateItem(id, updateData, () => {
      console.log(`✅ DEBUG Successfully updated schedule ${id}`);
      // Activar highlight para mostrar qué fila se editó
      highlightRow(id);
      setEditingId(null);
      setEditingField(null);
      setEditingValue("");
      setEditingDays([]);
    });
  };

  const handleToggleActive = (id: number, newStatus: boolean) => {
    const updateData: ScheduleTimeUpdatePayload = { is_active: newStatus };

    updateItem(id, updateData);
  };

  const handleDelete = (id: number, range: string, dayGroup: string) => {
    setScheduleToDelete({ id, range, dayGroup });
    setDeleteDialogOpen(true);
  };

  // Función para manejar eliminación con hooks de Refine (soft-delete)
  const handleConfirmDelete = () => {
    if (!scheduleToDelete) return;

    const { id, range, dayGroup } = scheduleToDelete;
    const entityName = `${dayGroup}: ${range}`;

    softDeleteItem(id, entityName, () => {
      setScheduleToDelete(null);
      setDeleteDialogOpen(false);
    });
  };

  const handleDeleteCancel = () => {
    setScheduleToDelete(null);
    setDeleteDialogOpen(false);
  };

  if (isLoading && scheduleTimes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando horarios...</p>
        </div>
      </div>
    );
  }

  return (
    <CanAccess
      resource="schedule-times"
      action="list"
      fallback={<Unauthorized resourceName="horarios" message="Solo los administradores pueden gestionar horarios." />}
    >
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Configuración de Horarios</h1>
          </div>

          {/* Toggle de vista */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Vista:</span>
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="rounded-r-none border-r"
              >
                <List className="h-4 w-4 mr-2" />
                Tabla
              </Button>
              <Button
                variant={viewMode === 'grouped' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grouped')}
                className="rounded-l-none"
              >
                <Grid3X3 className="h-4 w-4 mr-2" />
                Agrupada
              </Button>
            </div>
          </div>
        </div>

        {/* Formulario para agregar nuevo horario */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Agregar Nuevo Horario
            </CardTitle>
            <CardDescription>
              Establece rangos horarios recurrentes para el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="day-selector" className="px-1">
                  Días de la Semana
                </Label>
                <Popover open={isDayDropdownOpen} onOpenChange={setIsDayDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {selectedDays.length === 0 ? "Seleccionar días" : generateDayGroupName(selectedDays)}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-3">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Seleccionar días</h4>
                      <div className="space-y-2">
                        {WEEK_DAYS.map((day) => (
                          <div key={day.index} className="flex items-center space-x-2">
                            <Checkbox
                              id={day.key}
                              checked={selectedDays.includes(day.index)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedDays([...selectedDays, day.index]);
                                } else {
                                  setSelectedDays(selectedDays.filter(d => d !== day.index));
                                }
                              }}
                            />
                            <label htmlFor={day.key} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              {day.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="start-time" className="px-1">
                  Hora Inicio
                </Label>
                <Input
                  type="time"
                  id="start-time"
                  value={newScheduleTime.start_time}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="end-time" className="px-1">
                  Hora Fin
                </Label>
                <Input
                  type="time"
                  id="end-time"
                  value={newScheduleTime.end_time}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                  className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleCreate} disabled={isCreating} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar
                </Button>
              </div>
            </div>

            {/* Mostrar el rango de tiempo generado automáticamente */}
            {newScheduleTime.start_time && newScheduleTime.end_time && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <div className="text-sm font-medium text-muted-foreground">Rango de tiempo generado:</div>
                <div className="text-sm font-semibold">{generateRangeText(newScheduleTime.start_time, newScheduleTime.end_time)}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabla de horarios */}
        <Card>
          <CardHeader>
            <CardTitle>Horarios Configurados</CardTitle>
            <CardDescription>
              {scheduleTimes.length} horarios configurados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {viewMode === 'table' ? (
              // Vista de tabla normal
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Grupo de Días</TableHead>
                    <TableHead>Rango de Tiempo</TableHead>
                    <TableHead>Hora Inicio</TableHead>
                    <TableHead>Hora Fin</TableHead>
                    <TableHead>Duración (min)</TableHead>
                    <TableHead className="text-center w-[100px]">Estado</TableHead>
                    <TableHead className="text-center w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduleTimes.map((scheduleTime) => (
                    <TableRow
                      key={scheduleTime.id}
                      className={`transition-all duration-500 ${
                        highlightedId === scheduleTime.id
                          ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700'
                          : ''
                      }`}
                    >
                      <TableCell className="font-medium">{scheduleTime.id}</TableCell>
                      <TableCell>
                        {editingId === scheduleTime.id && editingField === "days_array" ? (
                          <Popover open={isEditingDayDropdownOpen} onOpenChange={setIsEditingDayDropdownOpen}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="w-full justify-between">
                                {editingDays.length === 0 ? "Seleccionar días" : generateDayGroupName(editingDays)}
                                <ChevronDown className="h-3 w-3 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-3">
                              <div className="space-y-2">
                                <h4 className="font-medium text-sm">Editar días</h4>
                                <div className="space-y-2">
                                  {WEEK_DAYS.map((day) => (
                                    <div key={day.index} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`edit-${day.key}`}
                                        checked={editingDays.includes(day.index)}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            setEditingDays([...editingDays, day.index]);
                                          } else {
                                            setEditingDays(editingDays.filter(d => d !== day.index));
                                          }
                                        }}
                                      />
                                      <label htmlFor={`edit-${day.key}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        {day.label}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex gap-2 pt-2">
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      handleSaveEdit(scheduleTime.id, "days_array", "");
                                      setIsEditingDayDropdownOpen(false);
                                    }}
                                    className="flex-1"
                                  >
                                    Guardar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingId(null);
                                      setEditingField(null);
                                      setEditingValue("");
                                      setEditingDays([]);
                                      setIsEditingDayDropdownOpen(false);
                                    }}
                                    className="flex-1"
                                  >
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <span
                            className="cursor-pointer hover:bg-muted px-2 py-1 rounded"
                            onClick={() => handleEdit(scheduleTime.id, "days_array", scheduleTime.days_array)}
                          >
                            {scheduleTime.day_group_name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {scheduleTime.range_text}
                        </span>
                      </TableCell>
                      <TableCell>
                        {editingId === scheduleTime.id && editingField === "start_time" ? (
                          <Input
                            type="time"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => handleSaveEdit(scheduleTime.id, "start_time", editingValue)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSaveEdit(scheduleTime.id, "start_time", editingValue);
                              }
                              if (e.key === "Escape") {
                                setEditingId(null);
                                setEditingField(null);
                                setEditingValue("");
                              }
                            }}
                            autoFocus
                            className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                          />
                        ) : (
                          <span
                            className="cursor-pointer hover:bg-muted px-2 py-1 rounded"
                            onClick={() => handleEdit(scheduleTime.id, "start_time", scheduleTime.start_time)}
                          >
                            {scheduleTime.start_time}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === scheduleTime.id && editingField === "end_time" ? (
                          <Input
                            type="time"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => handleSaveEdit(scheduleTime.id, "end_time", editingValue)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSaveEdit(scheduleTime.id, "end_time", editingValue);
                              }
                              if (e.key === "Escape") {
                                setEditingId(null);
                                setEditingField(null);
                                setEditingValue("");
                              }
                            }}
                            autoFocus
                            className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                          />
                        ) : (
                          <span
                            className="cursor-pointer hover:bg-muted px-2 py-1 rounded"
                            onClick={() => handleEdit(scheduleTime.id, "end_time", scheduleTime.end_time)}
                          >
                            {scheduleTime.end_time}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{scheduleTime.duration_min}</TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={scheduleTime.is_active}
                          onCheckedChange={(checked) => handleToggleActive(scheduleTime.id, checked)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleDelete(scheduleTime.id, scheduleTime.range_text, scheduleTime.day_group_name)}
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Eliminar</p>
                            </TooltipContent>
                          </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              // Vista agrupada
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grupo de Días</TableHead>
                    <TableHead>Horarios</TableHead>
                    <TableHead>Duración</TableHead>
                    <TableHead className="text-center w-[100px]">Estado</TableHead>
                    <TableHead className="text-center w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(groupScheduleTimesByDayGroup(scheduleTimes)).map(([dayGroup, times]) => (
                    times.map((scheduleTime, index) => (
                      <TableRow
                        key={scheduleTime.id}
                        className={`transition-all duration-500 ${
                          highlightedId === scheduleTime.id
                            ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700'
                            : ''
                        }`}
                      >
                        {index === 0 && (
                          <TableCell
                            rowSpan={times.length}
                            className="font-medium bg-muted/50 align-top"
                          >
                            {scheduleTime.day_group_name}
                          </TableCell>
                        )}
                        <TableCell>
                          <span className="text-sm">
                            {scheduleTime.range_text}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">
                            {scheduleTime.duration_min} min
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={scheduleTime.is_active}
                            onCheckedChange={(checked) => handleToggleActive(scheduleTime.id, checked)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleDelete(scheduleTime.id, scheduleTime.range_text, scheduleTime.day_group_name)}
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Eliminar</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Modal de confirmación de eliminación */}
        {scheduleToDelete && (
          <DeleteConfirmDialog
            entityType="horario"
            entityName={`${scheduleToDelete.dayGroup}: ${scheduleToDelete.range}`}
            isOpen={deleteDialogOpen}
            onClose={handleDeleteCancel}
            onConfirm={handleConfirmDelete}
            isDeleting={isDeleting}
            gender="m"
          />
        )}
      </div>
    </CanAccess>
  );
}

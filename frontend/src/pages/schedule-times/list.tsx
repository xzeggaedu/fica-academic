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
import { useNotification, CanAccess, useCan, useDelete, useInvalidate, useList, useCreate, useUpdate } from "@refinedev/core";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ScheduleDeleteDialog } from "@/components/ui/schedule-times/schedule-delete-dialog";
import { Unauthorized } from "../unauthorized";
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
  // Verificar permisos primero
  const { data: canAccess } = useCan({
    resource: "schedule-times",
    action: "list",
  });

  const [scheduleTimes, setScheduleTimes] = useState<ScheduleTime[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newScheduleTime, setNewScheduleTime] = useState<NewScheduleTime>({
    start_time: "",
    end_time: "",
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

  const { open } = useNotification();

  // Hooks de Refine para eliminación
  const { mutate: deleteSchedule, mutation: deleteState } = useDelete();
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();
  const isDeleting = deleteState.isPending;

  // Función helper para ordenar los horarios por days_array
  const sortScheduleTimes = (scheduleTimes: ScheduleTime[]): ScheduleTime[] => {
    // Validar que scheduleTimes sea un array válido
    if (!Array.isArray(scheduleTimes)) {
      console.warn('sortScheduleTimes received non-array:', scheduleTimes);
      return [];
    }

    return [...scheduleTimes].sort((a, b) => {
      // Validar que a y b tengan days_array
      if (!a?.days_array || !b?.days_array) {
        console.warn('Invalid schedule time object:', { a, b });
        return 0;
      }

      // Comparar arrays de días elemento por elemento
      for (let i = 0; i < Math.min(a.days_array.length, b.days_array.length); i++) {
        if (a.days_array[i] !== b.days_array[i]) {
          return a.days_array[i] - b.days_array[i];
        }
      }
      // Si los primeros elementos son iguales, comparar por longitud
      return a.days_array.length - b.days_array.length;
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

  // Usar useList para cargar TODOS los schedule times (activos e inactivos)
  const { query: scheduleTimesQuery, result: scheduleTimesResult } = useList({
    resource: "schedule-times",
    pagination: {
      currentPage: 1,
      pageSize: 1000,
      mode: "server",
    },
    queryOptions: {
      // Habilitar siempre la carga; la autorización se maneja a nivel de ruta/proveedor
      enabled: true,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 0,
      gcTime: 0,
    },
    successNotification: false,
    errorNotification: false,
  });

  // Actualizar scheduleTimes cuando cambien los datos (evitar loops)
  useEffect(() => {
    // dataProvider.getList retorna { data, total }
    const raw = (scheduleTimesResult as any)?.data ?? (scheduleTimesResult as any)?.data?.data;
    const data: any[] = Array.isArray(raw) ? raw : ((scheduleTimesResult as any)?.data?.data || []);
    if (!Array.isArray(data)) {
      console.warn('Invalid data received from useList:', scheduleTimesResult);
      return;
    }

    const next = sortScheduleTimes(data);

    setScheduleTimes((prev) => {
      // Evitar actualizaciones si no hay cambios reales
      if (
        prev.length === next.length &&
        prev.every((item, idx) => item.id === next[idx]?.id && item.updated_at === (next[idx] as any)?.updated_at)
      ) {
        return prev; // sin cambios
      }
      return next;
    });
  }, [scheduleTimesResult?.data]);

  // Manejar errores
  useEffect(() => {
    if (scheduleTimesQuery.error) {
      setError(scheduleTimesQuery.error.message);
      open?.({
        type: "error",
        message: "Error",
        description: scheduleTimesQuery.error.message,
      });
    }
  }, [scheduleTimesQuery.error, open]);

  // Hooks de Refine para operaciones CRUD
  const { mutate: createScheduleTime, mutation: createMutation } = useCreate();
  const { mutate: updateScheduleTime, mutation: updateMutation } = useUpdate();

  // Actualizar estado de loading (sin provocar renders extra)
  useEffect(() => {
    const nextLoading = scheduleTimesQuery.isLoading || createMutation.isPending || updateMutation.isPending;
    setIsLoading((prev) => (prev === nextLoading ? prev : nextLoading));
  }, [scheduleTimesQuery.isLoading, createMutation.isPending, updateMutation.isPending]);

  const handleCreate = () => {
    if (selectedDays.length === 0 || !newScheduleTime.start_time || !newScheduleTime.end_time) {
      toast.error('Error de validación', {
        description: 'Todos los campos son requeridos',
        richColors: true,
      });
      return;
    }

    const payload = {
      days_array: selectedDays,
      start_time: newScheduleTime.start_time,
      end_time: newScheduleTime.end_time,
      is_active: newScheduleTime.is_active,
    };

    createScheduleTime({
      resource: "schedule-times",
      values: payload,
      successNotification: false,
    }, {
      onSuccess: () => {
        // Limpiar formulario
        setNewScheduleTime({
          start_time: "",
          end_time: "",
          is_active: true,
        });
        setSelectedDays([]);

        toast.success('Horario creado', {
          description: 'El horario ha sido creado correctamente.',
          richColors: true,
        });

        // Invalidar la lista para refrescar
        invalidate({
          resource: "schedule-times",
          invalidates: ["list"],
        });
      },
      onError: (error) => {
        const errorMessage = error?.message || "Error desconocido";
        toast.error('Error al crear horario', {
          description: errorMessage,
          richColors: true,
        });
      },
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
    if (!scheduleTime) return;

    let updateData: any = {};

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
      updateData[field] = value;
    }

    console.log(`Updating schedule ${id}, field: ${field}, updateData:`, updateData);

    updateScheduleTime({
      resource: "schedule-times",
      id: id,
      values: updateData,
      successNotification: false,
    }, {
      onSuccess: (updatedScheduleTime) => {
        console.log(`Updated schedule time:`, updatedScheduleTime);
        // Validar que updatedScheduleTime tenga la estructura esperada
        if (!updatedScheduleTime || typeof updatedScheduleTime !== 'object') {
          console.warn('Invalid updatedScheduleTime received:', updatedScheduleTime);
          // Si no hay datos válidos, solo refrescar la lista
          invalidate({
            resource: "schedule-times",
            invalidates: ["list"],
          });
          return;
        }

        setScheduleTimes(sortScheduleTimes(scheduleTimes.map(st => st.id === id ? updatedScheduleTime as any : st)));

        toast.success('Horario actualizado', {
          description: 'El horario ha sido actualizado correctamente.',
          richColors: true,
        });

        // Invalidar la lista para refrescar
        invalidate({
          resource: "schedule-times",
          invalidates: ["list"],
        });
      },
      onError: (error) => {
        console.error(`Error response:`, error);
        const errorMessage = error?.message || "Error desconocido";
        toast.error('Error al actualizar horario', {
          description: errorMessage,
          richColors: true,
        });
      },
      onSettled: () => {
        setEditingId(null);
        setEditingField(null);
        setEditingValue("");
        setEditingDays([]);
      },
    });
  };

  const handleToggleActive = (id: number, newStatus: boolean) => {
    updateScheduleTime({
      resource: "schedule-times",
      id: id,
      values: { is_active: newStatus },
      successNotification: false,
    }, {
      onSuccess: (updatedScheduleTime) => {
        // Validar que updatedScheduleTime tenga la estructura esperada
        if (!updatedScheduleTime || typeof updatedScheduleTime !== 'object') {
          console.warn('Invalid updatedScheduleTime received:', updatedScheduleTime);
          // Si no hay datos válidos, solo refrescar la lista
          invalidate({
            resource: "schedule-times",
            invalidates: ["list"],
          });
          return;
        }

        setScheduleTimes(sortScheduleTimes(scheduleTimes.map(st => st.id === id ? updatedScheduleTime as any : st)));

        toast.success('Estado actualizado', {
          description: 'El estado del horario ha sido actualizado correctamente.',
          richColors: true,
        });

        // Invalidar la lista para refrescar
        invalidate({
          resource: "schedule-times",
          invalidates: ["list"],
        });
      },
      onError: (error) => {
        const errorMessage = error?.message || "Error desconocido";
        toast.error('Error al cambiar estado', {
          description: errorMessage,
          richColors: true,
        });
      },
    });
  };

  const handleDelete = (id: number, range: string, dayGroup: string) => {
    setScheduleToDelete({ id, range, dayGroup });
    setDeleteDialogOpen(true);
  };

  // Función para manejar eliminación con hooks de Refine
  const handleConfirmDelete = (scheduleId: number, scheduleRange: string, dayGroupName: string) => {
    deleteSchedule(
      {
        resource: "schedule-times",
        id: scheduleId,
        successNotification: false,
      },
      {
        onSuccess: () => {
          toast.success('Horario eliminado', {
            description: `El horario "${dayGroupName} - ${scheduleRange}" ha sido eliminado exitosamente.`,
            richColors: true,
          });

          // Actualizar estado local
          if (scheduleToDelete) {
            setScheduleTimes(sortScheduleTimes(scheduleTimes.filter(st => st.id !== scheduleToDelete.id)));
          }

          // Invalidar cache
          invalidate({
            resource: "schedule-times",
            invalidates: ["list"],
          });

          setScheduleToDelete(null);
          setDeleteDialogOpen(false);
        },
        onError: (error) => {
          console.error("Error deleting schedule:", error);
          toast.error('Error al eliminar horario', {
            description: error?.message || 'Error desconocido',
            richColors: true,
          });
        },
      }
    );
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
                  onChange={(e) => setNewScheduleTime({ ...newScheduleTime, start_time: e.target.value })}
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
                  onChange={(e) => setNewScheduleTime({ ...newScheduleTime, end_time: e.target.value })}
                  className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleCreate} disabled={isLoading} className="w-full">
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
                    <TableRow key={scheduleTime.id}>
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
                      <TableRow key={scheduleTime.id}>
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
          <ScheduleDeleteDialog
            scheduleId={scheduleToDelete.id}
            scheduleRange={scheduleToDelete.range}
            dayGroupName={scheduleToDelete.dayGroup}
            isOpen={deleteDialogOpen}
            onClose={handleDeleteCancel}
            onDelete={handleConfirmDelete}
            isDeleting={isDeleting}
          />
        )}
      </div>
    </CanAccess>
  );
}

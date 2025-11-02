import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/data/table";
import type { BillingReportMonthlyItem } from "@/types/api";
import { DollarSign } from "lucide-react";

interface MonthlyBudgetBlockProps {
  items: BillingReportMonthlyItem[];
}

export const MonthlyBudgetBlock: React.FC<MonthlyBudgetBlockProps> = ({ items }) => {
  // Mapeo de días a orden
  const dayOrder: Record<string, number> = {
    'Lu': 1, 'Ma': 2, 'Mi': 3, 'Ju': 4, 'Vi': 5, 'Sá': 6, 'Do': 7,
    'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6, 'Domingo': 7,
  };

  // Función para obtener el orden de un string de días
  const getDaysOrder = (daysStr: string): number => {
    for (const [day, order] of Object.entries(dayOrder)) {
      if (daysStr.startsWith(day)) {
        return order;
      }
    }
    return 999;
  };

  // Función para extraer hora de inicio del horario
  const getScheduleStartTime = (schedule: string): string => {
    return schedule.split('-')[0] || schedule;
  };

  // Agrupar items por mes
  const groupedByMonth = items.reduce((acc, item) => {
    const monthKey = `${item.month_name} ${item.year}`;
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(item);
    return acc;
  }, {} as Record<string, BillingReportMonthlyItem[]>);

  if (Object.keys(groupedByMonth).length === 0) {
    return null;
  }

  return (
    <>
      {Object.entries(groupedByMonth).map(([monthYear, monthItems], index) => {
        // Agrupar por días y luego por horario
        const groupedByDays = monthItems.reduce((acc, item) => {
          const daysKey = item.class_days;
          if (!acc[daysKey]) {
            acc[daysKey] = {};
          }
          const scheduleKey = item.class_schedule;
          if (!acc[daysKey][scheduleKey]) {
            acc[daysKey][scheduleKey] = [];
          }
          acc[daysKey][scheduleKey].push(item);
          return acc;
        }, {} as Record<string, Record<string, BillingReportMonthlyItem[]>>);

        // Ordenar días
        const sortedDays = Object.entries(groupedByDays).sort(([daysA], [daysB]) => {
          return getDaysOrder(daysA) - getDaysOrder(daysB);
        });

        // Crear estructura plana con rowSpan para días
        const rows: Array<{
          class_days: string;
          class_schedule: string;
          class_duration: number;
          rowSpan: number;
          sessions: number;
          real_time_minutes: number;
          total_class_hours: number;
          total_dollars: number;
          isFirstRow: boolean;
        }> = [];

        sortedDays.forEach(([days, schedules]) => {
          // Ordenar horarios por hora de inicio
          const sortedSchedules = Object.entries(schedules).sort(([scheduleA], [scheduleB]) => {
            const startA = getScheduleStartTime(scheduleA);
            const startB = getScheduleStartTime(scheduleB);
            return startA.localeCompare(startB);
          });

          let isFirstRow = true;

          sortedSchedules.forEach(([schedule, scheduleItems]) => {
            const item = scheduleItems[0]; // Todos los items deberían tener los mismos valores excepto total_dollars
            const totalDollars = scheduleItems.reduce((sum, it) => sum + Number(it.total_dollars), 0);

            rows.push({
              class_days: days,
              class_schedule: schedule,
              class_duration: item.class_duration,
              rowSpan: isFirstRow ? sortedSchedules.length : 0,
              sessions: item.sessions,
              real_time_minutes: item.real_time_minutes,
              total_class_hours: Number(item.total_class_hours),
              total_dollars: totalDollars,
              isFirstRow,
            });

            isFirstRow = false;
          });
        });

        const totalMonth = rows.reduce((sum, row) => sum + row.total_dollars, 0);

        return (
          <div key={monthYear} className="flex-shrink-0">
            <div className="rounded-md">
              <Table className="max-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead colSpan={4} className="
                      text-center
                      font-semibold
                      uppercase
                      border-t-1
                      border-r-1
                      border-gray-200">{monthYear}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-right border-r-1 border-gray-200">Sesiones</TableCell>
                    <TableCell className="text-right border-r-1 border-gray-200">Tiempo Real (min)</TableCell>
                    <TableCell className="text-right border-r-1 border-gray-200">Total Horas Clase</TableCell>
                    <TableCell className="text-right border-r-1 border-gray-200">Total en Dólares</TableCell>
                  </TableRow>
                  {rows.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-center">{row.sessions}</TableCell>
                      <TableCell className="text-center">{row.real_time_minutes}</TableCell>
                      <TableCell className="text-center">{row.total_class_hours.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold border-r-1 border-gray-200">
                        <div className="flex items-center justify-end gap-1">
                          $ {row.total_dollars.toFixed(2)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-3 flex justify-end pt-2 border-t">
              <div className="text-sm font-semibold">
                Total del mes:{" "}
                <span className="text-blue-600">
                  <DollarSign className="w-4 h-4 inline align-middle" />
                  {totalMonth.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};

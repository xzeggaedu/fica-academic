import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/data/table";
import type { BillingReportPaymentSummary } from "@/types/api";

interface PaymentSummaryBlockProps {
  summaries: BillingReportPaymentSummary[];
}

export const PaymentSummaryBlock: React.FC<PaymentSummaryBlockProps> = ({ summaries }) => {
  // Mapeo de días a orden
  const dayOrder: Record<string, number> = {
    'Lu': 1, 'Ma': 2, 'Mi': 3, 'Ju': 4, 'Vi': 5, 'Sá': 6, 'Do': 7,
    'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6, 'Domingo': 7,
  };

  // Función para obtener el orden de un string de días
  const getDaysOrder = (daysStr: string): number => {
    // Buscar el primer día que coincida
    for (const [day, order] of Object.entries(dayOrder)) {
      if (daysStr.startsWith(day)) {
        return order;
      }
    }
    return 999; // Si no encuentra, al final
  };

  // Agrupar primero por días, luego por horario
  const groupedByDays = summaries.reduce((acc, summary) => {
    const daysKey = summary.class_days;
    if (!acc[daysKey]) {
      acc[daysKey] = {};
    }
    const scheduleKey = summary.class_schedule;
    if (!acc[daysKey][scheduleKey]) {
      acc[daysKey][scheduleKey] = [];
    }
    acc[daysKey][scheduleKey].push(summary);
    return acc;
  }, {} as Record<string, Record<string, BillingReportPaymentSummary[]>>);

  // Ordenar los grupos por día inicial
  const sortedDayGroups = Object.entries(groupedByDays).sort(([daysA], [daysB]) => {
    const orderA = getDaysOrder(daysA);
    const orderB = getDaysOrder(daysB);
    return orderA - orderB;
  });

  // Crear estructura plana con información de rowSpan
  const rows: Array<{
    class_days: string;
    class_schedule: string;
    rowSpan: number;
    totals: {
      grado: number;
      maestria1: number;
      maestria2: number;
      doctor: number;
      bilingue: number;
    };
    isFirstRow: boolean;
  }> = [];

  sortedDayGroups.forEach(([days, schedules]) => {
    const scheduleEntries = Object.entries(schedules);
    let isFirstRow = true;

    scheduleEntries.forEach(([schedule, items]) => {
      // Calcular sumas para este horario
      const totals = {
        grado: items.reduce((sum, item) => sum + Number(item.payment_rate_grado), 0),
        maestria1: items.reduce((sum, item) => sum + Number(item.payment_rate_maestria_1), 0),
        maestria2: items.reduce((sum, item) => sum + Number(item.payment_rate_maestria_2), 0),
        doctor: items.reduce((sum, item) => sum + Number(item.payment_rate_doctor), 0),
        bilingue: items.reduce((sum, item) => sum + Number(item.payment_rate_bilingue), 0),
      };

      rows.push({
        class_days: days,
        class_schedule: schedule,
        rowSpan: isFirstRow ? scheduleEntries.length : 0, // Solo la primera fila tiene rowSpan
        totals,
        isFirstRow,
      });

      isFirstRow = false;
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Resumen de Tasas de Pago por Nivel Académico</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table className="">
            <TableHeader>
              <TableRow>
                <TableHead>Días</TableHead>
                <TableHead className="text-center">Horario</TableHead>
                <TableHead className="text-center">Grado</TableHead>
                <TableHead className="text-center">1 Maestría</TableHead>
                <TableHead className="text-center">2 Maestrías</TableHead>
                <TableHead className="text-center">Doctor</TableHead>
                <TableHead className="text-center">Bilingüe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay resúmenes de pago disponibles
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, index) => (
                  <TableRow key={index}>
                    {row.rowSpan > 0 ? (
                      <TableCell
                        className="font-medium align-top border-r-2 border-gray-200 max-w-18"
                        rowSpan={row.rowSpan}
                      >
                        {row.class_days}
                      </TableCell>
                    ) : null}
                    <TableCell className="text-center max-w-8 border-r-2 border-gray-200">{row.class_schedule}</TableCell>
                    <TableCell className="text-center max-w-8">{row.totals.grado.toFixed(2)}</TableCell>
                    <TableCell className="text-center max-w-8">{row.totals.maestria1.toFixed(2)}</TableCell>
                    <TableCell className="text-center max-w-8">{row.totals.maestria2.toFixed(2)}</TableCell>
                    <TableCell className="text-center max-w-8">{row.totals.doctor.toFixed(2)}</TableCell>
                    <TableCell className="text-center max-w-8">{row.totals.bilingue.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

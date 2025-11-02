import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/data/table";
import type { BillingReportMonthlyItem } from "@/types/api";
import { DollarSign } from "lucide-react";

interface MonthlyBudgetBlockProps {
  items: BillingReportMonthlyItem[];
}

export const MonthlyBudgetBlock: React.FC<MonthlyBudgetBlockProps> = ({ items }) => {
  // Agrupar items por month_name para mostrar mejor
  const groupedByMonth = items.reduce((acc, item) => {
    const key = `${item.month_name} ${item.year}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<string, BillingReportMonthlyItem[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Presupuesto Mensual</CardTitle>
      </CardHeader>
      <CardContent>
        {Object.keys(groupedByMonth).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay datos mensuales disponibles
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByMonth).map(([monthYear, monthItems]) => (
              <div key={monthYear}>
                <h3 className="text-md font-semibold mb-3">{monthYear}</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Días</TableHead>
                        <TableHead>Horario</TableHead>
                        <TableHead>Duración (min)</TableHead>
                        <TableHead className="text-right">Sesiones</TableHead>
                        <TableHead className="text-right">Tiempo Real (min)</TableHead>
                        <TableHead className="text-right">Total Horas Clase</TableHead>
                        <TableHead className="text-right">Total en Dólares</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.class_days}</TableCell>
                          <TableCell>{item.class_schedule}</TableCell>
                          <TableCell>{item.class_duration}</TableCell>
                          <TableCell className="text-right">{item.sessions}</TableCell>
                          <TableCell className="text-right">{item.real_time_minutes}</TableCell>
                          <TableCell className="text-right">{Number(item.total_class_hours).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            <div className="flex items-center justify-end gap-1">
                              <DollarSign className="w-4 h-4" />
                              {Number(item.total_dollars).toFixed(2)}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-3 flex justify-end">
                  <div className="text-sm font-semibold">
                    Total del mes:{" "}
                    <span className="text-blue-600">
                      <DollarSign className="w-4 h-4 inline align-middle" />
                      {monthItems.reduce((sum, item) => sum + Number(item.total_dollars), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/data/table";
import type { BillingReportPaymentSummary, BillingReportRateSnapshot, BillingReportMonthlyItem } from "@/types/api";
import { DollarSign } from "lucide-react";

interface UnifiedReportTableProps {
    summaries: BillingReportPaymentSummary[];
    monthlyItems: BillingReportMonthlyItem[];
    rateSnapshots: BillingReportRateSnapshot[];
}

export const UnifiedReportTable: React.FC<UnifiedReportTableProps> = ({ summaries, monthlyItems, rateSnapshots }) => {
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

    // Crear mapeo de códigos de nivel a tarifas (tomar el primer snapshot por código)
    const ratesByLevel: Record<string, number> = {};
    rateSnapshots.forEach((snapshot) => {
        if (!ratesByLevel[snapshot.academic_level_code]) {
            ratesByLevel[snapshot.academic_level_code] = Number(snapshot.rate_per_hour);
        }
    });

    // Agrupar items por mes
    const groupedByMonth = monthlyItems.reduce((acc, item) => {
        const monthKey = `${item.month_name} ${item.year}`;
        if (!acc[monthKey]) {
            acc[monthKey] = [];
        }
        acc[monthKey].push(item);
        return acc;
    }, {} as Record<string, BillingReportMonthlyItem[]>);

    // Agrupar summaries por días, luego por horario
    const groupedSummaries = summaries.reduce((acc, summary) => {
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

    // Obtener lista única de (days, schedule, duration)
    const uniqueSchedules: Array<{ days: string; schedule: string; duration: number }> = [];
    const seen = new Set<string>();

    summaries.forEach((s) => {
        const key = `${s.class_days}|${s.class_schedule}|${s.class_duration}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueSchedules.push({
                days: s.class_days,
                schedule: s.class_schedule,
                duration: s.class_duration,
            });
        }
    });

    // Ordenar uniqueSchedules
    uniqueSchedules.sort((a, b) => {
        const orderA = getDaysOrder(a.days);
        const orderB = getDaysOrder(b.days);
        if (orderA !== orderB) return orderA - orderB;
        return getScheduleStartTime(a.schedule).localeCompare(getScheduleStartTime(b.schedule));
    });

    // Obtener lista de meses ordenados cronológicamente
    const sortedMonths = Object.keys(groupedByMonth).sort((a, b) => {
        // Extraer año y mes de las claves "month_name year"
        const [monthNameA, yearA] = a.split(' ');
        const [monthNameB, yearB] = b.split(' ');

        const yearAInt = parseInt(yearA, 10);
        const yearBInt = parseInt(yearB, 10);

        // Ordenar por año primero
        if (yearAInt !== yearBInt) {
            return yearAInt - yearBInt;
        }

        // Luego ordenar por mes
        const monthOrder: Record<string, number> = {
            'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
            'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
            'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
        };

        return monthOrder[monthNameA.toLowerCase()] - monthOrder[monthNameB.toLowerCase()];
    });

    // Agrupar schedules por días para calcular rowSpan
    const schedulesByDays: Record<string, Array<{ days: string; schedule: string; duration: number }>> = {};
    uniqueSchedules.forEach((s) => {
        if (!schedulesByDays[s.days]) {
            schedulesByDays[s.days] = [];
        }
        schedulesByDays[s.days].push(s);
    });

    // Crear array de filas con información de rowSpan
    const rows: Array<{
        days: string;
        schedule: string;
        duration: number;
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

    Object.entries(schedulesByDays)
        .sort(([daysA], [daysB]) => getDaysOrder(daysA) - getDaysOrder(daysB))
        .forEach(([days, schedules]) => {
            schedules
                .sort((a, b) => getScheduleStartTime(a.schedule).localeCompare(getScheduleStartTime(b.schedule)))
                .forEach((s, idx) => {
                    const summariesForSchedule = groupedSummaries[s.days]?.[s.schedule] || [];
                    const totals = {
                        grado: summariesForSchedule.reduce((sum, item) => sum + Number(item.payment_rate_grado), 0),
                        maestria1: summariesForSchedule.reduce((sum, item) => sum + Number(item.payment_rate_maestria_1), 0),
                        maestria2: summariesForSchedule.reduce((sum, item) => sum + Number(item.payment_rate_maestria_2), 0),
                        doctor: summariesForSchedule.reduce((sum, item) => sum + Number(item.payment_rate_doctor), 0),
                        bilingue: summariesForSchedule.reduce((sum, item) => sum + Number(item.payment_rate_bilingue), 0),
                    };

                    rows.push({
                        days: s.days,
                        schedule: s.schedule,
                        duration: s.duration,
                        rowSpan: idx === 0 ? schedules.length : 0,
                        totals,
                        isFirstRow: idx === 0,
                    });
                });
        });

    // Función para obtener datos de un mes específico para un schedule
    const getMonthlyData = (days: string, schedule: string, monthKey: string): BillingReportMonthlyItem | null => {
        const monthItems = groupedByMonth[monthKey];
        if (!monthItems) return null;

        const matching = monthItems.find((item) => item.class_days === days && item.class_schedule === schedule);
        return matching || null;
    };

    if (rows.length === 0 || sortedMonths.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                No hay datos disponibles
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {/* Columnas fijas del resumen */}
                            <TableHead colSpan={3} className="border-r-1 border-gray-200">

                            </TableHead>
                            {/* Headers de tarifas */}
                            <TableCell className="text-center border-t-1 border-gray-200">
                                <div className="flex items-center justify-center gap-1 text-xs">
                                    $ {ratesByLevel["GDO"]?.toFixed(2) || "0.00"}
                                </div>
                            </TableCell>
                            <TableCell className="text-center border-t-1 border-gray-200">
                                <div className="flex items-center justify-center gap-1 text-xs">
                                    $ {ratesByLevel["M1"]?.toFixed(2) || "0.00"}
                                </div>
                            </TableCell>
                            <TableCell className="text-center border-t-1 border-gray-200">
                                <div className="flex items-center justify-center gap-1 text-xs">
                                    $ {ratesByLevel["M2"]?.toFixed(2) || "0.00"}
                                </div>
                            </TableCell>
                            <TableCell className="text-center border-t-1 border-gray-200">
                                <div className="flex items-center justify-center gap-1 text-xs">
                                    $ {ratesByLevel["DR"]?.toFixed(2) || "0.00"}
                                </div>
                            </TableCell>
                            <TableCell className="text-center border-t-1 border-r-1 border-gray-200">
                                <div className="flex items-center justify-center gap-1 text-xs">
                                    $ {ratesByLevel["BLG"]?.toFixed(2) || "0.00"}
                                </div>
                            </TableCell>
                            <TableHead className="text-center font-semibold border-r-1 border-gray-200 min-w-[65px]">

                            </TableHead>
                            {/* Columnas dinámicas por mes */}
                            {sortedMonths.map((monthKey) => (
                                <React.Fragment key={monthKey}>
                                    <TableHead colSpan={4} className="text-center font-semibold border-l-1 border-gray-200 border-t-1 border-gray-200">
                                        {monthKey}
                                    </TableHead>
                                </React.Fragment>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {/* Fila de tarifas */}
                        <TableRow>
                            <TableHead colSpan={2} className="border-r-1">
                                Bloques de Horario
                            </TableHead>
                            <TableHead className="bg-gray-50 text-center border-r-1 border-gray-200">
                                Duración
                            </TableHead>

                            <TableHead className="text-center bg-blue-50 border-l-1 border-r-1 border-gray-200">
                                Grado
                            </TableHead>
                            <TableHead className="text-center bg-blue-50 border-r-1 border-gray-200">
                                1 Maestría
                            </TableHead>
                            <TableHead className="text-center bg-blue-50 border-r-1 border-gray-200">
                                2 Maestrías
                            </TableHead>
                            <TableHead className="text-center bg-blue-50 border-r-1 border-gray-200">
                                Doctor
                            </TableHead>
                            <TableHead className="text-center bg-blue-50 border-r-1 border-gray-200">
                                Bilingüe
                            </TableHead>
                            <TableCell className="text-center bg-gray-50 border-r-1 border-gray-200">Total</TableCell>
                            {/* Celdas vacías para meses */}


                            {/* Segunda fila de headers para los meses */}
                            {sortedMonths.map((monthKey) => (
                                <React.Fragment key={monthKey}>
                                    <TableHead className="text-center border-l-1 border-gray-200">Sesiones</TableHead>
                                    <TableHead className="text-center border-r-1 border-gray-200">Tiempo Real</TableHead>
                                    <TableHead className="text-center border-r-1 border-gray-200">Horas Clase</TableHead>
                                    <TableHead className="bg-gray-50 text-center border-r-1 border-gray-200">Total $</TableHead>
                                </React.Fragment>
                            ))}

                        </TableRow>

                        {/* Filas de datos */}
                        {rows.map((row, idx) => (
                            <TableRow key={idx}>
                                {row.rowSpan > 0 ? (
                                    <TableCell
                                        className="font-medium align-top border-r-1 border-gray-200 text-xs"
                                        rowSpan={row.rowSpan}
                                    >
                                        {row.days}
                                    </TableCell>
                                ) : null}
                                <TableCell className="text-center text-xs border-r-1 border-gray-200">{row.schedule}</TableCell>
                                <TableCell className="text-center text-xs bg-gray-50 border-r-1 border-gray-200">{row.duration}</TableCell>
                                <TableCell className="text-center text-xs">{row.totals.grado}</TableCell>
                                <TableCell className="text-center text-xs">{row.totals.maestria1}</TableCell>
                                <TableCell className="text-center text-xs">{row.totals.maestria2}</TableCell>
                                <TableCell className="text-center text-xs">{row.totals.doctor}</TableCell>
                                <TableCell className="text-center text-xs border-r-1 border-gray-200">{row.totals.bilingue}</TableCell>
                                <TableCell className="text-center text-xs bg-gray-50 border-r-1 border-gray-200 font-semibold">
                                    {row.totals.grado + row.totals.maestria1 + row.totals.maestria2 + row.totals.doctor + row.totals.bilingue}
                                </TableCell>

                                {/* Datos mensuales para cada mes */}
                                {sortedMonths.map((monthKey) => {
                                    const monthData = getMonthlyData(row.days, row.schedule, monthKey);
                                    if (!monthData) {
                                        return (
                                            <React.Fragment key={monthKey}>
                                                <TableCell className="text-center text-xs border-l-1 border-gray-200">-</TableCell>
                                                <TableCell className="text-center text-xs">-</TableCell>
                                                <TableCell className="text-center text-xs">-</TableCell>
                                                <TableCell className="text-center text-xs border-r-1 border-gray-200">-</TableCell>
                                            </React.Fragment>
                                        );
                                    }

                                    return (
                                        <React.Fragment key={monthKey}>
                                            <TableCell className="text-center text-xs">{monthData.sessions}</TableCell>
                                            <TableCell className="text-center text-xs">{monthData.real_time_minutes}</TableCell>
                                            <TableCell className="text-center text-xs">{Number(monthData.total_class_hours).toFixed(2)}</TableCell>
                                            <TableCell className="bg-gray-50 text-right text-xs font-semibold border-r-1 border-gray-200">
                                                <div className="flex items-center justify-end gap-1">
                                                    $ {Number(monthData.total_dollars).toFixed(2)}
                                                </div>
                                            </TableCell>
                                        </React.Fragment>
                                    );
                                })}
                            </TableRow>
                        ))}

                        {/* Fila de totales */}
                        {rows.length > 0 && (
                            <TableRow className="border-t-2 border-blue-600 font-bold">
                                <TableCell colSpan={3} className="text-center border-r-1 border-gray-200 ">
                                    TOTALES
                                </TableCell>
                                <TableCell className="text-center text-xs border-b-1 border-gray-200">{rows.reduce((sum, row) => sum + row.totals.grado, 0)}</TableCell>
                                <TableCell className="text-center text-xs border-b-1 border-gray-200">{rows.reduce((sum, row) => sum + row.totals.maestria1, 0)}</TableCell>
                                <TableCell className="text-center text-xs border-b-1 border-gray-200">{rows.reduce((sum, row) => sum + row.totals.maestria2, 0)}</TableCell>
                                <TableCell className="text-center text-xs border-b-1 border-gray-200">{rows.reduce((sum, row) => sum + row.totals.doctor, 0)}</TableCell>
                                <TableCell className="text-center text-xs border-r-1 border-gray-200 border-b-1 border-gray-200">{rows.reduce((sum, row) => sum + row.totals.bilingue, 0)}</TableCell>
                                <TableCell className="text-center text-xs bg-gray-100 border-r-1 border-gray-200 border-b-1 border-gray-200 font-bold">
                                    {rows.reduce((sum, row) => sum + row.totals.grado + row.totals.maestria1 + row.totals.maestria2 + row.totals.doctor + row.totals.bilingue, 0)}
                                </TableCell>

                                {/* Totales por mes */}
                                {sortedMonths.map((monthKey) => {
                                    // Filtrar items del mes actual
                                    const allItemsForMonth = monthlyItems.filter((item) => {
                                        const itemMonthKey = `${item.month_name} ${item.year}`;
                                        return itemMonthKey === monthKey;
                                    });

                                    const sessionsSum = allItemsForMonth.reduce((sum, item) => sum + item.sessions, 0);
                                    const realTimeSum = allItemsForMonth.reduce((sum, item) => sum + item.real_time_minutes, 0);
                                    const hoursSum = allItemsForMonth.reduce((sum, item) => sum + Number(item.total_class_hours), 0);
                                    const dollarsSum = allItemsForMonth.reduce((sum, item) => sum + Number(item.total_dollars), 0);

                                    return (
                                        <React.Fragment key={monthKey}>
                                            <TableCell className="text-center text-xs border-l-1 border-gray-200 border-b-1 border-gray-200">{sessionsSum}</TableCell>
                                            <TableCell className="text-center text-xs border-b-1 border-gray-200">{realTimeSum}</TableCell>
                                            <TableCell className="text-center text-xs border-b-1 border-gray-200">{hoursSum.toFixed(2)}</TableCell>
                                            <TableCell className="bg-gray-100 text-right text-xs font-bold border-r-1 border-gray-200 border-b-1 border-gray-200">
                                                <div className="flex items-center justify-end gap-1">
                                                    $ {dollarsSum.toFixed(2)}
                                                </div>
                                            </TableCell>
                                        </React.Fragment>
                                    );
                                })}
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

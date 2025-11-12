import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/data/table";
import ReactECharts from "echarts-for-react";

interface MonthlyReportSchoolItem {
    school_acronym: string;
    july: number;
    august: number;
    september: number;
    october: number;
    november: number;
    december: number;
    total: number;
}

interface MonthlyReportByFaculty {
    faculty_id: number;
    faculty_name: string;
    faculty_acronym: string;
    schools: MonthlyReportSchoolItem[];
    monthly_totals: {
        july: number;
        august: number;
        september: number;
        october: number;
        november: number;
        december: number;
    };
    monthly_differences: Record<string, number>;
}

interface MonthlyReportByFacultyProps {
    data: MonthlyReportByFaculty[];
}

const monthNames = {
    july: "JULIO",
    august: "AGOSTO",
    september: "SEPTIEMBRE",
    october: "OCTUBRE",
    november: "NOVIEMBRE",
    december: "DICIEMBRE",
};

const monthOrder = ["july", "august", "september", "october", "november", "december"];

export const MonthlyReportByFacultyComponent: React.FC<MonthlyReportByFacultyProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return null;
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("es-SV", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {data.map((facultyReport) => (
                <Card key={facultyReport.faculty_id} className="w-full flex flex-col h-full">
                    <CardHeader>
                        <CardTitle className="text-lg">
                            {facultyReport.faculty_acronym && (
                                <span className="font-mono mr-2">{facultyReport.faculty_acronym}</span>
                            )}
                            {facultyReport.faculty_name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-2">
                            Distribución mensual de los montos presupuestados por escuela durante el período académico seleccionado.
                        </p>
                    </CardHeader>
                    <CardContent className="flex flex-col flex-1">
                        <div className="flex flex-col gap-6 flex-1">
                            {/* Gráfico de barras arriba */}
                            <div className="w-full">
                                <MonthlyReportChart data={facultyReport} />
                            </div>

                            {/* Tabla abajo */}
                            <div className="w-full overflow-x-auto flex-1">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="sticky left-0 bg-white dark:bg-gray-800 z-10 min-w-[100px]">
                                                ESCUELA
                                            </TableHead>
                                            {monthOrder.map((month) => (
                                                <TableHead key={month} className="text-center min-w-[100px]">
                                                    {monthNames[month as keyof typeof monthNames]}
                                                </TableHead>
                                            ))}
                                            <TableHead className="text-center min-w-[100px]">TOTAL</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {facultyReport.schools.map((school) => (
                                            <TableRow key={school.school_acronym}>
                                                <TableCell className="font-medium sticky left-0 bg-white dark:bg-gray-800 z-10">
                                                    {school.school_acronym}
                                                </TableCell>
                                                {monthOrder.map((month) => (
                                                    <TableCell key={month} className="text-center">
                                                        {formatCurrency(school[month as keyof MonthlyReportSchoolItem] as number)}
                                                    </TableCell>
                                                ))}
                                                <TableCell className="text-center font-semibold">
                                                    {formatCurrency(school.total)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {/* Fila de totales mensuales */}
                                        <TableRow className="bg-green-50 dark:bg-green-900/20">
                                            <TableCell className="font-semibold sticky left-0 bg-green-50 dark:bg-green-900/20 z-10">
                                                Total Mensual
                                            </TableCell>
                                            {monthOrder.map((month) => (
                                                <TableCell key={month} className="text-center font-semibold">
                                                    {formatCurrency(
                                                        facultyReport.monthly_totals[month as keyof typeof facultyReport.monthly_totals]
                                                    )}
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-center font-semibold">
                                                {formatCurrency(
                                                    Object.values(facultyReport.monthly_totals).reduce((a, b) => a + b, 0)
                                                )}
                                            </TableCell>
                                        </TableRow>
                                        {/* Fila de diferencias (si existe) */}
                                        {Object.keys(facultyReport.monthly_differences).length > 0 && (
                                            <TableRow>
                                                <TableCell className="sticky left-0 bg-white dark:bg-gray-800 z-10">
                                                    Diferencia
                                                </TableCell>
                                                {monthOrder.map((month) => {
                                                    const diff = facultyReport.monthly_differences[month] || 0;
                                                    return (
                                                        <TableCell
                                                            key={month}
                                                            className={`text-center ${
                                                                diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : ""
                                                            }`}
                                                        >
                                                            {diff !== 0 ? formatCurrency(diff) : ""}
                                                        </TableCell>
                                                    );
                                                })}
                                                <TableCell className="text-center"></TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-muted-foreground">
                            <p className="font-semibold mb-1">Nota:</p>
                            <p>
                                Los valores mostrados representan el presupuesto mensual estimado en dólares para cada escuela de la facultad,
                                calculado en base a las cargas académicas registradas y las tarifas horarias vigentes.
                                Los totales mensuales consolidan las contribuciones de todas las escuelas del período.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

interface MonthlyReportChartProps {
    data: MonthlyReportByFaculty;
}

const MonthlyReportChart: React.FC<MonthlyReportChartProps> = ({ data }) => {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("es-SV", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    // Preparar datos para el gráfico
    const schools = data.schools.map((s) => s.school_acronym);
    const months = monthOrder.map((m) => monthNames[m as keyof typeof monthNames]);

    const series = schools.map((school) => {
        const schoolData = data.schools.find((s) => s.school_acronym === school);
        if (!schoolData) return { name: school, type: "bar", data: [] };

        return {
            name: school,
            type: "bar",
            data: monthOrder.map((month) => schoolData[month as keyof MonthlyReportSchoolItem] as number),
        };
    });

    const option = {
        tooltip: {
            trigger: "axis",
            axisPointer: {
                type: "shadow",
            },
            formatter: (params: any) => {
                let result = `${params[0].axisValue}<br/>`;
                params.forEach((param: any) => {
                    result += `${param.seriesName}: ${formatCurrency(param.value)}<br/>`;
                });
                return result;
            },
        },
        legend: {
            data: schools,
            bottom: 0,
        },
        grid: {
            left: "3%",
            right: "4%",
            bottom: "15%",
            containLabel: true,
        },
        xAxis: {
            type: "category",
            data: months,
            axisLabel: {
                rotate: 45,
            },
        },
        yAxis: {
            type: "value",
            name: "Dólares",
            nameLocation: "middle",
            nameGap: 50,
            nameRotate: 90,
            axisLabel: {
                formatter: (value: number) => formatCurrency(value),
            },
        },
        series: series,
    };

    return (
        <div className="w-full" style={{ height: "400px" }}>
            <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />
        </div>
    );
};

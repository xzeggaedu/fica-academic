import React from "react";
import { useCan, useList } from "@refinedev/core";
import { Unauthorized } from "../unauthorized";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HeatmapSchedule } from "@/components/charts/HeatmapSchedule";
import { StackedByScheduleChart } from "@/components/charts/StackedByScheduleChart";
import { MonthlyTrendChart } from "@/components/charts/MonthlyTrendChart";
import { SimpleDoughnutChart } from "@/components/charts/SimpleDoughnutChart";
import { ComparativeSectionsChart } from "@/components/charts/ComparativeSectionsChart";
import { SectionsBySchoolChart } from "@/components/charts/SectionsBySchoolChart";
import { CategoryPaymentTable } from "@/components/charts/CategoryPaymentTable";
import ReactECharts from "echarts-for-react";
import { useVicerrectorDashboard } from "@/hooks/useVicerrectorDashboard";
import { useSchoolsCrud } from "@/hooks/useSchoolsCrud";
import { TrendingUp, TrendingDown, Minus, Maximize2, Minimize2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/data/table";

// Constantes y tipos para el reporte mensual por facultad
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

const monthNames = {
    july: "JULIO",
    august: "AGOSTO",
    september: "SEPTIEMBRE",
    october: "OCTUBRE",
    november: "NOVIEMBRE",
    december: "DICIEMBRE",
};

const monthOrder = ["july", "august", "september", "october", "november", "december"];

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-SV", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

// Componente wrapper para cards con funcionalidad de maximizar/minimizar
interface MaximizableCardProps {
    cardId: string;
    title: React.ReactNode;
    description?: string;
    children: React.ReactNode;
    isMaximized: boolean;
    onToggleMaximize: (cardId: string) => void;
    defaultClassName?: string;
    enableMaximize?: boolean; // Flag para habilitar/deshabilitar el botón de maximizar
}

const MaximizableCard: React.FC<MaximizableCardProps> = ({
    cardId,
    title,
    description,
    children,
    isMaximized,
    onToggleMaximize,
    defaultClassName = "flex flex-col h-full",
    enableMaximize = false, // Por defecto deshabilitado
}) => {
    return (
        <Card
            className={`${defaultClassName} ${isMaximized ? "md:col-span-2 xl:col-span-3" : ""}`}
        >
            <CardHeader className="relative">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <CardTitle>{title}</CardTitle>
                        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
                    </div>
                    {enableMaximize && (
                        <button
                            onClick={() => onToggleMaximize(cardId)}
                            className="flex-shrink-0 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            aria-label={isMaximized ? "Minimizar" : "Maximizar"}
                        >
                            {isMaximized ? (
                                <Minimize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            ) : (
                                <Maximize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            )}
                        </button>
                    )}
                </div>
            </CardHeader>
            {children}
        </Card>
    );
};

interface MonthlyReportChartProps {
    data: any;
}

const MonthlyReportChart: React.FC<MonthlyReportChartProps> = ({ data }) => {
    const formatCurrencyChart = (value: number) => {
        return new Intl.NumberFormat("es-SV", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    // Preparar datos para el gráfico
    const schools = data.schools.map((s: any) => s.school_acronym);
    const months = monthOrder.map((m) => monthNames[m as keyof typeof monthNames]);

    const series = schools.map((school: string) => {
        const schoolData = data.schools.find((s: any) => s.school_acronym === school);
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
                    result += `${param.seriesName}: ${formatCurrencyChart(param.value)}<br/>`;
                });
                return result;
            },
        },
        legend: {
            data: schools,
            bottom: 0,
        },
        grid: {
            left: "20",
            right: "4%",
            bottom: "15%",
            containLabel: true,
        },
        xAxis: {
            type: "category",
            data: months,
            axisLabel: {
                rotate: 45,
                margin: 10,
            },
        },
        yAxis: {
            type: "value",
            name: "Dólares",
            nameLocation: "middle",
            nameGap: 50,
            nameRotate: 90,
            axisLabel: {
                formatter: (value: number) => formatCurrencyChart(value),
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

export const VicerrectorDashboard: React.FC = () => {
    const { data: canShow } = useCan({ resource: "dashboards-vicerrector", action: "show" });

    // Listado de ciclos y cargas para autoselección
    const { result: termsResult } = useList<any>({ resource: "terms" });
    const { result: filesResult } = useList<any>({
        resource: "academic-load-files",
        pagination: { currentPage: 1, pageSize: 10000, mode: "server" },
    });

    // Obtener facultades activas - usar useList directamente para evitar problemas de permisos
    const { result: facultiesResult } = useList<any>({
        resource: "faculties",
        filters: [
            {
                field: "is_active",
                operator: "eq",
                value: true,
            },
        ],
        pagination: {
            mode: "off",
        },
    });

    const [termId, setTermId] = React.useState<number | null>(null);
    const [facultyId, setFacultyId] = React.useState<number | null>(null); // null = todas las facultades
    const [schoolId, setSchoolId] = React.useState<number | null>(null);
    const [compareTermId, setCompareTermId] = React.useState<number | null>(null);
    const [maximizedCard, setMaximizedCard] = React.useState<string | null>(null);

    // Función para toggle del estado de maximización
    const handleToggleMaximize = (cardId: string) => {
        setMaximizedCard((prev) => (prev === cardId ? null : cardId));
    };

    // Obtener escuelas según la facultad seleccionada
    const { itemsList: schools } = useSchoolsCrud({
        facultyId: facultyId ?? undefined,
        isActiveOnly: true,
        enabled: facultyId !== null, // Solo habilitar cuando hay una facultad seleccionada
    });

    const { data, isLoading } = useVicerrectorDashboard(termId, facultyId, schoolId, compareTermId);

    const termOptions = (termsResult?.data || []).map((t: any) => ({
        value: t.id,
        label: `Ciclo 0${t.term}/${t.year}`,
    }));

    const faculties = facultiesResult?.data || [];
    const facultyOptions = [
        { value: null, label: "Todas las facultades" },
        ...faculties.map((f: any) => ({
            value: f.id,
            label: f.name,
        })),
    ];

    const schoolOptions = (schools || []).map((s: any) => ({
        value: s.id,
        label: s.acronym,
    }));

    // Cuando se cambia la facultad, resetear schoolId a null (todas las escuelas)
    // Esto asegura que siempre se muestren datos consolidados de la nueva facultad
    React.useEffect(() => {
        setSchoolId(null);
    }, [facultyId]);

    // Autoseleccionar el último ciclo que tenga cargas
    React.useEffect(() => {
        if (termId) return; // ya seleccionado
        const items = (filesResult?.data as any[]) || [];
        if (!items.length) return; // no hay cargas
        const latest = items.reduce((acc: any, cur: any) => {
            if (!acc) return cur;
            const ay = acc.term_year ?? acc.term?.year ?? 0;
            const at = acc.term_term ?? acc.term?.term ?? 0;
            const cy = cur.term_year ?? cur.term?.year ?? 0;
            const ct = cur.term_term ?? cur.term?.term ?? 0;
            if (cy > ay) return cur;
            if (cy === ay && ct > at) return cur;
            return acc;
        }, null as any);
        if (latest?.term_id) setTermId(latest.term_id);
    }, [filesResult?.data, termId]);

    // Check authorization after all hooks
    if (canShow && canShow?.can === false) {
        return <Unauthorized />;
    }

    const noLoads = (filesResult?.data?.length ?? 0) === 0;
    if (!termId) {
        return (
            <div className="container mx-auto p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Dashboard del Vicerrector</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground mb-2">
                            {noLoads
                                ? "No hay cargas disponibles en este momento."
                                : "Selecciona un ciclo para comenzar."}
                        </div>
                        <select
                            className="border rounded px-2 py-1"
                            value={termId ?? ""}
                            onChange={(e) => setTermId(Number(e.target.value))}
                        >
                            <option value="">-- Seleccionar ciclo --</option>
                            {termOptions.map((o: any) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isLoading || !data) {
        return (
            <div className="flex justify-center items-center min-h-[40vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    const kpis = data.kpis;
    const charts = data.charts || { heatmap: [], stacked_by_schedule: [], monthly_trend: [] };
    const tables = data.tables || {};

    // Mostrar gráficos comparativos cuando se seleccionan todas las escuelas
    // Esto incluye tanto cuando se seleccionan todas las facultades como cuando se selecciona una facultad específica
    const showComparativeCharts = schoolId === null;

    return (
        <div className="container mx-auto p-4 space-y-6">
            <div className="flex flex-wrap gap-3 items-end">
                <div>
                    <label className="text-xs">Ciclo</label>
                    <select
                        className="border rounded px-2 py-1 ml-2"
                        value={termId ?? ""}
                        onChange={(e) => setTermId(Number(e.target.value))}
                    >
                        {termOptions.map((o: any) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-xs">Facultad</label>
                    <select
                        className="border rounded px-2 py-1 ml-2"
                        value={facultyId ?? ""}
                        onChange={(e) => setFacultyId(e.target.value ? Number(e.target.value) : null)}
                    >
                        {facultyOptions.map((o: any) => (
                            <option key={o.value ?? "all"} value={o.value ?? ""}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </div>
                {facultyId !== null && (
                    <div>
                        <label className="text-xs">Escuela</label>
                        <select
                            className="border rounded px-2 py-1 ml-2"
                            value={schoolId ?? ""}
                            onChange={(e) => setSchoolId(e.target.value ? Number(e.target.value) : null)}
                        >
                            <option value="">Todas las escuelas</option>
                            {schoolOptions.map((o: any) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                <div>
                    <label className="text-xs">Comparar con</label>
                    <select
                        className="border rounded px-2 py-1 ml-2"
                        value={compareTermId ?? ""}
                        onChange={(e) => setCompareTermId(e.target.value ? Number(e.target.value) : null)}
                    >
                        <option value="">Ciclo anterior (auto)</option>
                        {termOptions
                            .filter((o: any) => o.value !== termId)
                            .map((o: any) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                    </select>
                </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
                {/* Widget Horas clase */}
                <Card className="relative pb-1.5">
                    <CardContent className="p-4 py-0 relative pb-0">
                        {data.comparison && (() => {
                            const pct = data.comparison.delta.total_hours.pct;
                            if (pct == null) return null;
                            const isZero = pct === 0;
                            const signUp = pct > 0;
                            const color = isZero ? "text-gray-500" : signUp ? "text-green-600" : "text-red-600";
                            return (
                                <div className="absolute top-[-10px] right-2 flex items-center gap-1">
                                    <span className={`text-xs font-semibold ${color}`}>
                                        {Math.abs(pct * 100).toFixed(1)}%
                                    </span>
                                    {isZero ? (
                                        <Minus className={`w-3 h-3 ${color}`} />
                                    ) : signUp ? (
                                        <TrendingUp className={`w-3 h-3 ${color}`} />
                                    ) : (
                                        <TrendingDown className={`w-3 h-3 ${color}`} />
                                    )}
                                </div>
                            );
                        })()}
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <div className="flex items-start mb-2">
                                    <label className="text-[10px] text-muted-foreground uppercase">Horas clase</label>
                                </div>
                                <p className="sm:text-lg md:text-md lg:text-sm  xl:text-3xl font-bold whitespace-nowrap">{kpis.total_hours.toFixed(2)}</p>
                                {data.comparison && (
                                    <>
                                        <span
                                            className={`text-xs ${(() => {
                                                const pct = data.comparison.delta.total_hours.pct;
                                                if (pct == null) return "text-muted-foreground";
                                                const isZero = pct === 0;
                                                const signUp = pct > 0;
                                                return isZero
                                                    ? "text-gray-500"
                                                    : signUp
                                                        ? "text-green-600"
                                                        : "text-red-600";
                                            })()}`}
                                        >
                                            {(data.comparison.compare.total_hours as number).toFixed(2)}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {" "}
                                            {data.comparison.compare.term_label
                                                ? `Ciclo ${data.comparison.compare.term_label}`
                                                : "Periodo anterior"}
                                        </span>
                                    </>
                                )}
                            </div>
                            {data.comparison && (() => {
                                const base = data.comparison.base.total_hours as number;
                                const cmp = data.comparison.compare.total_hours as number;
                                const baseLabel = data.comparison.base.term_label
                                    ? `Ciclo ${data.comparison.base.term_label}`
                                    : "Actual";
                                const cmpLabel = data.comparison.compare.term_label
                                    ? `Ciclo ${data.comparison.compare.term_label}`
                                    : "Comparado";
                                return (
                                    <div className="flex items-center justify-center mt-6 mb-0 block hidden lg:block">
                                        <SimpleDoughnutChart
                                            data={[
                                                { name: baseLabel, value: base },
                                                { name: cmpLabel, value: cmp },
                                            ]}
                                            colors={["#0ea5e9", "#e5e7eb"]}
                                        />
                                    </div>
                                );
                            })()}
                        </div>
                    </CardContent>
                </Card>

                {/* Widget Total $ */}
                <Card className="relative pb-1.5">
                    <CardContent className="p-4 py-0 relative pb-0">
                        {data.comparison && (() => {
                            const pct = data.comparison.delta.total_dollars.pct;
                            if (pct == null) return null;
                            const isZero = pct === 0;
                            const signUp = pct > 0;
                            const color = isZero ? "text-gray-500" : signUp ? "text-green-600" : "text-red-600";
                            return (
                                <div className="absolute top-[-10px] right-2 flex items-center gap-1">
                                    <span className={`text-xs font-semibold ${color}`}>
                                        {Math.abs(pct * 100).toFixed(1)}%
                                    </span>
                                    {isZero ? (
                                        <Minus className={`w-3 h-3 ${color}`} />
                                    ) : signUp ? (
                                        <TrendingUp className={`w-3 h-3 ${color}`} />
                                    ) : (
                                        <TrendingDown className={`w-3 h-3 ${color}`} />
                                    )}
                                </div>
                            );
                        })()}
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <div className="flex items-start mb-2">
                                    <label className="text-[10px] text-muted-foreground uppercase">Total $</label>
                                </div>
                                <p className="sm:text-lg md:text-md lg:text-sm  xl:text-3xl font-bold whitespace-nowrap">$ {kpis.total_dollars.toFixed(2)}</p>
                                {data.comparison && (
                                    <>
                                        <span
                                            className={`text-xs ${(() => {
                                                const pct = data.comparison.delta.total_dollars.pct;
                                                if (pct == null) return "text-muted-foreground";
                                                const isZero = pct === 0;
                                                const signUp = pct > 0;
                                                return isZero
                                                    ? "text-gray-500"
                                                    : signUp
                                                        ? "text-green-600"
                                                        : "text-red-600";
                                            })()}`}
                                        >
                                            $ {(data.comparison.compare.total_dollars as number).toFixed(2)}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {" "}
                                            {data.comparison.compare.term_label
                                                ? `Ciclo ${data.comparison.compare.term_label}`
                                                : "Periodo anterior"}
                                        </span>
                                    </>
                                )}
                            </div>
                            {data.comparison && (() => {
                                const base = data.comparison.base.total_dollars as number;
                                const cmp = data.comparison.compare.total_dollars as number;
                                const baseLabel = data.comparison.base.term_label
                                    ? `Ciclo ${data.comparison.base.term_label}`
                                    : "Actual";
                                const cmpLabel = data.comparison.compare.term_label
                                    ? `Ciclo ${data.comparison.compare.term_label}`
                                    : "Comparado";
                                return (
                                    <div className="flex items-center justify-center mt-6 mb-0 block hidden lg:block">
                                        <SimpleDoughnutChart
                                            data={[
                                                { name: baseLabel, value: base },
                                                { name: cmpLabel, value: cmp },
                                            ]}
                                            colors={["#10b981", "#e5e7eb"]}
                                        />
                                    </div>
                                );
                            })()}
                        </div>
                    </CardContent>
                </Card>

                {/* Widget Nº grupos */}
                <Card className="relative pb-1.5">
                    <CardContent className="p-4 py-0 relative pb-0">
                        {data.comparison && (() => {
                            const pct = data.comparison.delta.groups_count.pct;
                            if (pct == null) return null;
                            const isZero = pct === 0;
                            const signUp = pct > 0;
                            const color = isZero ? "text-gray-500" : signUp ? "text-green-600" : "text-red-600";
                            return (
                                <div className="absolute top-[-10px] right-2 flex items-center gap-1">
                                    <span className={`text-xs font-semibold ${color}`}>
                                        {Math.abs(pct * 100).toFixed(1)}%
                                    </span>
                                    {isZero ? (
                                        <Minus className={`w-3 h-3 ${color}`} />
                                    ) : signUp ? (
                                        <TrendingUp className={`w-3 h-3 ${color}`} />
                                    ) : (
                                        <TrendingDown className={`w-3 h-3 ${color}`} />
                                    )}
                                </div>
                            );
                        })()}
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <div className="flex items-start mb-2">
                                    <label className="text-[10px] text-muted-foreground uppercase">Nº grupos</label>
                                </div>
                                <p className="sm:text-lg md:text-md lg:text-sm  xl:text-3xl font-bold whitespace-nowrap">
                                    {data.comparison?.base?.groups_count ??
                                        kpis.paid_groups_full + kpis.paid_groups_partial + kpis.paid_groups_none}
                                </p>
                                {data.comparison && (
                                    <>
                                        <span
                                            className={`text-xs ${(() => {
                                                const pct = data.comparison.delta.groups_count.pct;
                                                if (pct == null) return "text-muted-foreground";
                                                const isZero = pct === 0;
                                                const signUp = pct > 0;
                                                return isZero
                                                    ? "text-gray-500"
                                                    : signUp
                                                        ? "text-green-600"
                                                        : "text-red-600";
                                            })()}`}
                                        >
                                            {data.comparison.compare.groups_count}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {" "}
                                            {data.comparison.compare.term_label
                                                ? `Ciclo ${data.comparison.compare.term_label}`
                                                : "Periodo anterior"}
                                        </span>
                                    </>
                                )}
                            </div>
                            {data.comparison && (() => {
                                const base = data.comparison.base.groups_count;
                                const cmp = data.comparison.compare.groups_count;
                                const baseLabel = data.comparison.base.term_label
                                    ? `Ciclo ${data.comparison.base.term_label}`
                                    : "Actual";
                                const cmpLabel = data.comparison.compare.term_label
                                    ? `Ciclo ${data.comparison.compare.term_label}`
                                    : "Comparado";
                                return (
                                    <div className="flex items-center justify-center mt-6 mb-0 block hidden lg:block">
                                        <SimpleDoughnutChart
                                            data={[
                                                { name: baseLabel, value: base },
                                                { name: cmpLabel, value: cmp },
                                            ]}
                                            colors={["#8b5cf6", "#e5e7eb"]}
                                        />
                                    </div>
                                );
                            })()}
                        </div>
                    </CardContent>
                </Card>

                {/* Widget Cobertura (Full) */}
                <Card className="relative pb-1.5">
                    <CardContent className="p-4 py-0 relative pb-0">
                        {data.comparison && (() => {
                            const c = data.comparison;
                            const bt = c.base.coverage.full + c.base.coverage.partial + c.base.coverage.none;
                            const ct = c.compare.coverage.full + c.compare.coverage.partial + c.compare.coverage.none;
                            const bp = bt ? c.base.coverage.full / bt : 0;
                            const cp = ct ? c.compare.coverage.full / ct : 0;
                            const pdelta = bt && ct ? bp - cp : null;
                            if (pdelta == null) return null;
                            const isZero = pdelta === 0;
                            const signUp = pdelta > 0;
                            const color = isZero ? "text-gray-500" : signUp ? "text-green-600" : "text-red-600";
                            return (
                                <div className="absolute top-[-10px] right-2 flex items-center gap-1">
                                    <span className={`text-xs font-semibold ${color}`}>
                                        {Math.abs(pdelta * 100).toFixed(1)}%
                                    </span>
                                    {isZero ? (
                                        <Minus className={`w-3 h-3 ${color}`} />
                                    ) : signUp ? (
                                        <TrendingUp className={`w-3 h-3 ${color}`} />
                                    ) : (
                                        <TrendingDown className={`w-3 h-3 ${color}`} />
                                    )}
                                </div>
                            );
                        })()}
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <div className="flex items-start mb-2">
                                    <label className="text-[10px] text-muted-foreground uppercase">
                                        Cobertura (Full)
                                    </label>
                                </div>
                                <p className="sm:text-lg md:text-md lg:text-sm  xl:text-3xl font-bold whitespace-nowrap">
                                    {(() => {
                                        const total =
                                            kpis.paid_groups_full + kpis.paid_groups_partial + kpis.paid_groups_none ||
                                            0;
                                        return total ? `${((kpis.paid_groups_full / total) * 100).toFixed(1)}%` : "—";
                                    })()}
                                </p>
                                {data.comparison && (() => {
                                    const c = data.comparison;
                                    const bt = c.base.coverage.full + c.base.coverage.partial + c.base.coverage.none;
                                    const ct = c.compare.coverage.full + c.compare.coverage.partial + c.compare.coverage.none;
                                    const bp = bt ? c.base.coverage.full / bt : 0;
                                    const cp = ct ? c.compare.coverage.full / ct : 0;
                                    const pdelta = bt && ct ? bp - cp : null;
                                    const color =
                                        pdelta == null
                                            ? "text-muted-foreground"
                                            : pdelta === 0
                                                ? "text-gray-500"
                                                : pdelta > 0
                                                    ? "text-green-600"
                                                    : "text-red-600";
                                    return (
                                        <>
                                            <span className={`text-xs ${color}`}>{(cp * 100).toFixed(1)}%</span>
                                            <span className="text-xs text-muted-foreground">
                                                {" "}
                                                {data.comparison.compare.term_label
                                                    ? `Ciclo ${data.comparison.compare.term_label}`
                                                    : "Periodo anterior"}
                                            </span>
                                        </>
                                    );
                                })()}
                            </div>
                            {(() => {
                                const full = kpis.paid_groups_full || 0;
                                const partial = kpis.paid_groups_partial || 0;
                                const none = kpis.paid_groups_none || 0;
                                const total = full + partial + none;
                                if (total === 0) return null;
                                return (
                                    <div className="flex items-center justify-center mt-6 mb-0 block hidden lg:block">
                                        <SimpleDoughnutChart
                                            data={[
                                                { name: "Grupos con pago completo (100% o más)", value: full },
                                                { name: "Grupos con pago parcial (menor a 100%)", value: partial },
                                                { name: "Grupos sin pago (0%)", value: none },
                                            ]}
                                            colors={["#22c55e", "#f59e0b", "#ef4444"]}
                                            showTooltip={true}
                                        />
                                    </div>
                                );
                            })()}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Grid unificado para todos los cards excepto la tabla Comparativa */}
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Mapa de calor */}
                <MaximizableCard
                    cardId="heatmap"
                    title="Mapa de calor (días × horarios)"
                    description="Intensidad de horas-clase y costo por bloque de días/horario del ciclo seleccionado."
                    isMaximized={maximizedCard === "heatmap"}
                    onToggleMaximize={handleToggleMaximize}
                >
                    <CardContent className="flex flex-col flex-1">
                        <div className="flex-1">
                            <HeatmapSchedule data={charts.heatmap} metric="hours" />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-2">
                            <span className="font-bold">Nota:</span> Cada cuadro representa un bloque de clases (día y
                            horario). Mientras más oscuro, más horas y mayor costo concentrado en ese bloque. Útil para
                            detectar huecos u horarios con alta carga.
                        </p>
                    </CardContent>
                </MaximizableCard>

                {/* Distribución por nivel y franja */}
                <MaximizableCard
                    cardId="stacked"
                    title="Distribución por nivel y franja"
                    description="Suma de tasas por nivel académico (GDO/M1/M2/DR/BLG) en cada franja horaria."
                    isMaximized={maximizedCard === "stacked"}
                    onToggleMaximize={handleToggleMaximize}
                >
                    <CardContent className="flex flex-col flex-1">
                        <div className="flex-1">
                            <StackedByScheduleChart data={charts.stacked_by_schedule} />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-2">
                            <span className="font-bold">Nota:</span> Muestra qué niveles académicos (Grado, Maestrías,
                            Doctorado, Bilingüe) predominan en cada horario. Sirve para entender dónde se concentran los
                            perfiles más costosos o especializados.
                        </p>
                    </CardContent>
                </MaximizableCard>

                {/* Tendencia mensual */}
                <MaximizableCard
                    cardId="trend"
                    title="Tendencia mensual"
                    description="Sesiones, horas-clase y monto mensual calculado a partir de la planilla."
                    isMaximized={maximizedCard === "trend"}
                    onToggleMaximize={handleToggleMaximize}
                >
                    <CardContent className="flex flex-col flex-1">
                        <div className="flex-1">
                            <MonthlyTrendChart data={charts.monthly_trend} show={["hours", "dollars"]} />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-2">
                            <span className="font-bold">Nota:</span> Evolución del esfuerzo y presupuesto a lo largo del
                            ciclo. Compara cómo cambian las horas-clase y el monto en dólares de un mes a otro para
                            identificar picos y estacionalidad.
                        </p>
                    </CardContent>
                </MaximizableCard>

                {/* Gráfico Comparativo por Modalidad */}
                {showComparativeCharts && charts.comparative_sections && charts.comparative_sections.length > 0 && (
                    <MaximizableCard
                        cardId="comparative"
                        title="Comparativo"
                        description="Comparación del número de secciones por modalidad entre dos ciclos académicos."
                        isMaximized={maximizedCard === "comparative"}
                        onToggleMaximize={handleToggleMaximize}
                    >
                        <CardContent className="flex flex-col flex-1">
                            <div className="flex-1">
                                <ComparativeSectionsChart
                                    data={charts.comparative_sections}
                                    cycleLabel1={
                                        data.comparison?.compare?.term_label
                                            ? data.comparison.compare.term_label
                                            : "Ciclo anterior"
                                    }
                                    cycleLabel2={
                                        data.comparison?.base?.term_label
                                            ? data.comparison.base.term_label
                                            : "Ciclo actual"
                                    }
                                />
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-2">
                                <span className="font-bold">Nota:</span> Muestra el número de secciones por modalidad
                                (Presenciales, En Línea, Virtuales) comparando dos ciclos académicos para identificar
                                cambios en la distribución de modalidades.
                            </p>
                        </CardContent>
                    </MaximizableCard>
                )}

                {/* Gráfico Secciones por Escuela */}
                {showComparativeCharts && charts.sections_by_school && charts.sections_by_school.length > 0 && (
                    <MaximizableCard
                        cardId="sections-by-school"
                        title="Secciones por Escuela"
                        description="Número de secciones por modalidad desglosadas por escuela."
                        isMaximized={maximizedCard === "sections-by-school"}
                        onToggleMaximize={handleToggleMaximize}
                    >
                        <CardContent className="flex flex-col flex-1">
                            <div className="flex-1">
                                <SectionsBySchoolChart
                                    data={charts.sections_by_school}
                                    cycleLabel1={
                                        data.comparison?.compare?.term_label
                                            ? data.comparison.compare.term_label
                                            : "Ciclo anterior"
                                    }
                                    cycleLabel2={
                                        data.comparison?.base?.term_label
                                            ? data.comparison.base.term_label
                                            : "Ciclo actual"
                                    }
                                />
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-2">
                                <span className="font-bold">Nota:</span> Visualiza la distribución de secciones por
                                modalidad en cada escuela, permitiendo comparar cómo se distribuyen las
                                diferentes modalidades entre escuelas.
                            </p>
                        </CardContent>
                    </MaximizableCard>
                )}

                {/* Tabla de Categorías por Estado de Pago */}
                {showComparativeCharts && tables.category_payment && Object.keys(tables.category_payment).length > 0 && (
                    <CategoryPaymentTable
                        data={tables.category_payment}
                        isMaximized={maximizedCard === "category-payment"}
                        onToggleMaximize={() => handleToggleMaximize("category-payment")}
                    />
                )}

                {/* Tabla Comparativa */}
                {data.comparison && (
                    <Card
                       className="md:col-span-2 xl:col-span-3"
                    >
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-left">Métrica</TableHead>
                                        <TableHead className="text-left">
                                            {data.comparison.base.term_label ?? "Actual"}
                                        </TableHead>
                                        <TableHead className="text-left">
                                            {data.comparison.compare.term_label ?? "Comparado"}
                                        </TableHead>
                                        <TableHead className="text-left">Diferencia</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(() => {
                                        const rows = [
                                            {
                                                name: "Horas totales",
                                                base: (data.comparison.base.total_hours as number).toFixed(2),
                                                cmp: (data.comparison.compare.total_hours as number).toFixed(2),
                                                pct: data.comparison.delta.total_hours.pct,
                                            },
                                            {
                                                name: "Dólares totales",
                                                base: `$ ${(data.comparison.base.total_dollars as number).toFixed(2)}`,
                                                cmp: `$ ${(data.comparison.compare.total_dollars as number).toFixed(2)}`,
                                                pct: data.comparison.delta.total_dollars.pct,
                                            },
                                            {
                                                name: "Número de grupos",
                                                base: String(data.comparison.base.groups_count),
                                                cmp: String(data.comparison.compare.groups_count),
                                                pct: data.comparison.delta.groups_count.pct,
                                            },
                                            {
                                                name: "Grupos con pago completo (100% o más)",
                                                base: String(data.comparison.base.coverage.full),
                                                cmp: String(data.comparison.compare.coverage.full),
                                                pct: data.comparison.delta.coverage.full.pct,
                                            },
                                            {
                                                name: "Grupos con pago parcial (menor a 100%)",
                                                base: String(data.comparison.base.coverage.partial),
                                                cmp: String(data.comparison.compare.coverage.partial),
                                                pct: data.comparison.delta.coverage.partial.pct,
                                            },
                                            {
                                                name: "Grupos sin pago (0%)",
                                                base: String(data.comparison.base.coverage.none),
                                                cmp: String(data.comparison.compare.coverage.none),
                                                pct: data.comparison.delta.coverage.none.pct,
                                            },
                                        ];
                                        return rows.map((r, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>{r.name}</TableCell>
                                                <TableCell>{r.base}</TableCell>
                                                <TableCell>{r.cmp}</TableCell>
                                                <TableCell>
                                                    {r.pct == null ? (
                                                        "—"
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1">
                                                            {(() => {
                                                                const isZero = r.pct === 0;
                                                                const signUp = r.pct > 0;
                                                                const color = isZero
                                                                    ? "text-gray-500"
                                                                    : signUp
                                                                        ? "text-green-600"
                                                                        : "text-red-600";
                                                                return (
                                                                    <>
                                                                        {isZero ? (
                                                                            <Minus className={`w-3 h-3 ${color}`} />
                                                                        ) : signUp ? (
                                                                            <TrendingUp className={`w-3 h-3 ${color}`} />
                                                                        ) : (
                                                                            <TrendingDown className={`w-3 h-3 ${color}`} />
                                                                        )}
                                                                        <span className={color}>
                                                                            {(r.pct * 100).toFixed(1)}%
                                                                        </span>
                                                                    </>
                                                                );
                                                            })()}
                                                        </span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ));
                                    })()}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* Comparación de Grupos Pagados/No Pagados por Escuela */}
                {data.comparison && tables.groups_comparison_by_school && tables.groups_comparison_by_school.length > 0 && (
                    <MaximizableCard
                        cardId="groups-comparison"
                        title="Comparación de Grupos por Escuela"
                        description="Comparación de grupos pagados y no pagados por escuela entre dos ciclos académicos."
                        isMaximized={maximizedCard === "groups-comparison"}
                        onToggleMaximize={handleToggleMaximize}
                        defaultClassName="flex flex-col"
                        enableMaximize={true}
                    >
                        <CardContent className="flex flex-col flex-1">
                            {/* Gráfico comparativo */}
                            <div className="w-full mb-6" style={{ height: "400px" }}>
                                <ReactECharts
                                    option={{
                                        tooltip: {
                                            trigger: "axis",
                                            axisPointer: { type: "shadow" },
                                        },
                                        legend: {
                                            data: [
                                                `Pagadas (${data.comparison.base.term_label ?? "Actual"})`,
                                                `No Pagadas (${data.comparison.base.term_label ?? "Actual"})`,
                                                `Pagadas (${data.comparison.compare.term_label ?? "Comparado"})`,
                                                `No Pagadas (${data.comparison.compare.term_label ?? "Comparado"})`,
                                            ],
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
                                            data: tables.groups_comparison_by_school.map((item: any) => item.school_acronym),
                                        },
                                        yAxis: {
                                            type: "value",
                                            name: "Número de Grupos",
                                            nameLocation: "middle",
                                            nameGap: 50,
                                        },
                                        series: [
                                            {
                                                name: `Pagadas (${data.comparison.base.term_label ?? "Actual"})`,
                                                type: "bar",
                                                stack: "base",
                                                data: tables.groups_comparison_by_school.map((item: any) => item.base_paid),
                                                itemStyle: { color: "#22c55e" },
                                            },
                                            {
                                                name: `No Pagadas (${data.comparison.base.term_label ?? "Actual"})`,
                                                type: "bar",
                                                stack: "base",
                                                data: tables.groups_comparison_by_school.map((item: any) => item.base_unpaid),
                                                itemStyle: { color: "#ef4444" },
                                            },
                                            {
                                                name: `Pagadas (${data.comparison.compare.term_label ?? "Comparado"})`,
                                                type: "bar",
                                                stack: "compare",
                                                data: tables.groups_comparison_by_school.map((item: any) => item.compare_paid),
                                                itemStyle: { color: "#86efac" },
                                            },
                                            {
                                                name: `No Pagadas (${data.comparison.compare.term_label ?? "Comparado"})`,
                                                type: "bar",
                                                stack: "compare",
                                                data: tables.groups_comparison_by_school.map((item: any) => item.compare_unpaid),
                                                itemStyle: { color: "#fca5a5" },
                                            },
                                        ],
                                    }}
                                    style={{ height: "100%", width: "100%" }}
                                />
                            </div>

                            {/* Tabla */}
                            <div className="w-full overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-left">Escuela</TableHead>
                                            <TableHead colSpan={3} className="text-center">
                                                {data.comparison.base.term_label ?? "Actual"}
                                            </TableHead>
                                            <TableHead colSpan={3} className="text-center">
                                                {data.comparison.compare.term_label ?? "Comparado"}
                                            </TableHead>
                                        </TableRow>
                                        <TableRow>
                                            <TableHead className="text-left"></TableHead>
                                            <TableHead className="text-center">Pagadas</TableHead>
                                            <TableHead className="text-center">No Pagadas</TableHead>
                                            <TableHead className="text-center">Total</TableHead>
                                            <TableHead className="text-center">Pagadas</TableHead>
                                            <TableHead className="text-center">No Pagadas</TableHead>
                                            <TableHead className="text-center">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tables.groups_comparison_by_school.map((item: any) => (
                                            <TableRow key={item.school_acronym}>
                                                <TableCell className="font-medium">{item.school_name || item.school_acronym}</TableCell>
                                                <TableCell className="text-center">{item.base_paid.toFixed(1)}</TableCell>
                                                <TableCell className="text-center">{item.base_unpaid.toFixed(1)}</TableCell>
                                                <TableCell className="text-center font-semibold">{item.base_total.toFixed(1)}</TableCell>
                                                <TableCell className="text-center">{item.compare_paid.toFixed(1)}</TableCell>
                                                <TableCell className="text-center">{item.compare_unpaid.toFixed(1)}</TableCell>
                                                <TableCell className="text-center font-semibold">{item.compare_total.toFixed(1)}</TableCell>
                                            </TableRow>
                                        ))}
                                        {/* Fila de totales */}
                                        <TableRow className="bg-green-50 dark:bg-green-900/20">
                                            <TableCell className="font-semibold">Total</TableCell>
                                            <TableCell className="text-center font-semibold">
                                                {tables.groups_comparison_by_school
                                                    .reduce((sum: number, item: any) => sum + item.base_paid, 0)
                                                    .toFixed(1)}
                                            </TableCell>
                                            <TableCell className="text-center font-semibold">
                                                {tables.groups_comparison_by_school
                                                    .reduce((sum: number, item: any) => sum + item.base_unpaid, 0)
                                                    .toFixed(1)}
                                            </TableCell>
                                            <TableCell className="text-center font-semibold">
                                                {tables.groups_comparison_by_school
                                                    .reduce((sum: number, item: any) => sum + item.base_total, 0)
                                                    .toFixed(1)}
                                            </TableCell>
                                            <TableCell className="text-center font-semibold">
                                                {tables.groups_comparison_by_school
                                                    .reduce((sum: number, item: any) => sum + item.compare_paid, 0)
                                                    .toFixed(1)}
                                            </TableCell>
                                            <TableCell className="text-center font-semibold">
                                                {tables.groups_comparison_by_school
                                                    .reduce((sum: number, item: any) => sum + item.compare_unpaid, 0)
                                                    .toFixed(1)}
                                            </TableCell>
                                            <TableCell className="text-center font-semibold">
                                                {tables.groups_comparison_by_school
                                                    .reduce((sum: number, item: any) => sum + item.compare_total, 0)
                                                    .toFixed(1)}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-4">
                                <span className="font-bold">Nota:</span> Muestra la comparación de grupos pagados y no pagados por escuela entre dos ciclos académicos.
                                Los grupos pagados representan aquellos con tasa de pago completa (100% o más), mientras que los no pagados representan aquellos con tasa de pago del 0%.
                            </p>
                        </CardContent>
                    </MaximizableCard>
                )}

                {/* Reporte Mensual por Facultad - Los cards individuales ya están dentro del componente */}
                {showComparativeCharts && tables.monthly_report_by_faculty && tables.monthly_report_by_faculty.length > 0 && (
                    <>
                        {(() => {
                            // Filtrar por facultad si está seleccionada
                            const filteredReports = facultyId
                                ? tables.monthly_report_by_faculty.filter((report: any) => report.faculty_id === facultyId)
                                : tables.monthly_report_by_faculty;

                            return filteredReports.map((facultyReport: any) => (
                                <MaximizableCard
                                    key={facultyReport.faculty_id}
                                    cardId={`monthly-report-${facultyReport.faculty_id}`}
                                    title={
                                        <>
                                            {facultyReport.faculty_acronym && (
                                                <span className="font-mono mr-2">{facultyReport.faculty_acronym}</span>
                                            )}
                                            {facultyReport.faculty_name}
                                        </>
                                    }
                                    description="Distribución mensual de los montos presupuestados por escuela durante el período académico seleccionado."
                                    isMaximized={maximizedCard === `monthly-report-${facultyReport.faculty_id}`}
                                    onToggleMaximize={handleToggleMaximize}
                                    defaultClassName="w-full flex flex-col h-full"
                                    enableMaximize={true}
                                >
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
                                                        {facultyReport.schools.map((school: any) => (
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
                                                                    (Object.values(facultyReport.monthly_totals) as number[]).reduce((a, b) => a + b, 0)
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
                                                                            className={`text-center ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : ""
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
                                </MaximizableCard>
                            ));
                        })()}
                    </>
                )}


            </section>
        </div>
    );
};

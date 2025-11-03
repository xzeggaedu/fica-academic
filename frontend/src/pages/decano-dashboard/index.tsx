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
import { useDecanoDashboard } from "@/hooks/useDecanoDashboard";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/data/table";

export const DecanoDashboard: React.FC = () => {
    const { data: canShow } = useCan({ resource: "dashboards-decano", action: "show" });

    // Listado de ciclos y cargas para autoselección
    const { result: termsResult } = useList<any>({ resource: "terms" });
    const { result: filesResult } = useList<any>({
        resource: "academic-load-files",
        pagination: { currentPage: 1, pageSize: 10000, mode: "server" },
    });
    const [termId, setTermId] = React.useState<number | null>(null);
    const [schoolId, setSchoolId] = React.useState<number | null>(null);
    const [compareTermId, setCompareTermId] = React.useState<number | null>(null);
    const [availableSchools, setAvailableSchools] = React.useState<Array<{ value: number; label: string }>>([]);

    const { data, isLoading } = useDecanoDashboard(termId, schoolId, compareTermId);

    const termOptions = (termsResult?.data || []).map((t: any) => ({
        value: t.id,
        label: `Ciclo 0${t.term}/${t.year}`,
    }));

    // Mantener opciones de escuelas disponibles incluso durante recargas
    React.useEffect(() => {
        if (data?.context?.school_ids && data.context.school_acronyms && data.context.school_ids.length > 0) {
            const schools = data.context.school_ids.map((id: number, index: number) => ({
                value: id,
                label: data.context.school_acronyms?.[index] || `Escuela ${id}`,
            }));
            // Solo actualizar si las escuelas son diferentes (evitar renders innecesarios)
            setAvailableSchools(prev => {
                const prevIds = prev.map(s => s.value).sort().join(',');
                const newIds = schools.map(s => s.value).sort().join(',');
                if (prevIds !== newIds) {
                    return schools;
                }
                return prev;
            });
        }
    }, [data?.context?.school_ids, data?.context?.school_acronyms]);

    const schoolOptions = availableSchools;

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
                        <CardTitle>Dashboard del Decano</CardTitle>
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
                                <p className="text-3xl font-bold">{kpis.total_hours.toFixed(2)}</p>
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
                                    <div className="flex items-center justify-center mt-2 mb-0">
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
                                <p className="text-3xl font-bold">$ {kpis.total_dollars.toFixed(2)}</p>
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
                                    <div className="flex items-center justify-center mt-2 mb-0">
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
                                <p className="text-3xl font-bold">
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
                                    <div className="flex items-center justify-center mt-2 mb-0">
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
                                <p className="text-3xl font-bold">
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
                                    <div className="flex items-center justify-center mt-2 mb-0">
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

            <section className="grid md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Mapa de calor (días × horarios)</CardTitle>
                        <p className="text-xs text-muted-foreground">
                            Intensidad de horas-clase y costo por bloque de días/horario del ciclo seleccionado.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <HeatmapSchedule data={charts.heatmap} metric="hours" />
                        <p className="text-[11px] text-muted-foreground mt-2">
                            <span className="font-bold">Nota:</span> Cada cuadro representa un bloque de clases (día y
                            horario). Mientras más oscuro, más horas y mayor costo concentrado en ese bloque. Útil para
                            detectar huecos u horarios con alta carga.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Distribución por nivel y franja</CardTitle>
                        <p className="text-xs text-muted-foreground">
                            Suma de tasas por nivel académico (GDO/M1/M2/DR/BLG) en cada franja horaria.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <StackedByScheduleChart data={charts.stacked_by_schedule} />
                        <p className="text-[11px] text-muted-foreground mt-2">
                            <span className="font-bold">Nota:</span> Muestra qué niveles académicos (Grado, Maestrías,
                            Doctorado, Bilingüe) predominan en cada horario. Sirve para entender dónde se concentran los
                            perfiles más costosos o especializados.
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Tendencia mensual</CardTitle>
                        <p className="text-xs text-muted-foreground">
                            Sesiones, horas-clase y monto mensual calculado a partir de la planilla.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <MonthlyTrendChart data={charts.monthly_trend} show={["hours", "dollars"]} />
                        <p className="text-[11px] text-muted-foreground mt-2">
                            <span className="font-bold">Nota:</span> Evolución del esfuerzo y presupuesto a lo largo del
                            ciclo. Compara cómo cambian las horas-clase y el monto en dólares de un mes a otro para
                            identificar picos y estacionalidad.
                        </p>
                    </CardContent>
                </Card>
            </section>
            {/* Solo mostrar estos charts cuando se seleccionan todas las escuelas */}
            {!schoolId && (
                <section className="grid md:grid-cols-3 gap-4">
                    {/* Gráfico Comparativo por Modalidad */}
                    {charts.comparative_sections && charts.comparative_sections.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Comparativo</CardTitle>
                            <p className="text-xs text-muted-foreground">
                                Comparación del número de secciones por modalidad entre dos ciclos académicos.
                            </p>
                        </CardHeader>
                        <CardContent>
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
                            <p className="text-[11px] text-muted-foreground mt-2">
                                <span className="font-bold">Nota:</span> Muestra el número de secciones por modalidad
                                (Presenciales, En Línea, Virtuales) comparando dos ciclos académicos para identificar
                                cambios en la distribución de modalidades.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Gráfico Secciones por Escuela */}
                {charts.sections_by_school && charts.sections_by_school.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Secciones por Escuela</CardTitle>
                            <p className="text-xs text-muted-foreground">
                                Número de secciones por modalidad desglosadas por escuela.
                            </p>
                        </CardHeader>
                        <CardContent>
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
                            <p className="text-[11px] text-muted-foreground mt-2">
                                <span className="font-bold">Nota:</span> Visualiza la distribución de secciones por
                                modalidad en cada escuela de la facultad, permitiendo comparar cómo se distribuyen las
                                diferentes modalidades entre escuelas.
                            </p>
                        </CardContent>
                    </Card>
                    )}

                    {/* Tabla de Categorías por Estado de Pago */}
                    {tables.category_payment && Object.keys(tables.category_payment).length > 0 && (
                        <CategoryPaymentTable data={tables.category_payment} />
                    )}
                </section>
            )}

            <section className="">
                {data.comparison && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Comparativa</CardTitle>
                        </CardHeader>
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
            </section>
        </div>
    );
};

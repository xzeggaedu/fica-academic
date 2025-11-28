import React from "react";
import { useCan, useList } from "@refinedev/core";
import { Unauthorized } from "../unauthorized";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HeatmapSchedule } from "@/components/charts/HeatmapSchedule";
import { StackedByScheduleChart } from "@/components/charts/StackedByScheduleChart";
import { MonthlyTrendChart } from "@/components/charts/MonthlyTrendChart";
import { SimpleDoughnutChart } from "@/components/charts/SimpleDoughnutChart";
import { useDirectorDashboard } from "@/hooks/useDirectorDashboard";
import { TrendingUp, TrendingDown, Minus, Maximize2, Minimize2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/data/table";

// Componente wrapper para cards con funcionalidad de maximizar/minimizar
interface MaximizableCardProps {
    cardId: string;
    title: React.ReactNode;
    description?: string;
    children: React.ReactNode;
    isMaximized: boolean;
    onToggleMaximize: (cardId: string, gridRowStart?: number) => void;
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
    const cardRef = React.useRef<HTMLDivElement>(null);
    const [gridRowStart, setGridRowStart] = React.useState<number | undefined>(undefined);

    const handleClick = () => {
        if (!isMaximized && cardRef.current) {
            // Calcular la fila ANTES de maximizar
            const element = cardRef.current;
            const parent = element.parentElement;
            if (parent) {
                const gridItems = Array.from(parent.children) as HTMLElement[];
                const currentIndex = gridItems.indexOf(element);

                // Calcular columnas por fila según el tamaño de ventana
                const windowWidth = window.innerWidth;

                let colsPerRow = 1;
                if (windowWidth >= 1280) {
                    colsPerRow = 3; // xl:grid-cols-3
                } else if (windowWidth >= 768) {
                    colsPerRow = 2; // md:grid-cols-2
                }

                // Calcular la fila basándose en el índice
                const rowByIndex = Math.floor(currentIndex / colsPerRow) + 1;
                setGridRowStart(rowByIndex);
                onToggleMaximize(cardId, rowByIndex);
            } else {
                onToggleMaximize(cardId);
            }
        } else {
            setGridRowStart(undefined);
            onToggleMaximize(cardId);
        }
    };

    return (
        <Card
            ref={cardRef}
            className={`${defaultClassName} ${isMaximized ? "md:col-span-2 xl:col-span-3" : ""}`}
            style={
                isMaximized && gridRowStart
                    ? { gridColumnStart: 1, gridRowStart: gridRowStart }
                    : {}
            }
        >
            <CardHeader className="relative">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <CardTitle>{title}</CardTitle>
                        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
                    </div>
                    {enableMaximize && (
                        <button
                            onClick={handleClick}
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

export const DirectorDashboard: React.FC = () => {
    const { data: canShow } = useCan({ resource: "dashboards-director", action: "show" });

    // Listado de ciclos y cargas para autoselección
    const { result: termsResult } = useList<any>({ resource: "terms" });
    const { result: filesResult } = useList<any>({
        resource: "academic-load-files",
        pagination: { currentPage: 1, pageSize: 10000, mode: "server" },
    });
    const [termId, setTermId] = React.useState<number | null>(null);
    const [compareTermId, setCompareTermId] = React.useState<number | null>(null);
    const [maximizedCard, setMaximizedCard] = React.useState<string | null>(null);

    // Función para toggle del estado de maximización
    const handleToggleMaximize = (cardId: string, _gridRowStart?: number) => {
        setMaximizedCard((prev) => (prev === cardId ? null : cardId));
    };

    // Siempre usar null para fileId, así el backend automáticamente selecciona la versión activa
    const fileId = null;

    const { data, isLoading } = useDirectorDashboard(termId, fileId, compareTermId);

    const termOptions = (termsResult?.data || []).map((t: any) => ({ value: t.id, label: `Ciclo 0${t.term}/${t.year}` }));

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
                        <CardTitle>Dashboard del Director</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground mb-2">
                            {noLoads ? "No hay cargas disponibles en este momento." : "Selecciona un ciclo para comenzar."}
                        </div>
                        <select className="border rounded px-2 py-1" value={termId ?? ''} onChange={(e) => setTermId(Number(e.target.value))}>
                            <option value="">-- Seleccionar ciclo --</option>
                            {termOptions.map((o: any) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
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

    return (
        <div className="container mx-auto p-4 space-y-6">
            <div className="flex flex-wrap gap-3 items-end">
                <div>
                    <label className="text-xs">Ciclo</label>
                    <select className="border rounded px-2 py-1 ml-2" value={termId ?? ''} onChange={(e) => setTermId(Number(e.target.value))}>
                        {termOptions.map((o: any) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-xs">Comparar con</label>
                    <select className="border rounded px-2 py-1 ml-2" value={compareTermId ?? ''} onChange={(e) => setCompareTermId(e.target.value ? Number(e.target.value) : null)}>
                        <option value="">Ciclo anterior (auto)</option>
                        {termOptions
                            .filter((o: any) => o.value !== termId)
                            .map((o: any) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
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
                            const color = isZero ? 'text-gray-500' : (signUp ? 'text-green-600' : 'text-red-600');
                            return (
                                <div className="absolute top-[-10px] right-2 flex items-center gap-1">
                                    <span className={`text-xs font-semibold ${color}`}>{Math.abs(pct * 100).toFixed(1)}%</span>
                                    {isZero ? <Minus className={`w-3 h-3 ${color}`} /> : (signUp ? <TrendingUp className={`w-3 h-3 ${color}`} /> : <TrendingDown className={`w-3 h-3 ${color}`} />)}
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
                                        <span className={`text-xs ${(() => {
                                            const pct = data.comparison.delta.total_hours.pct;
                                            if (pct == null) return 'text-muted-foreground';
                                            const isZero = pct === 0;
                                            const signUp = pct > 0;
                                            return isZero ? 'text-gray-500' : (signUp ? 'text-green-600' : 'text-red-600');
                                        })()}`}>
                                            {(data.comparison.compare.total_hours as number).toFixed(2)}
                                        </span>
                                        <span className="text-xs text-muted-foreground"> {data.comparison.compare.term_label ? `Ciclo ${data.comparison.compare.term_label}` : 'Periodo anterior'}</span>
                                    </>
                                )}
                            </div>
                            {data.comparison && (() => {
                                const base = data.comparison.base.total_hours as number;
                                const cmp = data.comparison.compare.total_hours as number;
                                const baseLabel = data.comparison.base.term_label ? `Ciclo ${data.comparison.base.term_label}` : 'Actual';
                                const cmpLabel = data.comparison.compare.term_label ? `Ciclo ${data.comparison.compare.term_label}` : 'Comparado';
                                return (
                                    <div className="flex items-center justify-center mt-2 mb-0">
                                        <SimpleDoughnutChart
                                            data={[
                                                { name: baseLabel, value: base },
                                                { name: cmpLabel, value: cmp },
                                            ]}
                                            colors={['#0ea5e9', '#e5e7eb']}
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
                            const color = isZero ? 'text-gray-500' : (signUp ? 'text-green-600' : 'text-red-600');
                            return (
                                <div className="absolute top-[-10px] right-2 flex items-center gap-1">
                                    <span className={`text-xs font-semibold ${color}`}>{Math.abs(pct * 100).toFixed(1)}%</span>
                                    {isZero ? <Minus className={`w-3 h-3 ${color}`} /> : (signUp ? <TrendingUp className={`w-3 h-3 ${color}`} /> : <TrendingDown className={`w-3 h-3 ${color}`} />)}
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
                                        <span className={`text-xs ${(() => {
                                            const pct = data.comparison.delta.total_dollars.pct;
                                            if (pct == null) return 'text-muted-foreground';
                                            const isZero = pct === 0;
                                            const signUp = pct > 0;
                                            return isZero ? 'text-gray-500' : (signUp ? 'text-green-600' : 'text-red-600');
                                        })()}`}>
                                            $ {(data.comparison.compare.total_dollars as number).toFixed(2)}
                                        </span>
                                        <span className="text-xs text-muted-foreground"> {data.comparison.compare.term_label ? `Ciclo ${data.comparison.compare.term_label}` : 'Periodo anterior'}</span>
                                    </>
                                )}
                            </div>
                            {data.comparison && (() => {
                                const base = data.comparison.base.total_dollars as number;
                                const cmp = data.comparison.compare.total_dollars as number;
                                const baseLabel = data.comparison.base.term_label ? `Ciclo ${data.comparison.base.term_label}` : 'Actual';
                                const cmpLabel = data.comparison.compare.term_label ? `Ciclo ${data.comparison.compare.term_label}` : 'Comparado';
                                return (
                                    <div className="flex items-center justify-center mt-2 mb-0">
                                        <SimpleDoughnutChart
                                            data={[
                                                { name: baseLabel, value: base },
                                                { name: cmpLabel, value: cmp },
                                            ]}
                                            colors={['#10b981', '#e5e7eb']}
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
                            const color = isZero ? 'text-gray-500' : (signUp ? 'text-green-600' : 'text-red-600');
                            return (
                                <div className="absolute top-[-10px] right-2 flex items-center gap-1">
                                    <span className={`text-xs font-semibold ${color}`}>{Math.abs(pct * 100).toFixed(1)}%</span>
                                    {isZero ? <Minus className={`w-3 h-3 ${color}`} /> : (signUp ? <TrendingUp className={`w-3 h-3 ${color}`} /> : <TrendingDown className={`w-3 h-3 ${color}`} />)}
                                </div>
                            );
                        })()}
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <div className="flex items-start mb-2">
                                    <label className="text-[10px] text-muted-foreground uppercase">Nº grupos</label>
                                </div>
                                <p className="text-3xl font-bold">{data.comparison?.base?.groups_count ?? (kpis.paid_groups_full + kpis.paid_groups_partial + kpis.paid_groups_none)}</p>
                                {data.comparison && (
                                    <>
                                        <span className={`text-xs ${(() => {
                                            const pct = data.comparison.delta.groups_count.pct;
                                            if (pct == null) return 'text-muted-foreground';
                                            const isZero = pct === 0;
                                            const signUp = pct > 0;
                                            return isZero ? 'text-gray-500' : (signUp ? 'text-green-600' : 'text-red-600');
                                        })()}`}>
                                            {data.comparison.compare.groups_count}
                                        </span>
                                        <span className="text-xs text-muted-foreground"> {data.comparison.compare.term_label ? `Ciclo ${data.comparison.compare.term_label}` : 'Periodo anterior'}</span>
                                    </>
                                )}
                            </div>
                            {data.comparison && (() => {
                                const base = data.comparison.base.groups_count;
                                const cmp = data.comparison.compare.groups_count;
                                const baseLabel = data.comparison.base.term_label ? `Ciclo ${data.comparison.base.term_label}` : 'Actual';
                                const cmpLabel = data.comparison.compare.term_label ? `Ciclo ${data.comparison.compare.term_label}` : 'Comparado';
                                return (
                                    <div className="flex items-center justify-center mt-2 mb-0">
                                        <SimpleDoughnutChart
                                            data={[
                                                { name: baseLabel, value: base },
                                                { name: cmpLabel, value: cmp },
                                            ]}
                                            colors={['#8b5cf6', '#e5e7eb']}
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
                            const pdelta = bt && ct ? (bp - cp) : null;
                            if (pdelta == null) return null;
                            const isZero = pdelta === 0;
                            const signUp = pdelta > 0;
                            const color = isZero ? 'text-gray-500' : (signUp ? 'text-green-600' : 'text-red-600');
                            return (
                                <div className="absolute top-[-10px] right-2 flex items-center gap-1">
                                    <span className={`text-xs font-semibold ${color}`}>{Math.abs(pdelta * 100).toFixed(1)}%</span>
                                    {isZero ? <Minus className={`w-3 h-3 ${color}`} /> : (signUp ? <TrendingUp className={`w-3 h-3 ${color}`} /> : <TrendingDown className={`w-3 h-3 ${color}`} />)}
                                </div>
                            );
                        })()}
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <div className="flex items-start mb-2">
                                    <label className="text-[10px] text-muted-foreground uppercase">Cobertura (Full)</label>
                                </div>
                                <p className="text-3xl font-bold">{(() => {
                                    const total = (kpis.paid_groups_full + kpis.paid_groups_partial + kpis.paid_groups_none) || 0;
                                    return total ? `${((kpis.paid_groups_full / total) * 100).toFixed(1)}%` : '—';
                                })()}</p>
                                {data.comparison && (() => {
                                    const c = data.comparison;
                                    const bt = c.base.coverage.full + c.base.coverage.partial + c.base.coverage.none;
                                    const ct = c.compare.coverage.full + c.compare.coverage.partial + c.compare.coverage.none;
                                    const bp = bt ? c.base.coverage.full / bt : 0;
                                    const cp = ct ? c.compare.coverage.full / ct : 0;
                                    const pdelta = bt && ct ? (bp - cp) : null;
                                    const color = pdelta == null ? 'text-muted-foreground' : (pdelta === 0 ? 'text-gray-500' : (pdelta > 0 ? 'text-green-600' : 'text-red-600'));
                                    return (
                                        <>
                                            <span className={`text-xs ${color}`}>
                                                {(cp * 100).toFixed(1)}%
                                            </span>
                                            <span className="text-xs text-muted-foreground"> {data.comparison.compare.term_label ? `Ciclo ${data.comparison.compare.term_label}` : 'Periodo anterior'}</span>
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
                                                { name: 'Grupos con pago completo (100% o más)', value: full },
                                                { name: 'Grupos con pago parcial (menor a 100%)', value: partial },
                                                { name: 'Grupos sin pago (0%)', value: none },
                                            ]}
                                            colors={['#22c55e', '#f59e0b', '#ef4444']}
                                            showTooltip={true}
                                        />
                                    </div>
                                );
                            })()}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Grid unificado para todos los cards */}
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <MaximizableCard
                    cardId="heatmap"
                    title="Mapa de calor (días × horarios)"
                    description="Intensidad de horas-clase y costo por bloque de días/horario del ciclo seleccionado."
                    isMaximized={maximizedCard === "heatmap"}
                    onToggleMaximize={handleToggleMaximize}
                    enableMaximize={true}
                >
                    <CardContent className="flex flex-col flex-1">
                        <div className="flex-1">
                            <HeatmapSchedule data={charts.heatmap} metric="hours" />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-2">
                            <span className="font-bold">Nota:</span> Cada cuadro representa un bloque de clases (día y horario). Mientras más oscuro, más horas y mayor costo concentrado en ese bloque. Útil para detectar huecos u horarios con alta carga.</p>
                    </CardContent>
                </MaximizableCard>

                <MaximizableCard
                    cardId="stacked"
                    title="Distribución por nivel y franja"
                    description="Suma de tasas por nivel académico (GDO/M1/M2/DR/BLG) en cada franja horaria."
                    isMaximized={maximizedCard === "stacked"}
                    onToggleMaximize={handleToggleMaximize}
                    enableMaximize={true}
                >
                    <CardContent className="flex flex-col flex-1">
                        <div className="flex-1">
                            <StackedByScheduleChart data={charts.stacked_by_schedule} />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-2">
                            <span className="font-bold">Nota:</span> Muestra qué niveles académicos (Grado, Maestrías, Doctorado, Bilingüe) predominan en cada horario. Sirve para entender dónde se concentran los perfiles más costosos o especializados.</p>
                    </CardContent>
                </MaximizableCard>

                <MaximizableCard
                    cardId="trend"
                    title="Tendencia mensual"
                    description="Sesiones, horas-clase y monto mensual calculado a partir de la planilla."
                    isMaximized={maximizedCard === "trend"}
                    onToggleMaximize={handleToggleMaximize}
                    enableMaximize={true}
                >
                    <CardContent className="flex flex-col flex-1">
                        <div className="flex-1">
                            <MonthlyTrendChart data={charts.monthly_trend} show={["hours", "dollars"]} />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-2">
                            <span className="font-bold">Nota:</span> Evolución del esfuerzo y presupuesto a lo largo del ciclo. Compara cómo cambian las horas-clase y el monto en dólares de un mes a otro para identificar picos y estacionalidad.</p>
                    </CardContent>
                </MaximizableCard>
            </section>


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
                                        <TableHead className="text-left">{data.comparison.base.term_label ?? 'Actual'}</TableHead>
                                        <TableHead className="text-left">{data.comparison.compare.term_label ?? 'Comparado'}</TableHead>
                                        <TableHead className="text-left">Diferencia</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(() => {
                                        const rows = [
                                            {
                                                name: 'Horas totales',
                                                base: (data.comparison.base.total_hours as number).toFixed(2),
                                                cmp: (data.comparison.compare.total_hours as number).toFixed(2),
                                                pct: data.comparison.delta.total_hours.pct,
                                            },
                                            {
                                                name: 'Dólares totales',
                                                base: `$ ${(data.comparison.base.total_dollars as number).toFixed(2)}`,
                                                cmp: `$ ${(data.comparison.compare.total_dollars as number).toFixed(2)}`,
                                                pct: data.comparison.delta.total_dollars.pct,
                                            },
                                            {
                                                name: 'Número de grupos',
                                                base: String(data.comparison.base.groups_count),
                                                cmp: String(data.comparison.compare.groups_count),
                                                pct: data.comparison.delta.groups_count.pct,
                                            },
                                        {
                                            name: 'Grupos con pago completo (100% o más)',
                                            base: String(data.comparison.base.coverage.full),
                                            cmp: String(data.comparison.compare.coverage.full),
                                            pct: data.comparison.delta.coverage.full.pct,
                                        },
                                        {
                                            name: 'Grupos con pago parcial (menor a 100%)',
                                            base: String(data.comparison.base.coverage.partial),
                                            cmp: String(data.comparison.compare.coverage.partial),
                                            pct: data.comparison.delta.coverage.partial.pct,
                                        },
                                        {
                                            name: 'Grupos sin pago (0%)',
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
                                                    {r.pct == null ? '—' : (
                                                        <span className="inline-flex items-center gap-1">
                                                            {(() => {
                                                                const isZero = r.pct === 0;
                                                                const signUp = r.pct > 0;
                                                                const color = isZero ? 'text-gray-500' : (signUp ? 'text-green-600' : 'text-red-600');
                                                                return (
                                                                    <>
                                                                        {isZero ? <Minus className={`w-3 h-3 ${color}`} /> : (signUp ? <TrendingUp className={`w-3 h-3 ${color}`} /> : <TrendingDown className={`w-3 h-3 ${color}`} />)}
                                                                        <span className={color}>{(r.pct * 100).toFixed(1)}%</span>
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

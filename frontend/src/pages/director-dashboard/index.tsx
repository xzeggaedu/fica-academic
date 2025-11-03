import React from "react";
import { useCan, useList } from "@refinedev/core";
import { Unauthorized } from "../unauthorized";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HeatmapSchedule } from "@/components/charts/HeatmapSchedule";
import { StackedByScheduleChart } from "@/components/charts/StackedByScheduleChart";
import { MonthlyTrendChart } from "@/components/charts/MonthlyTrendChart";
import { useDirectorDashboard } from "@/hooks/useDirectorDashboard";

export const DirectorDashboard: React.FC = () => {
    const { data: canShow } = useCan({ resource: "dashboards-director", action: "show" });
    if (canShow && canShow?.can === false) return <Unauthorized />;

    // Listado de ciclos y cargas para autoselección
    const { query: termsQuery, result: termsResult } = useList<any>({ resource: "terms" });
    const { result: filesResult, query: filesQuery } = useList<any>({
        resource: "academic-load-files",
        pagination: { currentPage: 1, pageSize: 10000, mode: "server" },
    });
    const [termId, setTermId] = React.useState<number | null>(null);
    const [fileId, setFileId] = React.useState<number | null>(null);

    const { data, isLoading } = useDirectorDashboard(termId, fileId);

    React.useEffect(() => {
        if (data?.context?.file_id_selected && fileId == null) {
            setFileId(data.context.file_id_selected);
        }
    }, [data?.context?.file_id_selected]);

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
                {data.context?.file_versions?.length ? (
                    <div>
                        <label className="text-xs">Versión</label>
                        <select className="border rounded px-2 py-1 ml-2" value={fileId ?? ''} onChange={(e) => setFileId(Number(e.target.value))}>
                            {data.context.file_versions.map((fv: any) => (
                                <option key={fv.file_id} value={fv.file_id}>v{fv.version} {fv.is_active ? '(activa)' : ''}</option>
                            ))}
                        </select>
                    </div>
                ) : null}
            </div>


            <Card className="gap-1">
                <CardHeader><CardTitle className="text-xl">{termOptions.find((o: any) => o.value === termId)?.label}</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs uppercase text-muted-foreground">Horas clase</label>
                            <p className="text-3xl font-bold">{kpis.total_hours.toFixed(2)}</p>
                        </div>
                        <div>
                            <label className="text-xs uppercase text-muted-foreground">Total $</label>
                            <p className="text-3xl font-bold">$ {kpis.total_dollars.toFixed(2)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <section className="grid md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Mapa de calor (días × horarios)</CardTitle>
                        <p className="text-xs text-muted-foreground">Intensidad de horas-clase y costo por bloque de días/horario del ciclo seleccionado.</p>
                    </CardHeader>
                    <CardContent>
                        <HeatmapSchedule data={charts.heatmap} metric="hours" />
                        <p className="text-[11px] text-muted-foreground mt-2">
                            <span className="font-bold">Nota:</span> Cada cuadro representa un bloque de clases (día y horario). Mientras más oscuro, más horas y mayor costo concentrado en ese bloque. Útil para detectar huecos u horarios con alta carga.</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Distribución por nivel y franja</CardTitle>
                        <p className="text-xs text-muted-foreground">Suma de tasas por nivel académico (GDO/M1/M2/DR/BLG) en cada franja horaria.</p>
                    </CardHeader>
                    <CardContent>
                        <StackedByScheduleChart data={charts.stacked_by_schedule} />
                        <p className="text-[11px] text-muted-foreground mt-2">
                            <span className="font-bold">Nota:</span> Muestra qué niveles académicos (Grado, Maestrías, Doctorado, Bilingüe) predominan en cada horario. Sirve para entender dónde se concentran los perfiles más costosos o especializados.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Tendencia mensual</CardTitle>
                        <p className="text-xs text-muted-foreground">Sesiones, horas-clase y monto mensual calculado a partir de la planilla.</p>
                    </CardHeader>
                    <CardContent>
                        <MonthlyTrendChart data={charts.monthly_trend} show={["hours", "dollars"]} />
                        <p className="text-[11px] text-muted-foreground mt-2">
                            <span className="font-bold">Nota:</span> Evolución del esfuerzo y presupuesto a lo largo del ciclo. Compara cómo cambian las horas-clase y el monto en dólares de un mes a otro para identificar picos y estacionalidad.</p>
                    </CardContent>
                </Card>
            </section>


        </div>
    );
};

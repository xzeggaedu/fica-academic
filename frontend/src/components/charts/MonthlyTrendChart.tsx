import React from "react";
import ReactECharts from "echarts-for-react";

type Trend = { month: string; sessions: number; hours: number; dollars: number };

export const MonthlyTrendChart: React.FC<{ data: Trend[]; show?: ("sessions" | "hours" | "dollars")[] }> = ({ data, show = ["hours", "dollars"] }) => {
  const dims = ["month", ...show];
  const nf = new Intl.NumberFormat("es-SV", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const cf = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const df = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });

  // Mapeo de nombres de series a español
  const seriesNameMap: Record<string, string> = {
    hours: "Horas",
    dollars: "Dólares",
    sessions: "Sesiones",
  };

  // Mapeo inverso para obtener el nombre original desde el traducido
  const reverseSeriesNameMap: Record<string, string> = Object.fromEntries(
    Object.entries(seriesNameMap).map(([key, value]) => [value, key])
  );

  const monthToLabel = (s: string) => {
    const [y, m] = s.split("-").map((v) => parseInt(v, 10));
    if (!y || !m) return s;
    const label = df.format(new Date(y, m - 1, 1));
    return label.charAt(0).toUpperCase() + label.slice(1); // Capitalizar
  };
  const option = {
    grid: { top: 40, left: 10, right: 20, bottom: 60, containLabel: true },
    legend: {},
    tooltip: {
      trigger: "axis",
      formatter: (params: any[]) => {
        if (!Array.isArray(params)) return "";
        const raw = params[0]?.axisValueLabel || params[0]?.name || "";
        const title = monthToLabel(String(raw));
        const lines = params
          .map((p) => {
            // p.seriesName ahora contiene el nombre traducido (ej: "Horas", "Dólares")
            const seriesTranslated = p.seriesName as string;
            // Necesitamos el nombre original para acceder a los datos (ej: "hours", "dollars")
            const seriesOriginal = reverseSeriesNameMap[seriesTranslated] || seriesTranslated;
            // ECharts dataset entrega p.data como objeto con keys de dimensiones originales
            let v: any = p.data?.[seriesOriginal];
            if (v === undefined) {
              // fallback a value[1]
              v = Array.isArray(p.value) ? p.value[1] : p.value;
            }
            const num = Number(v ?? 0);
            const textVal = seriesOriginal === "dollars" ? cf.format(num) : nf.format(num);
            // Usar el nombre traducido para mostrar
            return `${p.marker} ${seriesTranslated}  ${textVal}`;
          })
          .join("<br/>");
        return `${title}<br/>${lines}`;
      },
    },
    xAxis: {
      type: "category",
      axisLabel: {
        formatter: (value: string) => monthToLabel(value),
      },
    },
    yAxis: [{ type: "value" }],
    dataset: [
      {
        dimensions: dims,
        source: data.map((d) => Object.fromEntries(dims.map((k) => [k, (d as any)[k]]))),
      },
    ],
    series: show.map((name) => ({
      type: name === "dollars" ? "bar" : "line",
      smooth: name !== "dollars",
      name: seriesNameMap[name] || name,
    })),
  } as any;

  return <ReactECharts option={option} style={{ height: 360 }} />;
};

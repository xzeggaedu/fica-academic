import React from "react";
import ReactECharts from "echarts-for-react";

type Trend = { month: string; sessions: number; hours: number; dollars: number };

export const MonthlyTrendChart: React.FC<{ data: Trend[]; show?: ("sessions" | "hours" | "dollars")[] }> = ({ data, show = ["hours", "dollars"] }) => {
  const dims = ["month", ...show];
  const nf = new Intl.NumberFormat("es-SV", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const cf = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const df = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });
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
            const series = p.seriesName as string;
            // ECharts dataset entrega p.data como objeto con keys de dimensiones
            let v: any = p.data?.[series];
            if (v === undefined) {
              // fallback a value[1]
              v = Array.isArray(p.value) ? p.value[1] : p.value;
            }
            const num = Number(v ?? 0);
            const textVal = series === "dollars" ? cf.format(num) : nf.format(num);
            return `${p.marker} ${series}  ${textVal}`;
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
      name,
    })),
  } as any;

  return <ReactECharts option={option} style={{ height: 360 }} />;
};

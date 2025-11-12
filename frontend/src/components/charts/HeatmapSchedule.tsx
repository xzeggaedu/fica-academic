import React, { useRef, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";

export type HeatItem = { day: string; schedule: string; hours: number; dollars: number };

export const HeatmapSchedule: React.FC<{ data: HeatItem[]; metric?: "hours" | "dollars" }> = ({ data, metric = "hours" }) => {
  const chartRef = useRef<any>(null);

  // Limpiar tooltip al desmontar el componente
  useEffect(() => {
    return () => {
      const chartInstance = chartRef.current?.getEchartsInstance();
      if (chartInstance && (chartInstance as any).__customTooltip) {
        const tooltipDiv = (chartInstance as any).__customTooltip;
        if (tooltipDiv && tooltipDiv.parentNode) {
          tooltipDiv.parentNode.removeChild(tooltipDiv);
        }
      }
    };
  }, []);
  const days = Array.from(new Set(data.map((d) => d.day)));
  const slots = Array.from(new Set(data.map((d) => d.schedule)));
  const val = (d: HeatItem) => (metric === "hours" ? d.hours : d.dollars);
  const matrix = days.flatMap((day, yi) =>
    slots.map((slot, xi) => {
      const found = data.find((d) => d.day === day && d.schedule === slot);
      return [xi, yi, found ? val(found) : 0];
    })
  );

  const max = Math.max(0, ...matrix.map((m) => m[2] as number));

  // Formateadores para números
  const numberFormatter = new Intl.NumberFormat("es-SV", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Función para truncar labels largos
  const truncateLabel = (label: string, maxLength: number = 8): string => {
    if (label.length <= maxLength) return label;
    return label.substring(0, maxLength) + "...";
  };

  const option: EChartsOption = {
    grid: { top: 30, left: 10, right: 20, bottom: 60, containLabel: true },
    tooltip: {
      trigger: "item",
      formatter: (p: any) => {
        const dayLabel = days[p.value[1]];
        const scheduleLabel = slots[p.value[0]];
        const value = Number(p.value[2]);
        const formattedValue = metric === "dollars"
          ? currencyFormatter.format(value)
          : numberFormatter.format(value);
        const labelMetric = metric === "hours" ? "Horas" : "Total $";
        return `Días: ${dayLabel}<br/>Horario: ${scheduleLabel}<br/>${labelMetric}: ${formattedValue}`;
      },
    },
    xAxis: { type: "category", data: slots, axisLabel: { rotate: 45 } },
    yAxis: {
      type: "category",
      data: days,
      axisLabel: {
        formatter: (value: string) => truncateLabel(value, 8),
      },
      triggerEvent: true,
    },
    visualMap: {
      min: 0,
      max: max > 0 ? max : 1,
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: "0%",
      inRange: {
        color: ['#fff5f0', '#fee0d2', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'] // Rojo claro (naranja pálido) a rojo oscuro (marrón)
      },
      formatter: (value: number) => {
        return metric === "dollars"
          ? currencyFormatter.format(value)
          : numberFormatter.format(value);
      },
    },
    dataset: [
      {
        dimensions: ["x", "y", "val"],
        source: matrix,
      },
    ],
    series: [
      {
        type: "heatmap",
        datasetIndex: 0,
        encode: { x: "x", y: "y" },
        label: { show: false },
      },
    ],
  };

  // Manejar eventos para mostrar tooltip en labels del eje Y
  const onEvents = {
    mouseover: (params: any) => {
      if (params.componentType === "yAxis" && params.value) {
        const fullLabel = String(params.value);
        if (fullLabel && fullLabel.length > 8) {
          const chartInstance = chartRef.current?.getEchartsInstance();
          if (chartInstance && params.event?.event) {
            // Limpiar tooltip anterior si existe
            if ((chartInstance as any).__customTooltip) {
              const oldTooltip = (chartInstance as any).__customTooltip;
              if (oldTooltip && oldTooltip.parentNode) {
                oldTooltip.parentNode.removeChild(oldTooltip);
              }
            }
            // Crear tooltip HTML personalizado
            const tooltipDiv = document.createElement("div");
            tooltipDiv.className = "echarts-tooltip-custom";
            tooltipDiv.style.cssText = `
              position: fixed;
              background: rgba(50, 50, 50, 0.95);
              color: white;
              padding: 8px 12px;
              border-radius: 4px;
              font-size: 12px;
              pointer-events: none;
              z-index: 10000;
              white-space: nowrap;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            `;
            tooltipDiv.textContent = fullLabel;
            document.body.appendChild(tooltipDiv);
            tooltipDiv.style.left = `${params.event.event.clientX + 10}px`;
            tooltipDiv.style.top = `${params.event.event.clientY - 30}px`;
            (chartInstance as any).__customTooltip = tooltipDiv;
          }
        }
      }
    },
    mouseout: (params: any) => {
      if (params.componentType === "yAxis") {
        const chartInstance = chartRef.current?.getEchartsInstance();
        if (chartInstance && (chartInstance as any).__customTooltip) {
          const tooltipDiv = (chartInstance as any).__customTooltip;
          if (tooltipDiv && tooltipDiv.parentNode) {
            tooltipDiv.parentNode.removeChild(tooltipDiv);
          }
          (chartInstance as any).__customTooltip = null;
        }
      }
    },
  };

  return <ReactECharts ref={chartRef} option={option} style={{ height: 360 }} onEvents={onEvents} />;
};

import React from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";

interface SimpleDoughnutChartProps {
  data: Array<{ name: string; value: number }>;
  colors?: string[];
  showTooltip?: boolean;
  showLabels?: boolean;
  width?: number | string;
  height?: number | string;
  radius?: string[];
}

export const SimpleDoughnutChart: React.FC<SimpleDoughnutChartProps> = ({
  data,
  colors = ['#3b82f6', '#e5e7eb'],
  showTooltip = false,
  showLabels = false,
  width = 45,
  height = 45,
  radius = ["55%", "95%"],
}) => {
  // Calcular total para porcentajes
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const option: EChartsOption = {
    tooltip: showTooltip ? {
      trigger: 'item',
      formatter: (params: any) => {
        if (!params) return '';
        const value = typeof params.value === 'number' ? params.value : Number(params.value);
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
        return `${params.name}: ${value} (${percentage}%)`;
      },
    } : {
      show: false,
    },
    legend: {
      show: false,
    },
    series: [
      {
        type: "pie",
        radius,
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 0,
          borderColor: "#fff",
          borderWidth: 2,
        },
        label: {
          show: showLabels,
          position: "outside",
          formatter: (params: any) => {
            if (!params) return '';
            return `${params.name}\n${params.value}`;
          },
          fontSize: 12,
          fontWeight: "normal",
        },
        labelLine: {
          show: showLabels,
          length: 15,
          length2: 10,
        },
        emphasis: {
          disabled: !showTooltip,
        },
        data: data.map((item, index) => ({
          value: Number(item.value.toFixed(2)),
          name: item.name,
          itemStyle: {
            color: colors[index % colors.length],
          },
        })),
      },
    ],
  };

  return <ReactECharts option={option} style={{ height, width }} />;
};

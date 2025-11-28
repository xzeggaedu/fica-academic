import React from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";

type Grid = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  containLabel: boolean;
}

interface SimpleBarChartProps {
  data: Array<{ name: string; value: number }>;
  colors?: string[];
  height?: number | string;
  showTooltip?: boolean;
  grid?: Grid;
  hideXAxisLabels?: boolean;
}

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({
  data,
  colors = ['#3b82f6'],
  height = 200,
  showTooltip = true,
  grid = {
    top: 20,
    left: 40,
    right: 20,
    bottom: 40,
    containLabel: true,
  },
  hideXAxisLabels = false,
}) => {
  // Calcular total para porcentajes en tooltip
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const option: EChartsOption = {
    tooltip: showTooltip ? {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        if (!params || !Array.isArray(params)) return '';
        const param = params[0];
        const value = typeof param.value === 'number' ? param.value : Number(param.value);
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
        return `${param.name}: ${value} (${percentage}%)`;
      },
    } : {
      show: false,
    },
    grid,
    xAxis: {
      type: 'category',
      data: data.map(item => item.name),
      axisLabel: {
        rotate: data.length > 5 ? 45 : 0,
        interval: 0,
        fontSize: 8,
        show: !hideXAxisLabels,
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        fontSize: 8,
      },
    },
    series: [
      {
        type: 'bar',
        data: data.map((item, index) => ({
          value: item.value,
          itemStyle: {
            color: colors[index % colors.length],
          },
        })),
        label: {
          show: true,
          position: 'top',
          formatter: '{c}',
          fontSize: 8,
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} />;
};

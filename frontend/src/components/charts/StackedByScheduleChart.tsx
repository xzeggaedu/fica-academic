import React from "react";
import ReactECharts from "echarts-for-react";

type StackedItem = { schedule: string; GDO: number; M1: number; M2: number; DR: number; BLG: number };

export const StackedByScheduleChart: React.FC<{ data: StackedItem[] }> = ({ data }) => {
  const option = {
    grid: { top: 30, left: 10, right: 20, bottom: 60, containLabel: true },
    legend: {},
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    xAxis: { type: "category" },
    yAxis: { type: "value" },
    dataset: [
      {
        dimensions: ["schedule", "GDO", "M1", "M2", "DR", "BLG"],
        source: data,
      },
    ],
    series: [
      { type: "bar", stack: "niveles", name: "GDO" },
      { type: "bar", stack: "niveles", name: "M1" },
      { type: "bar", stack: "niveles", name: "M2" },
      { type: "bar", stack: "niveles", name: "DR" },
      { type: "bar", stack: "niveles", name: "BLG" },
    ],
  } as any;

  return <ReactECharts option={option} style={{ height: 360 }} />;
};

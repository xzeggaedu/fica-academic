import React from "react";
import ReactECharts from "echarts-for-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/data/table";

interface ComparativeSectionsChartProps {
  data: Array<{
    modality: string;
    cycle_current: number;
    cycle_compare: number;
  }>;
  cycleLabel1: string; // "02-2023"
  cycleLabel2: string; // "02-2024"
}

export const ComparativeSectionsChart: React.FC<ComparativeSectionsChartProps> = ({
  data,
  cycleLabel1,
  cycleLabel2,
}) => {
  // Los ciclos van en el eje X, cada ciclo tiene barras por modalidad
  const cycles = [cycleLabel1, cycleLabel2];
  const modalities = data.map((d) => d.modality);

  // Construir series: una por cada modalidad
  const seriesData = modalities.map((modality, idx) => {
    const modalityData = data.find((d) => d.modality === modality);
    const colors = ["#a8d8f0", "#6ba3d8", "#1f4788"]; // Light blue, Medium blue, Dark blue
    return {
      name: modality,
      type: "bar" as const,
      data: cycles.map((cycle) => {
        if (cycle === cycleLabel1) {
          return modalityData?.cycle_compare || 0;
        }
        return modalityData?.cycle_current || 0;
      }),
      itemStyle: { color: colors[idx % colors.length] },
      label: {
        show: true,
        position: "top",
        formatter: "{c}",
      },
    };
  });

  const option = {
    grid: { top: 40, left: 40, right: 30, bottom: 80, containLabel: true },
    legend: {
      data: modalities,
      bottom: 10,
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: any) => {
        const lines: string[] = [];
        params.forEach((param: any) => {
          if (param.value > 0) {
            lines.push(`${param.seriesName}: ${param.value}`);
          }
        });
        return `${params[0].axisValue}<br/>${lines.join("<br/>")}`;
      },
    },
    xAxis: {
      type: "category",
      data: cycles,
      axisLabel: { rotate: 0 },
    },
    yAxis: {
      type: "value",
      name: "Número de Secciones",
      nameLocation: "middle",
      nameRotate: 90,
      nameGap: 50,
      nameTextStyle: {
        padding: [0, 0, 0, 0],
      },
    },
    series: seriesData,
  } as any;

  return (
    <div>
      <ReactECharts option={option} style={{ height: 400 }} />
      {/* Tabla con los datos */}
      <div className="mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              {cycles.map((cycle) => (
                <TableHead key={cycle} className="text-center">
                  {cycle}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {modalities.map((modality) => {
              const modalityData = data.find((d) => d.modality === modality);
              return (
                <TableRow key={modality}>
                  <TableCell className="font-medium">{modality}</TableCell>
                  <TableCell className="text-center">{modalityData?.cycle_compare || 0}</TableCell>
                  <TableCell className="text-center">{modalityData?.cycle_current || 0}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

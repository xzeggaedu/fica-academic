import React, { useState } from "react";
import ReactECharts from "echarts-for-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/forms/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/data/table";

interface SectionsBySchoolChartProps {
  data: Array<{
    school_acronym: string;
    modality: string;
    cycle_current: number;
    cycle_compare: number;
  }>;
  cycleLabel1: string; // "02-2023"
  cycleLabel2: string; // "02-2024"
}

export const SectionsBySchoolChart: React.FC<SectionsBySchoolChartProps> = ({
  data,
  cycleLabel1,
  cycleLabel2,
}) => {
  // Obtener todas las escuelas únicas
  const schools = Array.from(new Set(data.map((d) => d.school_acronym))).sort();
  const [selectedSchool, setSelectedSchool] = useState<string>(schools[0] || "");

  // Filtrar datos por escuela seleccionada
  const filteredData = selectedSchool
    ? data.filter((d) => d.school_acronym === selectedSchool)
    : data;

  // Agrupar datos por modalidad
  const modalities = ["Presenciales", "En Línea", "Virtuales"];

  // Construir datos para cada ciclo
  const seriesData = [
    {
      name: cycleLabel1,
      type: "bar" as const,
      data: modalities.map((modality) => {
        const modalityData = filteredData.filter((d) => d.modality === modality);
        return modalityData.reduce((sum, item) => sum + item.cycle_compare, 0);
      }),
      itemStyle: { color: "#a8d8f0" }, // Light blue
      label: {
        show: true,
        position: "top",
        formatter: "{c}",
      },
    },
    {
      name: cycleLabel2,
      type: "bar" as const,
      data: modalities.map((modality) => {
        const modalityData = filteredData.filter((d) => d.modality === modality);
        return modalityData.reduce((sum, item) => sum + item.cycle_current, 0);
      }),
      itemStyle: { color: "#1f4788" }, // Dark blue
      label: {
        show: true,
        position: "top",
        formatter: "{c}",
      },
    },
  ];

  const option = {
    grid: { top: 30, left: 40, right: 30, bottom: 50, containLabel: true },
    legend: {
      data: [cycleLabel1, cycleLabel2],
      bottom: 10,
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: any) => {
        const lines: string[] = [];
        params.forEach((param: any) => {
          lines.push(`${param.seriesName}: ${param.value}`);
        });
        return `${params[0].axisValue}<br/>${lines.join("<br/>")}`;
      },
    },
    xAxis: {
      type: "category",
      data: modalities,
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

  // Datos para la tabla
  const tableData = modalities.map((modality) => {
    const modalityData = filteredData.filter((d) => d.modality === modality);
    return {
      modality,
      cycle_compare: modalityData.reduce((sum, item) => sum + item.cycle_compare, 0),
      cycle_current: modalityData.reduce((sum, item) => sum + item.cycle_current, 0),
    };
  });

  return (
    <div>
      {/* Selector de escuela */}
      {schools.length > 1 && (
        <div className="mb-4 flex justify-end">
          <Select value={selectedSchool} onValueChange={setSelectedSchool}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Seleccionar escuela" />
            </SelectTrigger>
            <SelectContent>
              {schools.map((school) => (
                <SelectItem key={school} value={school}>
                  {school}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <ReactECharts option={option} style={{ height: 400 }} />

      {/* Tabla con los datos */}
      <div className="mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              <TableHead className="text-center">{cycleLabel1}</TableHead>
              <TableHead className="text-center">{cycleLabel2}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.map((row) => (
              <TableRow key={row.modality}>
                <TableCell className="font-medium">{row.modality}</TableCell>
                <TableCell className="text-center">{row.cycle_compare}</TableCell>
                <TableCell className="text-center">{row.cycle_current}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

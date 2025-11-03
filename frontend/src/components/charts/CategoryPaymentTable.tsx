import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/forms/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/data/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SimpleDoughnutChart } from "@/components/charts/SimpleDoughnutChart";

interface CategoryPaymentItem {
    category: string;
    pag: number;
    no_pag: number;
    par: number;
}

interface CategoryPaymentTableProps {
    data: Record<string, CategoryPaymentItem[]>; // school_acronym -> array of CategoryPaymentItem
}

export const CategoryPaymentTable: React.FC<CategoryPaymentTableProps> = ({ data }) => {
    // Obtener todas las escuelas disponibles
    const schools = Object.keys(data).sort();
    const [selectedSchool, setSelectedSchool] = useState<string>("CONSOLIDADO");

    // Función para obtener datos consolidados de todas las escuelas
    const getConsolidatedData = (): CategoryPaymentItem[] => {
        const consolidatedMap = new Map<string, { pag: number; no_pag: number; par: number }>();

        // Iterar sobre todas las escuelas y consolidar datos
        Object.values(data).forEach((schoolData) => {
            schoolData.forEach((item) => {
                if (!consolidatedMap.has(item.category)) {
                    consolidatedMap.set(item.category, { pag: 0, no_pag: 0, par: 0 });
                }
                const consolidated = consolidatedMap.get(item.category)!;
                consolidated.pag += item.pag;
                consolidated.no_pag += item.no_pag;
                consolidated.par += item.par;
            });
        });

        // Convertir a array y ordenar según el orden de categorías
        const categoriesOrder = ["DEC", "DIR", "CAT/COOR", "DTC", "ADM", "DHC"];
        const consolidatedArray: CategoryPaymentItem[] = Array.from(consolidatedMap.entries()).map(([category, values]) => ({
            category,
            ...values,
        }));

        // Ordenar según el orden definido
        consolidatedArray.sort(
            (a, b) =>
                (categoriesOrder.indexOf(a.category) >= 0 ? categoriesOrder.indexOf(a.category) : 999) -
                (categoriesOrder.indexOf(b.category) >= 0 ? categoriesOrder.indexOf(b.category) : 999)
        );

        // Asegurar que todas las categorías estén presentes
        const existingCategories = new Set(consolidatedArray.map((item) => item.category));
        categoriesOrder.forEach((cat) => {
            if (!existingCategories.has(cat)) {
                consolidatedArray.push({ category: cat, pag: 0, no_pag: 0, par: 0 });
            }
        });

        // Reordenar después de agregar las faltantes
        consolidatedArray.sort(
            (a, b) =>
                (categoriesOrder.indexOf(a.category) >= 0 ? categoriesOrder.indexOf(a.category) : 999) -
                (categoriesOrder.indexOf(b.category) >= 0 ? categoriesOrder.indexOf(b.category) : 999)
        );

        return consolidatedArray;
    };

    // Obtener datos según la selección
    const selectedData =
        selectedSchool === "CONSOLIDADO" ? getConsolidatedData() : selectedSchool ? data[selectedSchool] || [] : [];

    // Calcular totales
    const totals = selectedData.reduce(
        (acc, item) => {
            acc.pag += item.pag;
            acc.no_pag += item.no_pag;
            acc.par += item.par;
            return acc;
        },
        { pag: 0, no_pag: 0, par: 0 }
    );

    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle>Categorías por Estado de Pago</CardTitle>
                <p className="text-xs text-muted-foreground">
                    Resumen de categorías de profesores por estado de pago.
                </p>
            </CardHeader>
            <CardContent className="flex flex-col flex-1">
                <div className="flex-1">
                    {/* Selector de escuela */}
                    <div className="flex justify-end">
                        {schools.length > 0 && (
                            <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Seleccionar escuela" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CONSOLIDADO">Consolidado</SelectItem>
                                    {schools.map((school) => (
                                        <SelectItem key={school} value={school}>
                                            {school}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                    {/* Gráfico Doughnut con los totales */}
                    {totals.pag + totals.no_pag + totals.par > 0 && (
                        <div className="mb-0 flex justify-center w-full">
                            <div className="flex-1" style={{ minWidth: "300px", maxWidth: "400px" }}>
                                <SimpleDoughnutChart
                                    data={[
                                        { name: "PAG", value: totals.pag },
                                        { name: "NO PAG", value: totals.no_pag },
                                        { name: "PAR", value: totals.par },
                                    ]}
                                    colors={["#22c55e", "#ef4444", "#f59e0b"]} // Verde para PAG, Rojo para NO PAG, Naranja para PAR
                                    showTooltip={true}
                                    showLabels={true}
                                    width="100%"
                                    height={300}
                                />
                            </div>
                        </div>
                    )}

                    {/* Tabla */}
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="font-semibold">CATEGORIA</TableHead>
                                    <TableHead className="text-center">PAG</TableHead>
                                    <TableHead className="text-center">NO PAG</TableHead>
                                    <TableHead className="text-center">PAR</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedData.map((item) => (
                                    <TableRow key={item.category}>
                                        <TableCell className="font-medium">{item.category}</TableCell>
                                        <TableCell className="text-center">{item.pag}</TableCell>
                                        <TableCell className="text-center">{item.no_pag}</TableCell>
                                        <TableCell className="text-center">{item.par}</TableCell>
                                    </TableRow>
                                ))}
                                {/* Fila de totales */}
                                <TableRow className="font-bold">
                                    <TableCell>Total</TableCell>
                                    <TableCell className="text-center">{totals.pag}</TableCell>
                                    <TableCell className="text-center">{totals.no_pag}</TableCell>
                                    <TableCell className="text-center">{totals.par}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Nota */}
                <p className="text-[11px] text-muted-foreground mt-4">
                    <span className="font-bold">Nota:</span> Muestra el conteo de profesores por categoría
                    (DEC, DIR, CAT/COOR, DTC, ADM, DHC) según su estado de pago: PAG (Pagado 100%), NO PAG
                    (No Pagado), PAR (Parcial).
                </p>
            </CardContent>
        </Card>
    );
};

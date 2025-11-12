import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, AlertTriangle, XCircle, BookOpen, Users } from "lucide-react";
import type { AcademicLoadStatistics } from "@/types/api";

interface AcademicLoadFileStatsProps {
    statistics: AcademicLoadStatistics;
}

const CardStats = ({ title, value, icon }: { title: string, value: number, icon: React.ReactNode }) => {
    return (
        <Card>
            <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        <p className="text-3xl font-bold mt-1">{value}</p>
                    </div>
                    {icon}
                </div>
            </CardContent>
        </Card>
    );
};

export const AcademicLoadFileStats: React.FC<AcademicLoadFileStatsProps> = ({ statistics }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <CardStats title="Total Clases" value={statistics.total_classes} icon={<BookOpen className="h-8 w-8 text-blue-500" />} />
            <CardStats title="Válidas" value={statistics.valid_classes} icon={<CheckCircle className="h-8 w-8 text-green-500" />} />
            <CardStats title="Advertencias" value={statistics.warning_classes} icon={<AlertTriangle className="h-8 w-8 text-yellow-500" />} />
            <CardStats title="Errores" value={statistics.error_classes} icon={<XCircle className="h-8 w-8 text-red-500" />} />
            <CardStats title="Profesores" value={statistics.unique_professors} icon={<Users className="h-8 w-8 text-purple-500" />} />
        </div>
    );
};

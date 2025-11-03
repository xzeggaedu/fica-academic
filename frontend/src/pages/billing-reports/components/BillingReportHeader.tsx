import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt } from "lucide-react";
import type { BillingReport } from "@/types/api";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface BillingReportHeaderProps {
  report: BillingReport;
}

export const BillingReportHeader: React.FC<BillingReportHeaderProps> = ({ report }) => {
  const getStatusBadge = () => {
    if (report.is_edited) {
      return <Badge variant="secondary">Editada</Badge>;
    }
    return <Badge variant="default">Generada</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-10">
          <div className="flex items-start gap-3 border-r-1 border-gray-200 pr-10">
            <Receipt className="w-16 h-16 text-blue-600" />
            <div>
              <CardTitle className="text-xl">Planilla</CardTitle>
              {report.faculty_name && (
                <div className="text-sm font-bold">
                  {report.faculty_name}
                </div>
              )}
              {report.school_name && (
                <div className="text-sm">
                  {report.school_name}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                Generada el {format(new Date(report.created_at), "PPP 'a las' HH:mm", { locale: es })}
              </p>
            </div>
          </div>
          <div className="flex-1">
            <div className="text-sm mb-1 flex items-center gap-1">
              <div className="font-bold w-30">Generado por:</div> {report.user_name}
            </div>
            {report.term_term && report.term_year && (
              <div className="text-sm mb-1 flex items-center gap-1">
                <div className="font-bold w-30">Ciclo:</div> {String(report.term_term).padStart(2, '0')}/{report.term_year}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end">
            {getStatusBadge()}
          </div>
        </div>
      </CardHeader>
      {report.notes && (
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">


            <div className="col-span-full">
              <p className="text-sm text-muted-foreground">Notas</p>
              <p className="text-sm">{report.notes}</p>
            </div>

          </div>
        </CardContent>
      )}
    </Card>
  );
};

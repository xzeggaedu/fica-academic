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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100">
              <Receipt className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Planilla de Facturación</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Generada el {format(new Date(report.created_at), "PPP 'a las' HH:mm", { locale: es })}
              </p>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Generado por</p>
            <p className="text-sm font-medium">{report.user_name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">ID de Carga</p>
            <p className="text-sm font-medium">{report.academic_load_file_id}</p>
          </div>
          {report.notes && (
            <div className="col-span-full">
              <p className="text-sm text-muted-foreground">Notas</p>
              <p className="text-sm">{report.notes}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

import React from "react";
import { useParams } from "react-router-dom";
import { useShow, CanAccess } from "@refinedev/core";
import type { BillingReport } from "@/types/api";
import { Unauthorized } from "../unauthorized";
import {
  BillingReportBreadcrumbs,
  BillingReportHeader,
  PaymentSummaryBlock,
  MonthlyBudgetBlock,
} from "./components";

export const BillingReportShow: React.FC = () => {
  const params = useParams<{ id: string }>();

  // Obtener datos del reporte usando useShow
  const { query } = useShow<BillingReport>({
    resource: "billing-reports",
    id: params.id,
  });
  const { data, isLoading } = query;
  const report = data?.data;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">No se encontró el reporte</div>
      </div>
    );
  }

  return (
    <CanAccess
      resource="billing-reports"
      action="show"
      fallback={<Unauthorized />}
    >
      <div className="container mx-auto py-6 space-y-6 max-w-[98%]">
        <BillingReportBreadcrumbs />

        <BillingReportHeader report={report} />

        <PaymentSummaryBlock summaries={report.payment_summaries} />

        <MonthlyBudgetBlock items={report.monthly_items} />
      </div>
    </CanAccess>
  );
};

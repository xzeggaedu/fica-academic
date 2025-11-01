import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

export const getValidationBadge = (status: string) => {
  switch (status) {
    case "valid":
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle className="w-3 h-3 mr-1" />
          Válido
        </Badge>
      );
    case "warning":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Advertencia
        </Badge>
      );
    case "error":
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          <XCircle className="w-3 h-3 mr-1" />
          Error
        </Badge>
      );
    default:
      return (
        <Badge className="bg-gray-100 text-gray-800">
          {status}
        </Badge>
      );
  }
};

export const getFileStatusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          Pendiente
        </Badge>
      );
    case "processing":
      return (
        <Badge className="bg-blue-100 text-blue-800">
          Procesando
        </Badge>
      );
    case "completed":
      return (
        <Badge className="bg-green-100 text-green-800">
          Completado
        </Badge>
      );
    case "failed":
      return (
        <Badge className="bg-red-100 text-red-800">
          Error
        </Badge>
      );
    default:
      return (
        <Badge className="bg-gray-100 text-gray-800">
          {status}
        </Badge>
      );
  }
};

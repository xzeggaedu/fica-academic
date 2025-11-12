import React from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowRight, Bug } from "lucide-react";

interface ValidationChange {
    field: string;
    from: string;
    to: string;
    reason: string;
}

interface ValidationErrorData {
    changes?: ValidationChange[];
    errors?: string[];
}

export const formatValidationErrors = (validationErrors: string | null): React.ReactNode => {
    if (!validationErrors) return null;

    try {
        // Separar mensajes de error de cambios JSON
        let errorMessages: string[] = [];
        let changesData: ValidationChange[] = [];

        // Buscar si hay JSON al final separado por "; "
        if (validationErrors.includes("; {")) {
            const parts = validationErrors.split("; ");
            errorMessages = [parts[0]];

            // Intentar parsear el JSON
            try {
                const jsonStr = parts.slice(1).join("; ");
                const data: ValidationErrorData = JSON.parse(jsonStr);
                if (data.changes) {
                    changesData = data.changes;
                }
                if (data.errors) {
                    errorMessages = [...errorMessages, ...data.errors];
                }
            } catch (e) {
                // Si el JSON no se puede parsear, agregar todo como mensaje
                errorMessages.push(parts.slice(1).join("; "));
            }
        } else {
            // Intentar parsear como JSON puro
            const data: ValidationErrorData = JSON.parse(validationErrors);
            if (data.changes) {
                changesData = data.changes;
            }
            if (data.errors) {
                errorMessages = data.errors;
            }
        }

        // Si hay cambios normalizados o errores de validación, mostrar ambos
        if (changesData.length > 0 || errorMessages.length > 0) {
            return (
                <div className="space-y-4">
                    {/* Errores de validación */}
                    {errorMessages.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Bug className="w-4 h-4 text-red-600" />
                                <span className="font-semibold text-sm">Errores de Validación:</span>
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle className="w-4 h-4 text-red-600" />
                                <span className="font-semibold text-sm">Errores de Validación:</span>
                            </div>
                            <div className="space-y-2">
                                {errorMessages.map((error, index) => (
                                    <div key={index} className="flex items-start gap-2 text-sm bg-red-50 p-3 rounded-md border border-red-200">
                                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                        <span className="text-red-900">{error}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Cambios normalizados */}
                    {changesData.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                                <span className="font-semibold text-sm">Cambios Normalizados:</span>
                            </div>
                            <div className="space-y-2">
                                {changesData.map((change, index) => (
                                    <div key={index} className="flex items-start gap-2 text-sm bg-yellow-50 p-3 rounded-md border border-yellow-200">
                                        <Badge variant="outline" className="text-xs">
                                            {change.field}
                                        </Badge>
                                        <div className="flex items-center gap-2 flex-1">
                                            <span className="text-gray-600 line-through">{change.from}</span>
                                            <ArrowRight className="w-3 h-3 text-gray-400" />
                                            <span className="text-gray-900 font-medium">{change.to}</span>
                                        </div>
                                        <Badge variant="secondary" className="text-xs">
                                            {change.reason}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // Si no hay estructura reconocida, mostrar el texto original
        return (
            <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{validationErrors}</p>
            </div>
        );
    } catch (error) {
        // Si no es JSON válido, mostrar como texto plano
        return (
            <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{validationErrors}</p>
            </div>
        );
    }
};

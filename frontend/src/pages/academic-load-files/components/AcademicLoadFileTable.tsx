import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/forms/input";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    CheckCircle,
    AlertTriangle,
    XCircle,
    BookOpen,
    Users,
} from "lucide-react";
import type { AcademicLoadClass } from "@/types/api";
import { formatValidationErrors } from "../utils/validationErrors";

interface AcademicLoadFileTableProps {
    classes: AcademicLoadClass[];
    isLoading: boolean;
    getValidationBadge: (status: string) => React.ReactNode;
    searchTerm: string;
    onSearchChange: (value: string) => void;
    validationFilter: string;
    onValidationFilterChange: (value: string) => void;
}

export const AcademicLoadFileTable: React.FC<AcademicLoadFileTableProps> = ({
    classes,
    isLoading,
    getValidationBadge,
    searchTerm,
    onSearchChange,
    validationFilter,
    onValidationFilterChange,
}) => {
    if (isLoading) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="flex justify-center items-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (classes.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">
                        Clases (0)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Filtros */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="flex-1">
                            <Input
                                placeholder="Buscar por código, asignatura o profesor..."
                                value={searchTerm}
                                onChange={(e) => onSearchChange(e.target.value)}
                            />
                        </div>
                        <div className="w-full md:w-48">
                            <select
                                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                                value={validationFilter}
                                onChange={(e) => onValidationFilterChange(e.target.value)}
                            >
                                <option value="all">Todos los estados</option>
                                <option value="valid">Válidos</option>
                                <option value="warning">Advertencias</option>
                                <option value="error">Errores</option>
                            </select>
                        </div>
                    </div>
                    <div className="text-center py-8 text-muted-foreground">
                        No se encontraron clases
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">
                    Clases ({classes.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Filtros */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1">
                        <Input
                            placeholder="Buscar por código, asignatura o profesor..."
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <select
                            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                            value={validationFilter}
                            onChange={(e) => onValidationFilterChange(e.target.value)}
                        >
                            <option value="all">Todos los estados</option>
                            <option value="valid">Válidos</option>
                            <option value="warning">Advertencias</option>
                            <option value="error">Errores</option>
                        </select>
                    </div>
                </div>

                {/* Headers de la tabla */}
                <div className="px-4 py-2">
                    <div className="grid [grid-template-columns:0.7fr_2fr_repeat(4,0.8fr)_2.5fr_0.8fr] gap-2 pb-2 border-b border-gray-200">
                        <div className="font-semibold text-sm">Código</div>
                        <div className="font-semibold text-sm text-start">Nombre</div>
                        <div className="font-semibold text-sm text-center">Sección</div>
                        <div className="font-semibold text-sm text-center">Horario</div>
                        <div className="font-semibold text-sm text-center">Días</div>
                        <div className="font-semibold text-sm text-center">Tipo</div>
                        <div className="font-semibold text-sm text-start">Profesor</div>
                        <div className=""></div>
                    </div>
                </div>

                <Accordion type="single" collapsible className="w-full">
                    {classes.map((cls) => (
                        <AccordionItem key={cls.id} value={`item-${cls.id}`}>
                            <AccordionTrigger className="px-4">
                                <div className="w-full grid [grid-template-columns:0.7fr_2fr_repeat(4,0.8fr)_2.5fr_0.8fr] gap-2">
                                    <div className="text-sm text-start">{cls.subject_code}</div>
                                    <div className="text-start">{cls.subject_name}</div>
                                    <div className="text-sm text-center">{cls.class_section}</div>
                                    <div className="text-sm text-center">{cls.class_schedule}</div>
                                    <div className="text-sm text-center">{cls.class_days}</div>
                                    <div className="text-sm text-center">{cls.class_type}</div>
                                    <div className="flex items-start justify-between">{cls.professor_academic_title} {cls.professor_name}</div>
                                    <div className="text-end">{getValidationBadge(cls.validation_status)}</div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-0">
                                <div className="p-4 mb-0 border-t px-4 rounded-md">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* Columna 1: Datos de la Asignatura */}
                                        <div>
                                            <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                                                <BookOpen className="w-4 h-4" />
                                                Asignatura
                                            </h4>
                                            <div className="space-y-1.5 text-sm">
                                                <div className="flex justify-start gap-2">
                                                    <span className="text-muted-foreground min-w-[25%]">Duración:</span>
                                                    <span className="font-medium">{cls.class_duration} minutos</span>
                                                </div>
                                                <div className="flex justify-start gap-2">
                                                    <span className="text-muted-foreground min-w-[25%]">Tipo:</span>
                                                    <span className="font-medium">{cls.class_type}</span>
                                                </div>
                                                {cls.coordination_code && (
                                                    <div className="flex justify-start gap-2">
                                                        <span className="text-muted-foreground min-w-[25%]">Coordinación:</span>
                                                        <span className="font-medium">{cls.coordination_code}</span>
                                                    </div>
                                                )}
                                                {cls.class_service_assigned && (
                                                    <div className="flex justify-start gap-2">
                                                        <span className="text-muted-foreground min-w-[25%]">Servicio Asignado:</span>
                                                        <span className="font-medium">{cls.class_service_assigned}</span>
                                                    </div>
                                                )}
                                                {cls.correlative && (
                                                    <div className="flex justify-start gap-2">
                                                        <span className="text-muted-foreground min-w-[25%]">Correlativo:</span>
                                                        <span className="font-medium">{cls.correlative}</span>
                                                    </div>
                                                )}
                                                {cls.section_unique && (
                                                    <div className="flex justify-start gap-2">
                                                        <span className="text-muted-foreground min-w-[25%]">Sección Única:</span>
                                                        <span className="font-medium">{cls.section_unique}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Columna 2: Datos del Profesor */}
                                        <div>
                                            <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                                                <Users className="w-4 h-4" />
                                                Profesor
                                            </h4>
                                            <div className="space-y-1.5 text-sm">
                                                <div className="flex justify-start gap-2">
                                                    <span className="text-muted-foreground min-w-[25%]">Título:</span>
                                                    <span className="font-medium">{cls.professor_academic_title || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-start gap-2">
                                                    <span className="text-muted-foreground min-w-[25%]">Nombre:</span>
                                                    <span className="font-medium">{cls.professor_name}</span>
                                                </div>
                                                {cls.professor_institute && (
                                                    <div className="flex justify-start gap-2">
                                                        <span className="text-muted-foreground min-w-[25%]">Instituto:</span>
                                                        <span className="font-medium">{cls.professor_institute}</span>
                                                    </div>
                                                )}
                                                {cls.professor_institutional_email && (
                                                    <div className="flex justify-start gap-2">
                                                        <span className="text-muted-foreground min-w-[25%]">Email Institucional:</span>
                                                        <span className="font-medium">{cls.professor_institutional_email}</span>
                                                    </div>
                                                )}
                                                {cls.professor_personal_email && (
                                                    <div className="flex justify-start gap-2">
                                                        <span className="text-muted-foreground min-w-[25%]">Email Personal:</span>
                                                        <span className="font-medium">{cls.professor_personal_email}</span>
                                                    </div>
                                                )}
                                                {cls.professor_phone && (
                                                    <div className="flex justify-start gap-2">
                                                        <span className="text-muted-foreground min-w-[25%]">Teléfono:</span>
                                                        <span className="font-medium">{cls.professor_phone}</span>
                                                    </div>
                                                )}
                                                {cls.professor_id && (
                                                    <div className="flex justify-start gap-2">
                                                        <span className="text-muted-foreground min-w-[25%]">ID:</span>
                                                        <span className="font-medium">{cls.professor_id}</span>
                                                    </div>
                                                )}
                                                {cls.professor_category && (
                                                    <div className="flex justify-start gap-2">
                                                        <span className="text-muted-foreground min-w-[25%]">Categoría:</span>
                                                        <span className="font-medium">{cls.professor_category}</span>
                                                    </div>
                                                )}
                                                {cls.professor_profile && (
                                                    <div className="flex justify-start gap-2">
                                                        <span className="text-muted-foreground min-w-[25%]">Perfil:</span>
                                                        <span className="font-medium">{cls.professor_profile}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-start gap-2">
                                                    <span className="text-muted-foreground min-w-[25%]">Maestrías:</span>
                                                    <span className="font-medium">{cls.professor_masters}</span>
                                                </div>
                                                <div className="flex justify-start gap-2">
                                                    <span className="text-muted-foreground min-w-[25%]">Tasa de Pago:</span>
                                                    <span className="font-medium">{(cls.professor_payment_rate * 100).toFixed(0)}%</span>
                                                </div>
                                                <div className="flex justify-start gap-2">
                                                    <span className="text-muted-foreground min-w-[25%]">Bilingüe:</span>
                                                    <span className="font-medium">{cls.is_bilingual ? 'Sí' : 'No'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Columna 3: Observaciones y Validaciones */}
                                        <div>
                                            <div className="space-y-2 text-sm">
                                                {cls.observations && cls.observations.length > 0 && (
                                                    <div>
                                                        <p className="text-muted-foreground mb-1">Observaciones</p>
                                                        <p className="font-medium">{cls.observations}</p>
                                                    </div>
                                                )}
                                                {cls.team_channel_responsible && (
                                                    <div>
                                                        <p className="text-muted-foreground mb-1">Responsable Teams</p>
                                                        <p className="font-medium">{cls.team_channel_responsible}</p>
                                                    </div>
                                                )}
                                                {cls.validation_errors && (
                                                    <div>
                                                        <div className="text-xs">{formatValidationErrors(cls.validation_errors)}</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>
    );
};

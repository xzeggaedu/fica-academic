import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Download, Trash2 } from "lucide-react";
import type { AcademicLoadFile } from "@/types/api";

interface AcademicLoadFileInfoCardProps {
    file: AcademicLoadFile;
    onDownload: () => void;
    onDelete: () => void;
    canDelete: boolean;
}

export const AcademicLoadFileInfoCard: React.FC<AcademicLoadFileInfoCardProps> = ({
    file,
    onDownload,
    onDelete,
    canDelete,
}) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">
                    <div className="flex gap-2 justify-between items-center">
                        <div className="text-lg">Información del Archivo</div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={onDownload}>
                                <Download className="w-4 h-4 mr-2" />
                                Descargar Excel
                            </Button>
                            {canDelete && (
                                <Button variant="destructive" onClick={onDelete}>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Eliminar
                                </Button>
                            )}
                        </div>

                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Facultad</label>
                        <p className="text-sm mt-1">{file.faculty_name || `${file.faculty?.name || 'N/A'}`}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Escuela</label>
                        <p className="text-sm mt-1">{file.school_name || `${file.school?.name || 'N/A'}`}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Período</label>
                        <p className="text-sm mt-1">
                            {file.term_name || `${file.term?.term || ''} ${file.term?.year || ''}`.trim() || 'N/A'}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Usuario</label>
                        <p className="text-sm mt-1">{file.user_name}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Versión</label>
                        <p className="text-sm mt-1">{file.version}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

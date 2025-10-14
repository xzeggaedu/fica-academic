import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/forms/radio-group";
import { Label } from "@/components/ui/forms/label";
import { Badge } from "@/components/ui/badge";
import { UserRoleEnum } from "@/types/auth";
import { Loader2, Check } from "lucide-react";
import { useList, useUpdate, useOne } from "@refinedev/core";

interface Faculty {
  id: number;
  name: string;
  acronym: string;
}

interface School {
  id: number;
  name: string;
  acronym: string;
  fk_faculty: number;
}

interface UserScope {
  id: number;
  fk_user: number;
  fk_school: number | null;
  fk_faculty: number | null;
}

interface UserPermissionsSheetProps {
  userId: string;  // Cambiado de number a string para UUID
  userName: string;
  userRole: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UserPermissionsSheet({
  userId,
  userName,
  userRole,
  isOpen,
  onClose,
  onSuccess,
}: UserPermissionsSheetProps) {
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Refine hooks
  const { result: facultiesResult, query: facultiesQuery } = useList<Faculty>({
    resource: "faculties",
    queryOptions: {
      enabled: isOpen,
    },
  });

  const { result: schoolsResult, query: schoolsQuery } = useList<School>({
    resource: "schools",
    queryOptions: {
      enabled: isOpen,
    },
  });

  const { result: scopesResult, query: scopesQuery } = useOne({
    resource: "users",
    id: `${userId}/scope`,
    queryOptions: {
      enabled: isOpen && !!userId,
    },
  });

  const { mutate: updateScopes, mutation: updateMutation } = useUpdate();
  const isSaving = updateMutation.isPending;

  const faculties = facultiesResult?.data || [];
  const schools = schoolsResult?.data || [];

  // El backend retorna un array, pero useOne espera un objeto
  // Necesitamos extraer el array del resultado
  const currentScopes = (Array.isArray(scopesResult) ? scopesResult : []) as UserScope[];

  const isLoading = facultiesQuery.isLoading || schoolsQuery.isLoading || scopesQuery.isLoading;

  // Set initial selections based on current scopes when they load
  useEffect(() => {
    if (isOpen && userId) {
      // Clear selections first
      setSelectedFacultyId("");
      setSelectedSchoolId("");
      setError(null);

      // Then load current scopes if available
      if (currentScopes && currentScopes.length > 0) {
        const scope = currentScopes[0];

        if (scope.fk_faculty) {
          setSelectedFacultyId(scope.fk_faculty.toString());
        }

        if (scope.fk_school) {
          setSelectedSchoolId(scope.fk_school.toString());
        }
      }
    }
  }, [isOpen, userId, currentScopes]);

  const handleClose = () => {
    // Clear all form data when closing
    setSelectedFacultyId("");
    setSelectedSchoolId("");
    setError(null);
    onClose();
  };

  const handleSuccess = () => {
    handleClose();
    if (onSuccess) {
      onSuccess();
    }
  };

  const handleSave = async () => {
    setError(null);

    let payload: any = {};

    // Build payload based on role
    if (userRole === UserRoleEnum.DECANO) {
      if (!selectedFacultyId) {
        setError("Debe seleccionar una facultad");
        return;
      }
      payload = { faculty_id: parseInt(selectedFacultyId) };
    } else if (userRole === UserRoleEnum.DIRECTOR) {
      if (!selectedSchoolId || !selectedFacultyId) {
        setError("Debe seleccionar una facultad y una escuela");
        return;
      }
      payload = {
        school_id: parseInt(selectedSchoolId),
        faculty_id: parseInt(selectedFacultyId)
      };
    }

    updateScopes({
      resource: "users",
      id: `${userId}/scope`,
      values: payload,
      meta: {
        method: "put"
      }
    }, {
      onSuccess: () => {
        handleSuccess();
      },
      onError: (error: any) => {
        setError(error.message || "Error al guardar permisos");
      }
    });
  };

  // Get schools for selected faculty
  const getSchoolsForFaculty = (facultyId: string) => {
    if (!facultyId) return [];
    return schools.filter(school => school.fk_faculty === parseInt(facultyId));
  };

  // Handle faculty selection
  const handleFacultyChange = (value: string) => {
    setSelectedFacultyId(value);
    // Reset school selection when faculty changes
    if (userRole === UserRoleEnum.DIRECTOR) {
      setSelectedSchoolId("");
    }
  };

  // Render content based on role
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-red-600 text-sm p-4 bg-red-50 rounded-md">
          {error}
        </div>
      );
    }

    // Vicerrector - Read-only view showing all faculties and schools
    if (userRole === UserRoleEnum.VICERRECTOR) {
      return (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
            <p className="text-sm text-blue-900 font-medium mb-2">
              El Vicerrector tiene acceso total a todas las facultades y escuelas del sistema.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Facultades y Escuelas:</h3>
            {faculties.map(faculty => (
              <div key={faculty.id} className="border rounded-md p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="font-medium">{faculty.name}</span>
                  <Badge variant="outline">{faculty.acronym}</Badge>
                </div>
                <div className="ml-6 space-y-1">
                  {getSchoolsForFaculty(faculty.id.toString()).map(school => (
                    <div key={school.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-3 w-3 text-green-600" />
                      <span>{school.name}</span>
                      <Badge variant="secondary" className="text-xs">{school.acronym}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Decano - Select one faculty
    if (userRole === UserRoleEnum.DECANO) {
      return (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 rounded-md border border-amber-200">
            <p className="text-sm text-amber-900">
              El Decano tendrá acceso a la facultad seleccionada y todas sus escuelas.
            </p>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold">Seleccionar Facultad</Label>
            <RadioGroup value={selectedFacultyId} onValueChange={handleFacultyChange}>
              {faculties.map(faculty => (
                <div key={faculty.id} className="space-x-3 p-3 border rounded-md hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                  <RadioGroupItem value={faculty.id.toString()} id={`faculty-${faculty.id}`} />
                  <Label htmlFor={`faculty-${faculty.id}`} className="flex flex-1 cursor-pointer font-normal">
                      <div>
                        <span>{faculty.name}</span>
                        <Badge variant="outline" className="text-xs ml-3">{faculty.acronym}</Badge>
                      </div>
                  </Label>
                  </div>

                  {selectedFacultyId === faculty.id.toString() && (
                      <div className="mt-2 ml-4 space-y-1 text-sm text-muted-foreground">
                        {getSchoolsForFaculty(faculty.id.toString()).map(school => (
                          <div key={school.id} className="flex items-center gap-2">
                            <Check className="h-3 w-3 text-green-600" />
                            <span>{school.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>
      );
    }

    // Director - Select one faculty, then one school
    if (userRole === UserRoleEnum.DIRECTOR) {
      return (
        <div className="space-y-6">
          <div className="p-4 bg-purple-50 rounded-md border border-purple-200">
            <p className="text-sm text-purple-900">
              El Director tendrá acceso únicamente a la escuela seleccionada.
            </p>
          </div>

          {/* Faculty Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">1. Seleccionar Facultad</Label>
            <RadioGroup value={selectedFacultyId} onValueChange={handleFacultyChange}>
              {faculties
                .filter(faculty => {
                  // Para Director, solo mostrar facultades que tienen escuelas
                  if (userRole === UserRoleEnum.DIRECTOR) {
                    const facultySchools = getSchoolsForFaculty(faculty.id.toString());
                    return facultySchools.length > 0;
                  }
                  return true;
                })
                .map(faculty => {
                  const facultySchools = getSchoolsForFaculty(faculty.id.toString());
                  const isSelected = selectedFacultyId === faculty.id.toString();

                  return (
                    <div key={faculty.id} className="border rounded-md">
                      <div className="flex items-center space-x-3 p-3 hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value={faculty.id.toString()} id={`faculty-${faculty.id}`} />
                        <Label htmlFor={`faculty-${faculty.id}`} className="flex-1 cursor-pointer font-normal">
                          <div className="flex items-center gap-2">
                            <span>{faculty.name}</span>
                            <Badge variant="outline">{faculty.acronym}</Badge>
                          </div>
                        </Label>
                      </div>

                      {/* Schools for this faculty */}
                      {isSelected && facultySchools.length > 0 && (
                        <div className="px-3 pb-3 ml-6 space-y-2 border-t pt-3 mt-2">
                          <Label className="text-sm font-semibold">2. Seleccionar Escuela</Label>
                          <RadioGroup value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                            {facultySchools.map(school => (
                              <div key={school.id} className="flex items-center space-x-3 p-2 rounded hover:bg-muted/50 transition-colors">
                                <RadioGroupItem value={school.id.toString()} id={`school-${school.id}`} />
                                <Label htmlFor={`school-${school.id}`} className="flex-1 cursor-pointer font-normal">
                                  <div className="flex items-center gap-2">
                                    <span>{school.name}</span>
                                    <Badge variant="secondary" className="text-xs">{school.acronym}</Badge>
                                  </div>
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </div>
                      )}
                    </div>
                  );
                })}
            </RadioGroup>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-[600px] sm:max-w-[90vw] flex flex-col">
        <SheetHeader className="flex-shrink-0 px-6">
          <SheetTitle className="text-xl font-bold">Gestionar Permisos</SheetTitle>
          <SheetDescription>
            Asignar permisos de acceso para {userName}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 relative overflow-hidden">
          {/* Fade effect at the top */}
          <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none"></div>

          {/* Scrollable content */}
          <div className="h-full overflow-y-auto py-0 px-6">
            <div className="py-4">
              {renderContent()}
            </div>
          </div>

          {/* Fade effect at the bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none"></div>
        </div>

        {/* Footer - Only show for roles that can save */}
        {userRole !== UserRoleEnum.VICERRECTOR && (
          <SheetFooter className="flex-shrink-0 flex flex-row justify-end gap-3 px-6">
            <Button variant="outline" disabled={isSaving} onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Permisos"
              )}
            </Button>
          </SheetFooter>
        )}

        {/* Footer for Vicerrector - just close button */}
        {userRole === UserRoleEnum.VICERRECTOR && (
          <SheetFooter className="flex-shrink-0 flex flex-row justify-end gap-3 px-6">
            <Button variant="default" onClick={handleClose}>
              Cerrar
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

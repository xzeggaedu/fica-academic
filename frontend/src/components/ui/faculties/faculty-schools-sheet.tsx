import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetIdentity } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/forms/input";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/data/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Check, X, Pencil, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { SchoolDeleteDialog } from "./school-delete-dialog";
import { useSchoolsCrud } from "@/hooks/useSchoolsCrud";
import { UserRoleEnum } from "@/types/auth";

interface School {
  id: number; // School.id es int, no UUID
  name: string;
  acronym: string;
  fk_faculty: number; // Faculty.id es int, no UUID
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

interface FacultySchoolsSheetProps {
  facultyId: number; // Facultades usan int, no UUID
  facultyName: string;
  facultyAcronym: string;
  isOpen: boolean;
  onClose: () => void;
}

export function FacultySchoolsSheet({
  facultyId,
  facultyName,
  facultyAcronym,
  isOpen,
  onClose,
}: FacultySchoolsSheetProps) {
  // Verificar si el usuario es administrador
  const { data: identity } = useGetIdentity<{ role?: string }>();
  const isAdmin = identity?.role === UserRoleEnum.ADMIN;

  // Hook CRUD para escuelas con filtro por facultad
  const {
    itemsList: schools,
    isLoading,
    isError,
    createItem: createSchool,
    updateItem: updateSchool,
    deleteItem: deleteSchool,
    isCreating,
    isUpdating,
    isDeleting,
  } = useSchoolsCrud({ facultyId, enabled: isOpen });

  const queryClient = useQueryClient();

  // Estado para el diálogo de eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [schoolToDelete, setSchoolToDelete] = useState<{ id: number; name: string } | null>(null);

  // Estado para nueva escuela
  const [newSchool, setNewSchool] = useState({
    name: "",
    acronym: "",
    is_active: true,
  });

  // Estado para edición inline
  const [editingSchoolId, setEditingSchoolId] = useState<number | null>(null);
  const [editData, setEditData] = useState({
    name: "",
    acronym: "",
    is_active: true,
  });

  // Cargar escuelas cuando se abre el sheet

  const handleAddSchool = () => {
    if (!newSchool.name.trim()) {
      toast.error('Error de validación', {
        description: 'El nombre es requerido',
        richColors: true,
      });
      return;
    }
    if (!newSchool.acronym.trim()) {
      toast.error('Error de validación', {
        description: 'El acrónimo es requerido',
        richColors: true,
      });
      return;
    }

    createSchool(
      {
        name: newSchool.name,
        acronym: newSchool.acronym.toUpperCase(),
        fk_faculty: facultyId,
        is_active: newSchool.is_active,
      },
      () => {
        // Limpiar formulario
        setNewSchool({ name: "", acronym: "", is_active: true });
      }
    );
  };

  const handleStartEdit = (school: School) => {
    setEditingSchoolId(school.id);
    setEditData({
      name: school.name,
      acronym: school.acronym,
      is_active: school.is_active,
    });
  };

  const handleCancelEdit = () => {
    setEditingSchoolId(null);
    setEditData({ name: "", acronym: "", is_active: true });
  };

  const handleSaveEdit = (schoolId: number) => {
    if (!editData.name.trim()) {
      toast.error('Error de validación', {
        description: 'El nombre es requerido',
        richColors: true,
      });
      return;
    }
    if (!editData.acronym.trim()) {
      toast.error('Error de validación', {
        description: 'El acrónimo es requerido',
        richColors: true,
      });
      return;
    }

    updateSchool(
      schoolId,
      {
        name: editData.name,
        acronym: editData.acronym.toUpperCase(),
        is_active: editData.is_active,
      },
      () => {
        setEditingSchoolId(null);
      }
    );
  };

  const handleDeleteSchool = (schoolId: number, schoolName: string) => {
    setSchoolToDelete({ id: schoolId, name: schoolName });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!schoolToDelete) return;

    deleteSchool(
      schoolToDelete.id,
      schoolToDelete.name,
      () => {
        // Cerrar el diálogo
        setDeleteDialogOpen(false);
        setSchoolToDelete(null);

        // Invalidar queries para refrescar
        queryClient.invalidateQueries({ queryKey: ["schools"] });
        queryClient.refetchQueries({ queryKey: ["schools"] });
      },
      () => {
        // En caso de error, cerrar el diálogo
        setDeleteDialogOpen(false);
        setSchoolToDelete(null);
      }
    );
  };

  return (
    <>
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[500px] sm:max-w-[90vw] flex flex-col">
        <SheetHeader className="flex-shrink-0 px-6">
          <SheetTitle className="text-xl font-bold flex items-center gap-2 max-w-[80%]">
            Escuelas de {facultyName}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 relative overflow-hidden">
          {/* Fade effect at the top */}
          <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none"></div>

          {/* Scrollable content */}
          <div className="h-full overflow-y-auto py-0 px-6">
            <div className="py-2 space-y-6">
              {/* Formulario para agregar nueva escuela */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Agregar Nueva Escuela</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Crea una nueva escuela para esta facultad.
                  </p>
                </div>

                <div className="flex gap-4 items-end">
                  <div className="flex-1 space-y-3">
                    <label className="text-sm font-medium">Nombre*</label>
                    <Input
                      placeholder="Ingrese el nombre de la escuela"
                      value={newSchool.name}
                      onChange={(e) => setNewSchool({ ...newSchool, name: e.target.value })}
                      disabled={isCreating}
                      className="h-11 mt-3"
                    />
                  </div>
                  <div className="w-32 space-y-3">
                    <label className="text-sm font-medium">Acrónimo *</label>
                    <Input
                      placeholder="Ej: INFO"
                      value={newSchool.acronym}
                      onChange={(e) => setNewSchool({ ...newSchool, acronym: e.target.value.toUpperCase() })}
                      maxLength={20}
                      disabled={isCreating}
                      className="h-11 font-mono mt-3"
                    />
                  </div>
                  <div className="flex-shrink-0">
                    <Button
                      onClick={handleAddSchool}
                      disabled={isCreating || !newSchool.name || !newSchool.acronym}
                      className="h-11 px-6"
                    >
                      {isCreating ? 'Agregando...' : 'Agregar'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tabla de escuelas */}
              <div className="space-y-6 border-t pt-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Escuelas Registradas</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Lista de escuelas pertenecientes a esta facultad.
                  </p>
                </div>

                <div className="border rounded-lg">
                  {isLoading ? (
                    <div className="p-8 text-center text-muted-foreground">
                      Cargando escuelas...
                    </div>
                  ) : isError ? (
                    <div className="p-8 text-center text-red-600">
                      Error al cargar escuelas
                    </div>
                  ) : schools.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      No hay escuelas registradas en esta facultad
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60px]">ID</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead className="w-[150px]">Acrónimo</TableHead>
                          <TableHead className="w-[100px] text-center">Estado</TableHead>
                          {isAdmin && <TableHead className="w-[100px]">Acciones</TableHead>}

                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {schools.map((school) => (
                          <TableRow key={school.id}>
                            <TableCell className="font-medium">{school.id}</TableCell>
                            <TableCell>
                              {editingSchoolId === school.id ? (
                                <Input
                                  value={editData.name}
                                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                  className="h-8"
                                />
                              ) : (
                                <span>{school.name}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {editingSchoolId === school.id ? (
                                <Input
                                  value={editData.acronym}
                                  onChange={(e) => setEditData({ ...editData, acronym: e.target.value.toUpperCase() })}
                                  className="h-8 font-mono"
                                  maxLength={20}
                                />
                              ) : (
                                <Badge variant="outline" className="font-mono">
                                  {school.acronym}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {editingSchoolId === school.id ? (
                                <div className="flex justify-center">
                                  <Switch
                                    checked={editData.is_active}
                                    onCheckedChange={(checked) => setEditData({ ...editData, is_active: checked })}
                                  />
                                </div>
                              ) : (
                                <div className="flex justify-center">
                                  {school.is_active ? (
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                  ) : (
                                    <XCircle className="h-5 w-5 text-red-600" />
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {isAdmin && (
                                <div className="flex items-center gap-1">
                                  {editingSchoolId === school.id ? (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-green-600 hover:text-green-700"
                                        onClick={() => handleSaveEdit(school.id)}
                                      >
                                        <Check className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={handleCancelEdit}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleStartEdit(school)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-600 hover:text-red-700"
                                        onClick={() => handleDeleteSchool(school.id, school.name)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                {/* Información de resultados */}
                {!isLoading && !isError && schools.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Total de escuelas: {schools.length}
                  </div>
                )}
              </div>
            </div>

            {/* Fade effect at the bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none"></div>
          </div>
        </div>
      </SheetContent>
    </Sheet>

      {/* Diálogo de confirmación de eliminación */}
      {schoolToDelete && (
        <SchoolDeleteDialog
          schoolName={schoolToDelete.name}
          isOpen={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setSchoolToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
}

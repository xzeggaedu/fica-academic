import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/forms/input";
import { Checkbox } from "@/components/ui/forms/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/data/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Check, X, Pencil } from "lucide-react";
import { toast } from "sonner";

interface School {
  id: number;
  name: string;
  acronym: string;
  fk_faculty: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

interface FacultySchoolsSheetProps {
  facultyId: number;
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
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado para nueva escuela
  const [newSchool, setNewSchool] = useState({
    name: "",
    acronym: "",
    is_active: true,
  });
  const [isAdding, setIsAdding] = useState(false);

  // Estado para edición inline
  const [editingSchoolId, setEditingSchoolId] = useState<number | null>(null);
  const [editData, setEditData] = useState({
    name: "",
    acronym: "",
    is_active: true,
  });

  // Cargar escuelas cuando se abre el sheet
  useEffect(() => {
    if (isOpen && facultyId) {
      loadSchools();
    }
  }, [isOpen, facultyId]);

  const loadSchools = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('fica-access-token');
      if (!token) {
        throw new Error('No se encontró el token de autenticación');
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_BASE_PATH}/schools?faculty_id=${facultyId}&items_per_page=100`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error al cargar las escuelas');
      }

      const data = await response.json();
      setSchools(data.data || []);
    } catch (err) {
      console.error('Error al cargar escuelas:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar escuelas');
      toast.error('Error al cargar escuelas', {
        description: err instanceof Error ? err.message : 'Error desconocido',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSchool = async () => {
    if (!newSchool.name.trim()) {
      toast.error('Error de validación', { description: 'El nombre es requerido' });
      return;
    }
    if (!newSchool.acronym.trim()) {
      toast.error('Error de validación', { description: 'El acrónimo es requerido' });
      return;
    }

    setIsAdding(true);

    try {
      const token = localStorage.getItem('fica-access-token');
      if (!token) {
        throw new Error('No se encontró el token de autenticación');
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_BASE_PATH}/school`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: newSchool.name,
            acronym: newSchool.acronym.toUpperCase(),
            fk_faculty: facultyId,
            is_active: newSchool.is_active,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Error desconocido' }));
        throw new Error(errorData.detail || `Error ${response.status}`);
      }

      toast.success('Escuela creada exitosamente', {
        description: `La escuela "${newSchool.name}" ha sido creada.`,
      });

      // Limpiar formulario
      setNewSchool({ name: "", acronym: "", is_active: true });

      // Recargar escuelas
      await loadSchools();
    } catch (err) {
      console.error('Error al crear escuela:', err);
      toast.error('Error al crear escuela', {
        description: err instanceof Error ? err.message : 'Error desconocido',
      });
    } finally {
      setIsAdding(false);
    }
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

  const handleSaveEdit = async (schoolId: number) => {
    if (!editData.name.trim()) {
      toast.error('Error de validación', { description: 'El nombre es requerido' });
      return;
    }
    if (!editData.acronym.trim()) {
      toast.error('Error de validación', { description: 'El acrónimo es requerido' });
      return;
    }

    try {
      const token = localStorage.getItem('fica-access-token');
      if (!token) {
        throw new Error('No se encontró el token de autenticación');
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_BASE_PATH}/school/${schoolId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: editData.name,
            acronym: editData.acronym.toUpperCase(),
            is_active: editData.is_active,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Error desconocido' }));
        throw new Error(errorData.detail || `Error ${response.status}`);
      }

      toast.success('Escuela actualizada exitosamente', {
        description: `La escuela "${editData.name}" ha sido actualizada.`,
      });

      setEditingSchoolId(null);
      await loadSchools();
    } catch (err) {
      console.error('Error al actualizar escuela:', err);
      toast.error('Error al actualizar escuela', {
        description: err instanceof Error ? err.message : 'Error desconocido',
      });
    }
  };

  const handleDeleteSchool = async (schoolId: number, schoolName: string) => {
    if (!confirm(`¿Estás seguro de eliminar la escuela "${schoolName}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('fica-access-token');
      if (!token) {
        throw new Error('No se encontró el token de autenticación');
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_BASE_PATH}/school/${schoolId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Error desconocido' }));
        throw new Error(errorData.detail || `Error ${response.status}`);
      }

      toast.success('Escuela eliminada exitosamente', {
        description: `La escuela "${schoolName}" ha sido eliminada.`,
      });

      await loadSchools();
    } catch (err) {
      console.error('Error al eliminar escuela:', err);
      toast.error('Error al eliminar escuela', {
        description: err instanceof Error ? err.message : 'Error desconocido',
      });
    }
  };

  return (
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
                      disabled={isAdding}
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
                      disabled={isAdding}
                      className="h-11 font-mono mt-3"
                    />
                  </div>
                  <div className="flex-shrink-0">
                    <Button
                      onClick={handleAddSchool}
                      disabled={isAdding || !newSchool.name || !newSchool.acronym}
                      className="h-11 px-6"
                    >
                      {isAdding ? 'Agregando...' : 'Agregar'}
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
                  ) : error ? (
                    <div className="p-8 text-center text-red-600">
                      {error}
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
                          <TableHead className="w-[100px]">Estado</TableHead>
                          <TableHead className="w-[100px]">Acciones</TableHead>
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
                            <TableCell>
                              {editingSchoolId === school.id ? (
                                <Checkbox
                                  checked={editData.is_active}
                                  onCheckedChange={(checked) => setEditData({ ...editData, is_active: checked as boolean })}
                                />
                              ) : (
                                <Badge variant={school.is_active ? "default" : "secondary"}>
                                  {school.is_active ? "Activa" : "Inactiva"}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
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
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                {/* Información de resultados */}
                {!isLoading && !error && schools.length > 0 && (
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
  );
}

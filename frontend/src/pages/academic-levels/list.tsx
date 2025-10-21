import React, { useState, useEffect } from "react";
import { GraduationCap, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/forms/input";
import { Label } from "@/components/ui/forms/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/data/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Unauthorized } from "../unauthorized";
import { useAcademicLevelsCrud } from "@/hooks/useAcademicLevelsCrud";
import type { AcademicLevel, AcademicLevelCreate } from "@/types/api";
import { AcademicLevelCreateSheet } from "@/components/ui/academic-levels";
import { Textarea } from "@/components/ui/forms/textarea";

const PRIORITY_COLORS: Record<number, string> = {
  5: "bg-purple-500",
  4: "bg-blue-500",
  3: "bg-green-500",
  2: "bg-yellow-500",
  1: "bg-gray-500",
};

const PRIORITY_LABELS: Record<number, string> = {
  5: "Muy Alta",
  4: "Alta",
  3: "Media",
  2: "Baja",
  1: "Base",
};

export function AcademicLevelsList() {
  const {
    canAccess,
    canCreate,
    canEdit,
    canDelete,
    itemsList: academicLevels,
    total,
    isLoading,
    isError,
    createItem,
    updateItem,
    softDeleteItem,
    isCreating,
    isUpdating,
    isDeleting,
  } = useAcademicLevelsCrud();

  // Estados locales
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [levelToDelete, setLevelToDelete] = useState<{ id: number; code: string; name: string } | null>(null);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [newLevel, setNewLevel] = useState<AcademicLevelCreate>({
    code: "",
    name: "",
    priority: 1,
    description: null,
    is_active: true,
  });

  // Función para manejar edición inline
  const handleEdit = (id: number, field: string, value: string | number) => {
    setEditingId(id);
    setEditingField(field);
    setEditingValue(String(value));
  };

  // Función para guardar edición inline
  const handleSaveEdit = (id: number, field: string, value: string) => {
    const level = academicLevels.find((l) => l.id === id);
    if (!level) return;

    // Validar que el valor haya cambiado
    if ((level as any)[field] === value || (field === "priority" && (level as any)[field] === parseInt(value))) {
      setEditingId(null);
      setEditingField(null);
      setEditingValue("");
      return;
    }

    const updateData: any = {};

    if (field === "priority") {
      const priorityValue = parseInt(value);
      if (isNaN(priorityValue) || priorityValue < 1 || priorityValue > 5) {
        toast.error("Prioridad inválida", {
          description: "La prioridad debe ser un número entre 1 y 5",
          richColors: true,
        });
        return;
      }
      updateData.priority = priorityValue;
    } else if (field === "code") {
      if (!value.trim()) {
        toast.error("Código inválido", {
          description: "El código no puede estar vacío",
          richColors: true,
        });
        return;
      }
      updateData.code = value.trim().toUpperCase();
    } else if (field === "name") {
      if (!value.trim()) {
        toast.error("Nombre inválido", {
          description: "El nombre no puede estar vacío",
          richColors: true,
        });
        return;
      }
      updateData.name = value.trim();
    } else if (field === "description") {
      updateData.description = value.trim() || null;
    }

    updateItem(id, updateData, () => {
      setEditingId(null);
      setEditingField(null);
      setEditingValue("");
    });
  };

  // Función para toggle de estado activo
  const handleToggleActive = (id: number, checked: boolean) => {
    updateItem(id, { is_active: checked });
  };

  // Función para abrir diálogo de eliminación
  const handleDelete = (level: AcademicLevel) => {
    setLevelToDelete({ id: level.id, code: level.code, name: level.name });
    setDeleteDialogOpen(true);
  };

  // Función para confirmar eliminación
  const handleConfirmDelete = () => {
    if (!levelToDelete) return;

    softDeleteItem(levelToDelete.id, levelToDelete.name, () => {
      setDeleteDialogOpen(false);
      setLevelToDelete(null);
    });
  };

  // Función para crear nuevo nivel
  const handleCreate = () => {
    // Validaciones
    if (!newLevel.code.trim() || !newLevel.name.trim()) {
      toast.error("Error de validación", {
        description: "El código y el nombre son requeridos",
        richColors: true,
      });
      return;
    }

    if (newLevel.priority < 1 || newLevel.priority > 5) {
      toast.error("Prioridad inválida", {
        description: "La prioridad debe estar entre 1 y 5",
        richColors: true,
      });
      return;
    }

    const createData: AcademicLevelCreate = {
      code: newLevel.code.trim().toUpperCase(),
      name: newLevel.name.trim(),
      priority: newLevel.priority,
      description: newLevel.description?.trim() || null,
      is_active: newLevel.is_active,
    };

    createItem(createData, () => {
      setIsCreateSheetOpen(false);
      setNewLevel({
        code: "",
        name: "",
        priority: 1,
        description: null,
        is_active: true,
      });
    });
  };

  if (!canAccess?.can) {
    return <Unauthorized />;
  }

  if (isError) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Error al cargar niveles académicos</h1>
        <p className="text-red-500">Ha ocurrido un error al cargar los datos.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Niveles Académicos</h1>
          <p className="text-muted-foreground">
            Gestión de jerarquía de compensación docente
          </p>
        </div>
        {canCreate?.can && (
          <Button onClick={() => setIsCreateSheetOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Nivel
          </Button>
        )}
      </div>

      {/* Tabla de niveles académicos */}
      <Card>
        <CardHeader>
          <CardTitle>Niveles Configurados</CardTitle>
          <CardDescription>{total} niveles académicos registrados</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-center w-[100px]">Estado</TableHead>
                  <TableHead className="text-center w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {academicLevels.map((level) => (
                  <TableRow key={level.id}>
                    <TableCell className="font-medium">{level.id}</TableCell>
                    <TableCell>
                      {editingId === level.id && editingField === "code" ? (
                        <Input
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value.toUpperCase())}
                          onBlur={() => handleSaveEdit(level.id, "code", editingValue)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSaveEdit(level.id, "code", editingValue);
                            }
                            if (e.key === "Escape") {
                              setEditingId(null);
                              setEditingField(null);
                              setEditingValue("");
                            }
                          }}
                          autoFocus
                          className="h-8"
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:bg-muted px-2 py-1 rounded font-mono"
                          onClick={() => canEdit?.can && handleEdit(level.id, "code", level.code)}
                        >
                          {level.code}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === level.id && editingField === "name" ? (
                        <Input
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleSaveEdit(level.id, "name", editingValue)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSaveEdit(level.id, "name", editingValue);
                            }
                            if (e.key === "Escape") {
                              setEditingId(null);
                              setEditingField(null);
                              setEditingValue("");
                            }
                          }}
                          autoFocus
                          className="h-8"
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:bg-muted px-2 py-1 rounded"
                          onClick={() => canEdit?.can && handleEdit(level.id, "name", level.name)}
                        >
                          {level.name}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === level.id && editingField === "priority" ? (
                        <Input
                          type="number"
                          min="1"
                          max="5"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleSaveEdit(level.id, "priority", editingValue)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSaveEdit(level.id, "priority", editingValue);
                            }
                            if (e.key === "Escape") {
                              setEditingId(null);
                              setEditingField(null);
                              setEditingValue("");
                            }
                          }}
                          autoFocus
                          className="h-8 w-20"
                        />
                      ) : (
                        <div
                          className="cursor-pointer hover:bg-muted px-2 py-1 rounded inline-flex items-center gap-2"
                          onClick={() => canEdit?.can && handleEdit(level.id, "priority", level.priority)}
                        >
                          <Badge className={PRIORITY_COLORS[level.priority] || "bg-gray-500"}>
                            {level.priority}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {PRIORITY_LABELS[level.priority]}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === level.id && editingField === "description" ? (
                        <Textarea
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleSaveEdit(level.id, "description", editingValue)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              setEditingId(null);
                              setEditingField(null);
                              setEditingValue("");
                            }
                          }}
                          autoFocus
                          className="min-h-[60px]"
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:bg-muted px-2 py-1 rounded text-sm text-muted-foreground"
                          onClick={() =>
                            canEdit?.can && handleEdit(level.id, "description", level.description || "")
                          }
                        >
                          {level.description || "-"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={level.is_active}
                        onCheckedChange={(checked) => handleToggleActive(level.id, checked)}
                        disabled={!canEdit?.can}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      {canDelete?.can && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(level)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Sheet para crear nivel académico */}
      <AcademicLevelCreateSheet
        isOpen={isCreateSheetOpen}
        onClose={() => setIsCreateSheetOpen(false)}
        newLevel={newLevel}
        onNewLevelChange={setNewLevel}
        onCreate={handleCreate}
        isCreating={isCreating}
      />

      {/* Diálogo de confirmación de eliminación */}
      <DeleteConfirmDialog
        entityType="nivel académico"
        entityName={levelToDelete ? `${levelToDelete.code} - ${levelToDelete.name}` : ""}
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        gender="m"
      />
    </div>
  );
}

import React, { useState } from "react";
import { MoreHorizontal, Edit, Trash2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FacultyEditSheet } from "./faculty-edit-sheet";
import { FacultyDeleteDialog } from "./faculty-delete-dialog";
import { FacultySchoolsSheet } from "./faculty-schools-sheet";

interface FacultyActionsProps {
  facultyId: number;
  facultyName: string;
  facultyAcronym?: string;
  onSuccess?: () => void;
}

export function FacultyActions({ facultyId, facultyName, facultyAcronym = "", onSuccess }: FacultyActionsProps) {
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSchoolsSheetOpen, setIsSchoolsSheetOpen] = useState(false);

  const handleEdit = () => {
    setIsEditSheetOpen(true);
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleSchools = () => {
    setIsSchoolsSheetOpen(true);
  };

  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menú</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSchools}>
            <Building2 className="mr-2 h-4 w-4" />
            Escuelas
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Editar Facultad
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDelete} className="text-red-600">
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sheet para editar facultad */}
      <FacultyEditSheet
        facultyId={facultyId}
        facultyName={facultyName}
        isOpen={isEditSheetOpen}
        onClose={() => setIsEditSheetOpen(false)}
        onSuccess={handleSuccess}
      />

      {/* Dialog para eliminar facultad */}
      <FacultyDeleteDialog
        facultyId={facultyId}
        facultyName={facultyName}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onSuccess={handleSuccess}
      />

      {/* Sheet para gestionar escuelas */}
      <FacultySchoolsSheet
        facultyId={facultyId}
        facultyName={facultyName}
        facultyAcronym={facultyAcronym}
        isOpen={isSchoolsSheetOpen}
        onClose={() => setIsSchoolsSheetOpen(false)}
      />
    </>
  );
}

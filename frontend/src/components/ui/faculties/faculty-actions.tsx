import { useState } from "react";
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
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { FacultyEditSheet } from "./faculty-edit-sheet";
import { FacultySchoolsSheet } from "./faculty-schools-sheet";

interface FacultyActionsProps {
  facultyId: number; // Facultades usan int, no UUID
  facultyName: string;
  facultyAcronym?: string;
  onSuccess?: () => void;
  onDelete: (facultyId: number, facultyName: string) => void;
  isDeleting: boolean;
}

export function FacultyActions({
  facultyId,
  facultyName,
  facultyAcronym = "",
  onSuccess,
  onDelete,
  isDeleting
}: FacultyActionsProps) {
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSchoolsSheetOpen, setIsSchoolsSheetOpen] = useState(false);

  const handleEdit = () => {
    setIsEditSheetOpen(true);
  };

  const handleDeleteClick = () => {
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

  // Manejar confirmación de eliminación (soft delete)
  const handleConfirmDelete = () => {
    onDelete(facultyId, facultyName);
    setIsDeleteDialogOpen(false);
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
          <DropdownMenuItem onClick={handleDeleteClick} className="text-red-600">
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

      {/* Dialog de confirmación de soft delete */}
      <DeleteConfirmDialog
        entityType="facultad"
        entityName={facultyName}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        gender="f"
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

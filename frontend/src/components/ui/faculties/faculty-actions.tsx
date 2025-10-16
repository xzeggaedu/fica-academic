import { useState } from "react";
import { MoreHorizontal, Edit, Trash2, Building2, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              ¿Eliminar facultad?
            </AlertDialogTitle>
            <div className="text-sm text-muted-foreground space-y-3">
              <div className="text-base">
                La facultad <strong className="text-foreground">{facultyName}</strong> será movida a la papelera de reciclaje.
              </div>
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-3">
                <span className="text-sm flex text-blue-800 dark:text-blue-200 items-start">
                  <span className="mt-1">💡</span> <span className="ml-2"><strong>Podrás restaurarla más tarde</strong> desde la papelera de reciclaje si lo necesitas.</span>
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Esta facultad y sus escuelas asociadas estarán ocultas hasta que sea restaurada o eliminada permanentemente.
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isDeleting ? 'Moviendo...' : 'Mover a papelera'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

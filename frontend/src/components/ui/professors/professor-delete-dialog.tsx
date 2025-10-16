import React from "react";
import { Archive } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProfessorDeleteDialogProps {
  professorId: number;
  professorName: string;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (professorId: number, professorName: string) => void;
  isDeleting?: boolean;
}

export function ProfessorDeleteDialog({
  professorId,
  professorName,
  isOpen,
  onClose,
  onDelete,
  isDeleting = false
}: ProfessorDeleteDialogProps) {
  const handleDelete = () => {
    if (onDelete) {
      onDelete(professorId, professorName);
    }
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            ¿Eliminar profesor?
          </AlertDialogTitle>
          <div className="text-sm text-muted-foreground space-y-3">
            <div className="text-base">
              El profesor <strong className="text-foreground">{professorName}</strong> será movido a la papelera de reciclaje.
            </div>
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-3">
              <span className="text-sm flex text-blue-800 dark:text-blue-200 items-start">
                <span className="mt-1">💡</span> <span className="ml-2"><strong>Podrás restaurarlo más tarde</strong> desde la papelera de reciclaje si lo necesitas.</span>
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Este profesor no estará disponible en el catálogo hasta que sea restaurado.
            </div>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Moviendo...' : 'Mover a papelera'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

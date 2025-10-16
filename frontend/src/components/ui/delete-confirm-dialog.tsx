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

interface DeleteConfirmDialogProps {
  /** Tipo de entidad en singular (ej: "profesor", "facultad", "asignatura") */
  entityType: string;
  /** Nombre de la entidad a eliminar */
  entityName: string;
  /** Si el diálogo está abierto */
  isOpen: boolean;
  /** Callback para cerrar el diálogo */
  onClose: () => void;
  /** Callback para confirmar la eliminación */
  onConfirm: () => void;
  /** Si está en proceso de eliminación */
  isDeleting?: boolean;
  /** Género de la entidad: "m" (masculino) o "f" (femenino) */
  gender?: "m" | "f";
}

export function DeleteConfirmDialog({
  entityType,
  entityName,
  isOpen,
  onClose,
  onConfirm,
  isDeleting = false,
  gender = "m"
}: DeleteConfirmDialogProps) {
  // Artículos y pronombres según el género
  const article = gender === "f" ? "La" : "El";
  const articleLower = gender === "f" ? "la" : "el";
  const pronoun = gender === "f" ? "esta" : "este";
  const restored = gender === "f" ? "restaurada" : "restaurado";
  const available = gender === "f" ? "disponible" : "disponible";

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            ¿Eliminar {entityType}?
          </AlertDialogTitle>
          <div className="text-sm text-muted-foreground space-y-3">
            <div className="text-base">
              {article} {entityType} <strong className="text-foreground">{entityName}</strong> será {gender === "f" ? "movida" : "movido"} a la papelera de reciclaje.
            </div>
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-3">
              <span className="text-sm flex text-blue-800 dark:text-blue-200 items-start">
                <span className="mt-1">💡</span>
                <span className="ml-2">
                  <strong>Podrás restaurar{articleLower} más tarde</strong> desde la papelera de reciclaje si lo necesitas.
                </span>
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {pronoun.charAt(0).toUpperCase() + pronoun.slice(1)} {entityType} no estará {available} en el catálogo hasta que sea {restored}.
            </div>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
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

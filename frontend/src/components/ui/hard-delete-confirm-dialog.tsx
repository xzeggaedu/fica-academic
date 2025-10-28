import React from "react";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface HardDeleteConfirmDialogProps {
  /** Tipo de entidad en singular (ej: "archivo", "profesor", "facultad") */
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

export function HardDeleteConfirmDialog({
  entityType,
  entityName,
  isOpen,
  onClose,
  onConfirm,
  isDeleting = false,
  gender = "m"
}: HardDeleteConfirmDialogProps) {
  // Artículos y pronombres según el género
  const article = gender === "f" ? "La" : "El";
  const pronoun = gender === "f" ? "esta" : "este";
  const deleted = gender === "f" ? "eliminada" : "eliminado";

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            ¿Eliminar permanentemente {article.toLowerCase()} {entityType}?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <div className="text-base">
              {article} {entityType} <strong className="text-foreground">{entityName}</strong> será {deleted} permanentemente.
            </div>
            <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-3">
              <span className="text-sm flex text-red-800 dark:text-red-200 items-start">
                <span className="mt-1">⚠️</span>
                <span className="ml-2">
                  <strong>Esta acción no se puede deshacer</strong>. {pronoun.charAt(0).toUpperCase() + pronoun.slice(1)} {entityType} será eliminad{gender === "f" ? "a" : "o"} de forma permanente.
                </span>
              </span>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Eliminando...' : 'Eliminar permanentemente'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

import React from "react";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface HardDeleteConfirmDialogProps {
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

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
            ¿Eliminar {entityType} permanentemente?
          </AlertDialogTitle>
          <div className="text-sm text-muted-foreground space-y-3">
            <div className="text-base">
              {article} {entityType} <strong className="text-foreground">{entityName}</strong> será eliminada permanentemente.
            </div>
            <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-3">
              <span className="text-sm flex text-red-800 dark:text-red-200 items-start">
                <span className="mt-1">⚠️</span>
                <span className="ml-2">
                  <strong>Esta acción no se puede deshacer.</strong> {pronoun.charAt(0).toUpperCase() + pronoun.slice(1)} {entityType} será eliminada permanentemente de la base de datos.
                </span>
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Si {pronoun.charAt(0).toUpperCase() + pronoun.slice(1)} {entityType} es la tarifa vigente, se reactivará automáticamente la tarifa anterior.
            </div>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Eliminando...' : 'Eliminar permanentemente'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

import React from "react";
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

interface ScheduleDeleteDialogProps {
  scheduleId: number;
  scheduleRange: string;
  dayGroupName: string;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (scheduleId: number, scheduleRange: string, dayGroupName: string) => void;
  isDeleting?: boolean;
}

export function ScheduleDeleteDialog({
  scheduleId,
  scheduleRange,
  dayGroupName,
  isOpen,
  onClose,
  onDelete,
  isDeleting = false,
}: ScheduleDeleteDialogProps) {
  const handleDelete = () => {
    if (onDelete) {
      onDelete(scheduleId, scheduleRange, dayGroupName);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar Horario</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              ¿Estás seguro de que deseas eliminar el horario <strong>{dayGroupName} de {scheduleRange}</strong>?
            </p>
            <p className="text-red-600 font-semibold">
              Esta acción no se puede deshacer.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? 'Eliminando...' : 'Eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

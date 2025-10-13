import React, { useState } from "react";
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
import { toast } from "sonner";

interface ScheduleDeleteDialogProps {
  scheduleId: number;
  scheduleRange: string;
  dayGroupName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ScheduleDeleteDialog({
  scheduleId,
  scheduleRange,
  dayGroupName,
  isOpen,
  onClose,
  onSuccess,
}: ScheduleDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const token = localStorage.getItem('fica-access-token');
      if (!token) {
        throw new Error('No se encontró el token de autenticación');
      }

      const response = await fetch(
        `http://localhost:8000/api/v1/catalog/schedule-times/${scheduleId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Error desconocido' }));
        throw new Error(errorData.detail || `Error ${response.status}: ${response.statusText}`);
      }

      console.log('Horario eliminado exitosamente');

      // Mostrar toast de éxito
      toast.success('Horario eliminado exitosamente', {
        description: `El horario "${dayGroupName} - ${scheduleRange}" ha sido eliminado correctamente.`,
        richColors: true,
      });

      // Cerrar diálogo
      onClose();

      // Llamar al callback de éxito
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error al eliminar horario:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar el horario';

      // Mostrar toast de error
      toast.error('Error al eliminar horario', {
        description: errorMessage,
        richColors: true,
      });

      setError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setError(null);
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
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

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

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

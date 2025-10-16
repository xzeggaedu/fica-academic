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
import { useGetIdentity } from "@refinedev/core";

interface UserDeleteDialogProps {
  userId: string;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (userId: string, userName: string) => void;
  isDeleting?: boolean;
}

export function UserDeleteDialog({
  userId,
  userName,
  isOpen,
  onClose,
  onDelete,
  isDeleting = false
}: UserDeleteDialogProps) {
  const { data: currentUser } = useGetIdentity();
  const isCurrentUser = currentUser?.id === userId;

  const handleDelete = () => {
    if (onDelete) {
      onDelete(userId, userName);
    }
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            ¿Eliminar usuario?
          </AlertDialogTitle>
          <div className="text-sm text-muted-foreground space-y-3">
            {isCurrentUser ? (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-3">
                <div className="text-base text-red-800 dark:text-red-200">
                  <strong>⚠️ No puedes eliminar tu propia cuenta</strong>
                </div>
                <div className="text-sm text-red-700 dark:text-red-300 mt-2">
                  Esta acción está restringida por seguridad.
                </div>
                <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                  Usuario actual: <strong>{userName}</strong>
                </div>
              </div>
            ) : (
              <>
                <div className="text-base">
                  El usuario <strong className="text-foreground">{userName}</strong> será movido a la papelera de reciclaje.
                </div>
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-3">
                  <span className="text-sm flex text-blue-800 dark:text-blue-200 items-start">
                    <span className="mt-1">💡</span> <span className="ml-2"><strong>Podrás restaurarla más tarde</strong> desde la papelera de reciclaje si lo necesitas.</span>
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Este usuario no podrá iniciar sesión hasta que sea restaurado.
                </div>
              </>
            )}
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          {!isCurrentUser && (
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isDeleting ? 'Moviendo...' : 'Mover a papelera'}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

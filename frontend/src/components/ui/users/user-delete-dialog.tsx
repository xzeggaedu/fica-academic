import React, { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/forms/input";
import { Label } from "@/components/ui/forms/label";
import { useGetIdentity } from "@refinedev/core";
import { toast } from "sonner";

interface UserDeleteDialogProps {
  userId: number;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UserDeleteDialog({ userId, userName, isOpen, onClose, onSuccess }: UserDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const { data: currentUser } = useGetIdentity();

  const requiredText = "eliminar usuario permanentemente";
  const isConfirmationValid = confirmationText === requiredText;
  const isCurrentUser = currentUser?.id === userId;

  const handleClose = () => {
    setConfirmationText("");
    onClose();
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const token = localStorage.getItem("fica-access-token");

      if (!token) {
        throw new Error("No hay token de autenticación disponible");
      }

      const url = `http://localhost:8000/api/v1/user/id/${userId}`;


      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expirado o inválido
          localStorage.removeItem("fica-access-token");
          localStorage.removeItem("fica-refresh-token");
          throw new Error("Sesión expirada. Por favor, inicia sesión nuevamente.");
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Mostrar toast de éxito
      toast.success('Usuario eliminado exitosamente', {
        description: `El usuario "${userName}" ha sido eliminado correctamente.`,
        richColors: true,
      });

      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("UserDeleteDialog - Delete error:", err);

      // Mostrar toast de error
      const errorMessage = (err as Error).message;
      toast.error('Error al eliminar usuario', {
        description: errorMessage,
        richColors: true,
      });

      // Si es error de autenticación, redirigir al login
      if (errorMessage.includes("Sesión expirada")) {
        window.location.href = "/login";
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
          <AlertDialogDescription>
            {isCurrentUser ? (
              <>
                No puedes eliminar tu propia cuenta. Esta acción está restringida por seguridad.
                <br />
                <strong>Usuario actual: {userName}</strong>
              </>
            ) : (
              <>
                Esta acción no se puede deshacer. Se eliminará permanentemente el usuario{" "}
                <strong>{userName}</strong> del sistema.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {!isCurrentUser && (
          <div className="py-4">
            <Label htmlFor="confirmation-text" className="text-sm font-medium">
              Para confirmar, escribe: <span className="font-mono text-red-600">eliminar usuario permanentemente</span>
            </Label>
            <Input
              id="confirmation-text"
              type="text"
              placeholder="eliminar usuario permanentemente"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              className="mt-2"
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>Cancelar</AlertDialogCancel>
          {!isCurrentUser && (
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting || !isConfirmationValid}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

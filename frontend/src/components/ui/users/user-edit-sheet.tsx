import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { UserEditForm } from "./user-edit-form";
import { useOne } from "@refinedev/core";
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
import { useUsersCrud } from "@/hooks/useUsersCrud";

interface UserEditSheetProps {
  userId: string;  // Cambiado de number a string para UUID
  userName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type UpdateFunction = (userData: any) => void;
type PasswordUpdateFunction = (passwordData: any) => void;
type UpdatePayload = any;

interface UpdateState {
  functionCallback: UpdateFunction | PasswordUpdateFunction | null;
  payload: UpdatePayload | null;
  enable: boolean;
}

export function UserEditSheet({ userId, userName, isOpen, onClose, onSuccess }: UserEditSheetProps) {
  // Hook CRUD para usuarios
  const {
    updateItem: updateUser,
    updatePassword: updateUserPassword,
    isUpdating,
    isUpdatingPassword,
  } = useUsersCrud();

  const [activeTab, setActiveTab] = useState("profile");
  const [updateState, setUpdateState] = useState<UpdateState>({
    functionCallback: null,
    payload: null,
    enable: false
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { result, query } = useOne({
    resource: "users",
    id: userId,
    queryOptions: {
      enabled: isOpen && !!userId,
    },
  });

  const isLoading = query.isLoading;
  const error = query.error;

  useEffect(() => {
    if (activeTab === "password") {
      setUpdateState(prev => ({
        ...prev,
        functionCallback: handleUpdatePassword
      }));
    } else {
      setUpdateState(prev => ({
        ...prev,
        functionCallback: handleUpdateUser
      }));
    }
  }, [activeTab]);

  const handleSuccess = () => {
    onClose();
    if (onSuccess) {
      onSuccess();
    }
  };

  const handleActiveTabChange = (tab: string) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  };

  const handleUpdateUser: UpdateFunction = (userData: any) => {
    updateUser(userId, userData, () => {
      handleSuccess();
    });
  };

  const handleUpdatePassword: PasswordUpdateFunction = (passwordData: any) => {
    updateUserPassword(userId, passwordData, () => {
      handleSuccess();
    });
  };

  const handleSubmitClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmUpdate = () => {
    if (updateState.functionCallback && updateState.payload) {
      updateState.functionCallback(updateState.payload);
    }
    setShowConfirmDialog(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[500px] sm:max-w-[90vw] flex flex-col">
        <SheetHeader className="flex-shrink-0 px-6">
          <SheetTitle className="text-xl font-bold flex items-center gap-2 max-w-[80%]">{userName}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 relative overflow-hidden">
          {/* Fade effect at the top */}
          <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none"></div>

          {/* Scrollable content */}
          <div className="h-full overflow-y-auto py-0 px-6">
            <div className="py-2">
              <UserEditForm data={result}
                isLoading={isLoading}
               error={error?.message}
               onActiveTabChange={handleActiveTabChange}
               setUpdateState={setUpdateState} />
            </div>
          </div>

          {/* Fade effect at the bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none"></div>
        </div>

        <SheetFooter className="flex-shrink-0 flex flex-row justify-end gap-3">
          <SheetClose asChild>
            <Button variant="outline">Cancelar</Button>
          </SheetClose>
          <Button
            type="button"
            onClick={handleSubmitClick}
            disabled={!updateState.enable || !updateState.payload || Object.keys(updateState.payload).length === 0}
          >
            {activeTab === "password" ? "Actualizar Contraseña" : "Actualizar Usuario"}
          </Button>
        </SheetFooter>
      </SheetContent>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Actualización</AlertDialogTitle>
            <AlertDialogDescription>
              {activeTab === "password"
                ? "¿Estás seguro de que deseas cambiar la contraseña de este usuario? Esta acción es irreversible y el usuario deberá usar la nueva contraseña para iniciar sesión."
                : "¿Estás seguro de que deseas actualizar la información de este usuario? Esta acción modificará los datos permanentemente."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUpdate}>
              {activeTab === "password" ? "Confirmar Cambio de Contraseña" : "Confirmar Actualización"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}

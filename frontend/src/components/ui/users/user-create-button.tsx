import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserCreateSheet } from "./user-create-sheet";

interface UserCreateButtonProps {
  onSuccess?: () => void;
  onCreate?: (userData: {
    name: string;
    username: string;
    email: string;
    password: string;
    profile_image_url: string;
    role: string;
  }, onSuccessCallback?: () => void) => void;
  isCreating?: boolean;
}

export function UserCreateButton({ onSuccess, onCreate, isCreating }: UserCreateButtonProps) {
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);

  const handleCreate = () => {
    setIsCreateSheetOpen(true);
  };

  const handleSuccess = () => {
    setIsCreateSheetOpen(false);
    if (onSuccess) {
      onSuccess();
    }
  };

  const handleCreateWithCallback = (userData: {
    name: string;
    username: string;
    email: string;
    password: string;
    profile_image_url: string;
    role: string;
  }) => {
    if (onCreate) {
      // Pasar handleSuccess como callback para que se llame después del éxito
      onCreate(userData, handleSuccess);
    }
  };

  return (
    <>
      <Button onClick={handleCreate} className="h-9">
        <Plus className="mr-2 h-4 w-4" />
        Crear Usuario
      </Button>

      {/* Sheet para crear usuario */}
      <UserCreateSheet
        isOpen={isCreateSheetOpen}
        onClose={() => setIsCreateSheetOpen(false)}
        onSuccess={handleSuccess}
        onCreate={handleCreateWithCallback}
        isCreating={isCreating}
      />
    </>
  );
}

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserCreateSheet } from "./user-create-sheet";

interface UserCreateButtonProps {
  onSuccess?: () => void;
}

export function UserCreateButton({ onSuccess }: UserCreateButtonProps) {
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
      />
    </>
  );
}

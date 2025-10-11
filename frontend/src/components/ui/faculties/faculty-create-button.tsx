import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FacultyCreateSheet } from "./faculty-create-sheet";

interface FacultyCreateButtonProps {
  onSuccess?: () => void;
}

export function FacultyCreateButton({ onSuccess }: FacultyCreateButtonProps) {
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
        Crear Facultad
      </Button>

      {/* Sheet para crear facultad */}
      <FacultyCreateSheet
        isOpen={isCreateSheetOpen}
        onClose={() => setIsCreateSheetOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
}

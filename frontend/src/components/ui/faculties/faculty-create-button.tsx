import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FacultyCreateSheet } from "./faculty-create-sheet";

interface FacultyCreateButtonProps {
  onSuccess?: () => void;
  onCreate?: (facultyData: { name: string; acronym: string; is_active: boolean }, onSuccessCallback?: () => void) => void;
  isCreating?: boolean;
}

export function FacultyCreateButton({ onSuccess, onCreate, isCreating = false }: FacultyCreateButtonProps) {
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

  // Wrapper para pasar el callback de éxito al onCreate
  const handleCreateWithCallback = (facultyData: { name: string; acronym: string; is_active: boolean }) => {
    if (onCreate) {
      onCreate(facultyData, handleSuccess);
    }
  };

  return (
    <>
      <Button onClick={handleCreate} className="h-9" disabled={isCreating}>
        <Plus className="mr-2 h-4 w-4" />
        {isCreating ? 'Creando...' : 'Crear Facultad'}
      </Button>

      {/* Sheet para crear facultad */}
      <FacultyCreateSheet
        isOpen={isCreateSheetOpen}
        onClose={() => setIsCreateSheetOpen(false)}
        onSuccess={handleSuccess}
        onCreate={handleCreateWithCallback}
        isCreating={isCreating}
      />
    </>
  );
}

import React from "react";
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
import { FacultyCreateForm } from "./faculty-create-form";

interface FacultyCreateSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onCreate?: (facultyData: { name: string; acronym: string; is_active: boolean }) => void;
  isCreating?: boolean;
}

export function FacultyCreateSheet({ isOpen, onClose, onSuccess, onCreate, isCreating = false }: FacultyCreateSheetProps) {
  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess();
    }
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[500px] sm:max-w-[90vw] flex flex-col">
        <SheetHeader className="flex-shrink-0 px-6">
          <SheetTitle className="text-xl font-bold flex items-center gap-2 max-w-[80%]">Crear Nueva Facultad</SheetTitle>
          <SheetDescription>
            Completa la información para crear una nueva facultad en el sistema.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 relative overflow-hidden">
          {/* Fade effect at the top */}
          <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none"></div>

          {/* Scrollable content */}
          <div className="h-full overflow-y-auto py-0 px-6">
            <div className="py-2">
              <FacultyCreateForm
                key={isOpen ? 'open' : 'closed'}
                onSuccess={handleSuccess}
                onClose={onClose}
                onCreate={onCreate}
                isCreating={isCreating}
              />
            </div>
          </div>

          {/* Fade effect at the bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none"></div>
        </div>

        <SheetFooter className="flex-shrink-0 flex flex-row justify-end gap-3">
          <SheetClose asChild>
            <Button variant="outline" disabled={isCreating}>Cancelar</Button>
          </SheetClose>
          <Button form="faculty-create-form" type="submit" disabled={isCreating}>
            {isCreating ? 'Creando...' : 'Crear Facultad'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

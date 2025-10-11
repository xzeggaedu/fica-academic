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

interface UserEditSheetProps {
  userId: number;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UserEditSheet({ userId, userName, isOpen, onClose, onSuccess }: UserEditSheetProps) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && userId) {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem("fica-access-token");
      const url = `http://localhost:8000/api/v1/user/id/${userId}`;

      fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(userData => {
        setData(userData);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setIsLoading(false);
      });
    }
  }, [isOpen, userId]);

  const handleSuccess = () => {
    onClose();
    if (onSuccess) {
      onSuccess();
    }
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
              <UserEditForm data={data} isLoading={isLoading} error={error} onSuccess={handleSuccess} onClose={onClose} />
            </div>
          </div>

          {/* Fade effect at the bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none"></div>
        </div>

        <SheetFooter className="flex-shrink-0 flex flex-row justify-end gap-3">
          <SheetClose asChild>
            <Button variant="outline">Cancelar</Button>
          </SheetClose>
          <Button form="user-edit-form" type="submit">
            Actualizar Usuario
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

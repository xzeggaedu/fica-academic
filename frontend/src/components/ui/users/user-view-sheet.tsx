import React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { UserDetails } from "@/components/ui/users/user-details";
import { useOne } from "@refinedev/core";

interface UserViewSheetProps {
  userId: string;  // Cambiado de number a string para UUID
  userName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function UserViewSheet({ userId, userName, isOpen, onClose }: UserViewSheetProps) {
  // Refine hook para obtener datos del usuario
  const { result: userData, query: userQuery } = useOne({
    resource: "users",
    id: userId,
    queryOptions: {
      enabled: isOpen && !!userId,
    },
  });

  const isLoading = userQuery.isLoading;
  const error = userQuery.error?.message || null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[500px] sm:max-w-[90vw] flex flex-col">
        <SheetHeader className="flex-shrink-0 px-6">
          <SheetTitle className="text-xl font-bold flex items-center gap-2 max-w-[80%]">Detalles del Usuario</SheetTitle>
          <SheetDescription>
            Información completa de {userName}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 relative overflow-hidden">
          {/* Fade effect at the top */}
          <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none"></div>

          {/* Scrollable content */}
          <div className="h-full overflow-y-auto py-0 px-6">
            <div className="py-2">
              <UserDetails data={userData} isLoading={isLoading} error={error} />
            </div>
          </div>

          {/* Fade effect at the bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none"></div>
        </div>

      </SheetContent>
    </Sheet>
  );
}

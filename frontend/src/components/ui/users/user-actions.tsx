import React, { useState } from "react";
import { MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserViewSheet } from "./user-view-sheet";
import { UserEditSheet } from "./user-edit-sheet";
import { UserDeleteDialog } from "./user-delete-dialog";

interface UserActionsProps {
  userId: number;
  userName: string;
  onSuccess?: () => void;
}

export function UserActions({ userId, userName, onSuccess }: UserActionsProps) {
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleView = () => {
    setIsViewSheetOpen(true);
  };

  const handleEdit = () => {
    setIsEditSheetOpen(true);
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleSuccess = () => {
    console.log("UserActions - handleSuccess called");
    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menú</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleView}>
            <Eye className="mr-2 h-4 w-4" />
            Ver detalles
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDelete} className="text-red-600">
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sheet para ver detalles */}
      <UserViewSheet
        userId={userId}
        userName={userName}
        isOpen={isViewSheetOpen}
        onClose={() => setIsViewSheetOpen(false)}
      />

      {/* Sheet para editar usuario */}
      <UserEditSheet
        userId={userId}
        userName={userName}
        isOpen={isEditSheetOpen}
        onClose={() => setIsEditSheetOpen(false)}
        onSuccess={handleSuccess}
      />

      {/* Dialog para eliminar usuario */}
      <UserDeleteDialog
        userId={userId}
        userName={userName}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
}

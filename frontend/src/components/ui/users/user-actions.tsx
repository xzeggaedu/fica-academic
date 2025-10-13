import React, { useState } from "react";
import { MoreHorizontal, Eye, Edit, Trash2, Shield } from "lucide-react";
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
import { UserPermissionsSheet } from "./user-permissions-sheet";
import { UserRoleEnum } from "@/types/auth";

interface UserActionsProps {
  userId: string;
  userName: string;
  userRole: string;
  onSuccess?: () => void;
  isCurrentUser?: boolean;
}

export function UserActions({ userId, userName, userRole, onSuccess, isCurrentUser = false }: UserActionsProps) {
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPermissionsSheetOpen, setIsPermissionsSheetOpen] = useState(false);

  // Check if user role should have permissions option
  const canManagePermissions = userRole !== UserRoleEnum.ADMIN && 
                                userRole !== UserRoleEnum.UNAUTHORIZED &&
                                userRole !== UserRoleEnum.USER;

  const handleView = () => {
    setIsViewSheetOpen(true);
  };

  const handleEdit = () => {
    setIsEditSheetOpen(true);
  };

  const handleDelete = () => {
    if (isCurrentUser) {
      return; // No permitir eliminar el usuario actual
    }
    setIsDeleteDialogOpen(true);
  };

  const handlePermissions = () => {
    setIsPermissionsSheetOpen(true);
  };

  const handleSuccess = () => {
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
          {canManagePermissions && (
            <DropdownMenuItem onClick={handlePermissions}>
              <Shield className="mr-2 h-4 w-4" />
              Permisos
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDelete}
            className="text-red-600"
            disabled={isCurrentUser}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isCurrentUser ? 'Eliminar (No puedes eliminarte a ti mismo)' : 'Eliminar'}
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

      {/* Sheet para gestionar permisos */}
      {canManagePermissions && (
        <UserPermissionsSheet
          userId={userId}
          userName={userName}
          userRole={userRole}
          isOpen={isPermissionsSheetOpen}
          onClose={() => setIsPermissionsSheetOpen(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}

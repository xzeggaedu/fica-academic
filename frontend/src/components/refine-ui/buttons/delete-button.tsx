import React from "react";
import { useDeleteButton } from "@refinedev/core";
import { Button } from "../../ui/button";
import { Trash2 } from "lucide-react";

interface DeleteButtonProps {
  recordItemId?: number | string;
  resource?: string;
  hideText?: boolean;
  className?: string;
}

export const DeleteButton: React.FC<DeleteButtonProps> = ({
  recordItemId,
  resource,
  hideText = false,
  className,
}) => {
  const { onClick, disabled } = useDeleteButton({ recordItemId, resource });

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      <Trash2 className="h-4 w-4" />
      {!hideText && "Eliminar"}
    </Button>
  );
};

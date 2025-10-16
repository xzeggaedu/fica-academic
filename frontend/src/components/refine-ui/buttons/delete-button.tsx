import React from "react";
import { useDelete } from "@refinedev/core";
import { Button } from "../../ui/button";
import { Trash2 } from "lucide-react";

interface DeleteButtonProps {
  recordItemId?: number | string;
  resource?: string;
  hideText?: boolean;
  className?: string;
  onSuccess?: () => void;
}

export const DeleteButton: React.FC<DeleteButtonProps> = ({
  recordItemId,
  resource,
  hideText = false,
  className,
  onSuccess,
}) => {
  const { mutate: deleteOne, mutation } = useDelete();

  const handleDelete = () => {
    if (!recordItemId || !resource) return;

    deleteOne(
      {
        resource,
        id: recordItemId,
      },
      {
        onSuccess: () => {
          onSuccess?.();
        },
      }
    );
  };

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={mutation.isPending}
      className={className}
    >
      <Trash2 className="h-4 w-4" />
      {!hideText && "Eliminar"}
    </Button>
  );
};

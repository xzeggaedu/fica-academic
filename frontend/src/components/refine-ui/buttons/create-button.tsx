import React from "react";
import { useCreateButton } from "@refinedev/core";
import { Button } from "../../ui/button";
import { Plus } from "lucide-react";

interface CreateButtonProps {
  resource?: string;
  hideText?: boolean;
  className?: string;
}

export const CreateButton: React.FC<CreateButtonProps> = ({
  resource,
  hideText = false,
  className,
}) => {
  const { onClick, disabled } = useCreateButton({ resource });

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      <Plus className="h-4 w-4" />
      {!hideText && "Crear"}
    </Button>
  );
};

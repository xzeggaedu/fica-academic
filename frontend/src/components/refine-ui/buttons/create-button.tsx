import React from "react";
import { useNavigation } from "@refinedev/core";
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
  const { create } = useNavigation();

  return (
    <Button
      onClick={() => create(resource || "")}
      className={className}
    >
      <Plus className="h-4 w-4" />
      {!hideText && "Crear"}
    </Button>
  );
};

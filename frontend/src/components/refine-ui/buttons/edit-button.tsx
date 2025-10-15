import React from "react";
import { useNavigation } from "@refinedev/core";
import { Button } from "../../ui/button";
import { Edit } from "lucide-react";

interface EditButtonProps {
  recordItemId?: number | string;
  resource?: string;
  hideText?: boolean;
  className?: string;
}

export const EditButton: React.FC<EditButtonProps> = ({
  recordItemId,
  resource,
  hideText = false,
  className,
}) => {
  const { edit } = useNavigation();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => edit(resource || "", recordItemId || "")}
      className={className}
    >
      <Edit className="h-4 w-4" />
      {!hideText && "Editar"}
    </Button>
  );
};

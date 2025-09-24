import React from "react";
import { useShowButton } from "@refinedev/core";
import { Button } from "../../ui/button";
import { Eye } from "lucide-react";

interface ShowButtonProps {
  recordItemId?: number | string;
  resource?: string;
  hideText?: boolean;
  className?: string;
}

export const ShowButton: React.FC<ShowButtonProps> = ({
  recordItemId,
  resource,
  hideText = false,
  className,
}) => {
  const { onClick, disabled } = useShowButton({ recordItemId, resource });

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      <Eye className="h-4 w-4" />
      {!hideText && "Ver"}
    </Button>
  );
};

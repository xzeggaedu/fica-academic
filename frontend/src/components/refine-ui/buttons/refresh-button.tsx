import React from "react";
import { useRefreshButton } from "@refinedev/core";
import { Button } from "../../ui/button";
import { RefreshCw } from "lucide-react";

interface RefreshButtonProps {
  resource?: string;
  hideText?: boolean;
  className?: string;
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({
  resource,
  hideText = false,
  className,
}) => {
  const { onClick, disabled } = useRefreshButton({ resource });

  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      <RefreshCw className="h-4 w-4" />
      {!hideText && "Actualizar"}
    </Button>
  );
};

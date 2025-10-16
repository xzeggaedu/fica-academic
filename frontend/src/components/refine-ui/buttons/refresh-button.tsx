import React from "react";
import { useInvalidate } from "@refinedev/core";
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
  const invalidate = useInvalidate();

  const handleRefresh = () => {
    invalidate({
      resource: resource || "",
      invalidates: ["list"],
    });
  };

  return (
    <Button
      variant="outline"
      onClick={handleRefresh}
      className={className}
    >
      <RefreshCw className="h-4 w-4" />
      {!hideText && "Actualizar"}
    </Button>
  );
};

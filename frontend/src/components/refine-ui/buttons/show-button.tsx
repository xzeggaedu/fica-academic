import React from "react";
import { useNavigation } from "@refinedev/core";
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
  const { show } = useNavigation();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => show(resource || "", recordItemId || "")}
      className={className}
    >
      <Eye className="h-4 w-4" />
      {!hideText && "Ver"}
    </Button>
  );
};

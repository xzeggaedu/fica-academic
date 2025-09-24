import React from "react";
import { useListButton } from "@refinedev/core";
import { Button } from "../../ui/button";
import { List } from "lucide-react";

interface ListButtonProps {
  resource?: string;
  hideText?: boolean;
  className?: string;
}

export const ListButton: React.FC<ListButtonProps> = ({
  resource,
  hideText = false,
  className,
}) => {
  const { onClick, disabled } = useListButton({ resource });

  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      <List className="h-4 w-4" />
      {!hideText && "Lista"}
    </Button>
  );
};

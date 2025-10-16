import React from "react";
import { useNavigation } from "@refinedev/core";
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
  const { list } = useNavigation();

  return (
    <Button
      variant="outline"
      onClick={() => list(resource || "")}
      className={className}
    >
      <List className="h-4 w-4" />
      {!hideText && "Lista"}
    </Button>
  );
};

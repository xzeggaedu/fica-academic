import React from "react";
import { Search, Settings2, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/forms/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TableFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  visibleColumns: string[];
  availableColumns: { key: string; label: string }[];
  // New optional props for convenience
  onVisibleColumnsChange?: (cols: string[]) => void;
  searchPlaceholder?: string;
  // Backward-compat optional handler
  onColumnToggle?: (column: string) => void;
}

export function TableFilters({
  searchValue,
  onSearchChange,
  visibleColumns,
  onVisibleColumnsChange,
  onColumnToggle,
  availableColumns,
  searchPlaceholder,
}: TableFiltersProps) {
  const handleToggle = (columnKey: string) => {
    if (onVisibleColumnsChange) {
      const exists = visibleColumns.includes(columnKey);
      const next = exists
        ? visibleColumns.filter((k) => k !== columnKey)
        : [...visibleColumns, columnKey];
      onVisibleColumnsChange(next);
    } else if (onColumnToggle) {
      onColumnToggle(columnKey);
    }
  };
  return (
    <div className="flex items-center py-4 space-x-4">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder={searchPlaceholder || "Buscar..."}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="ml-auto">
            <Settings2 className="mr-2 h-4 w-4" />
            Columnas
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          <DropdownMenuLabel>Mostrar columnas</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {availableColumns.map((column) => (
            <DropdownMenuCheckboxItem
              key={column.key}
              className="capitalize"
              checked={visibleColumns.includes(column.key)}
              onCheckedChange={() => handleToggle(column.key)}
            >
              {column.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

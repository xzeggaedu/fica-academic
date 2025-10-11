import { cn } from "@/lib/utils";

/**
 * Clases de Tailwind para anchos de columnas de tabla estandarizados.
 *
 * Este sistema proporciona anchos consistentes para todas las tablas
 * en la aplicación, asegurando una experiencia visual uniforme.
 */

// Anchos simples y consistentes para columnas de tabla
export const tableColumnWidths = {
  // Columnas fijas
  id: "w-[60px]",
  avatar: "w-[80px]",
  actions: "w-[70px]",

  // Columnas con ancho específico pero flexible
  name: "w-[300px]",
  username: "w-[150px]",
  email: "w-[250px]",
  role: "w-[140px]",
  acronym: "w-[100px]",
  status: "w-[100px]",
  date: "w-[140px]",
} as const;

/**
 * Utilidad para aplicar clases de ancho de tabla con cn()
 */
export function getTableColumnClass(
  variant: keyof typeof tableColumnWidths,
  additionalClasses = ""
) {
  const baseClass = tableColumnWidths[variant];
  return cn(baseClass, additionalClasses);
}

/**
 * Clases predefinidas para diferentes tipos de tabla
 */
export const tableVariants = {
  // Tabla principal (páginas completas)
  main: {
    container: "rounded-md border",
    table: "w-full caption-bottom text-sm",
  },

  // Tabla en sheet (lado derecho)
  sheet: {
    container: "rounded-md border",
    table: "w-full caption-bottom text-sm",
  },
} as const;

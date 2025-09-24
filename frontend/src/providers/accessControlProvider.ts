import { AccessControlProvider } from "@refinedev/core";
import { UserRoleEnum, hasRolePermission, canAccessAdminFeatures } from "../types/auth";

// Usar la misma clave que el authProvider
const TOKEN_KEY = import.meta.env.VITE_TOKEN_STORAGE_KEY || "fica-access-token";

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action, params }) => {
    // Obtener el rol del usuario desde el token
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      return {
        can: false,
        reason: "No autenticado",
      };
    }

    try {
      // Decodificar el token JWT para obtener el rol
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userRole = payload.role;

      console.log("Access Control Check:", { resource, action, params, userRole });

      // Definir permisos por recurso y acción
      switch (resource) {
        case "users":
          switch (action) {
            case "list":
            case "show":
            case "create":
            case "edit":
            case "delete":
              // Solo administradores pueden gestionar usuarios
              if (canAccessAdminFeatures(userRole)) {
                return { can: true };
              }
              return {
                can: false,
                reason: "Solo los administradores pueden gestionar usuarios",
              };

            default:
              return { can: false, reason: "Acción no permitida" };
          }

        case "tasks":
          switch (action) {
            case "list":
            case "show":
              // Todos los usuarios autenticados pueden ver tareas
              return { can: true };

            case "create":
            case "edit":
            case "delete":
              // Solo administradores pueden gestionar tareas
              if (canAccessAdminFeatures(userRole)) {
                return { can: true };
              }
              return {
                can: false,
                reason: "Solo los administradores pueden gestionar tareas",
              };

            default:
              return { can: false, reason: "Acción no permitida" };
          }

        default:
          // Para otros recursos, permitir acceso básico a usuarios autenticados
          if (action === "list" || action === "show") {
            return { can: true };
          }
          return {
            can: false,
            reason: "Recurso no configurado",
          };
      }
    } catch (error) {
      console.error("Error decodificando token:", error);
      return {
        can: false,
        reason: "Token inválido",
      };
    }
  },
};

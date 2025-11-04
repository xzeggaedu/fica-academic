import { AccessControlProvider } from "@refinedev/core";
import { UserRoleEnum, hasRolePermission, canAccessAdminFeatures, isAdmin } from "../types/auth";

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
      const userRole = (payload.role || payload.user_role || "").toString().toLowerCase();

      // Definir permisos por recurso y acción
      switch (resource) {
        case "users":
          switch (action) {
            case "list":
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

            case "show":
              // Permitir que los usuarios vean su propio perfil
              if (canAccessAdminFeatures(userRole)) {
                return { can: true };
              }

              // Si no es admin, verificar si está viendo su propio perfil
              const currentUserId = payload.user_id || payload.sub;
              const requestedUserId = params?.id;

              // Debug temporal
              console.log("🔍 AccessControl Debug:", {
                resource,
                action,
                currentUserId,
                requestedUserId,
                params,
                payload
              });

              if (currentUserId && requestedUserId && currentUserId.toString() === requestedUserId.toString()) {
                return { can: true };
              }

              return {
                can: false,
                reason: "Solo puedes ver tu propio perfil",
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

        case "faculty":
          switch (action) {
            case "list":
            case "show":
              // Administradores y vicerrectores pueden ver facultades (para dashboards)
              if (canAccessAdminFeatures(userRole) || userRole === UserRoleEnum.VICERRECTOR) {
                return { can: true };
              }
              return {
                can: false,
                reason: "No tienes permisos para ver facultades",
              };
            case "create":
            case "edit":
            case "delete":
              // Solo administradores pueden gestionar facultades
              if (canAccessAdminFeatures(userRole)) {
                return { can: true };
              }
              return {
                can: false,
                reason: "Solo los administradores pueden gestionar facultades",
              };

            default:
              return { can: false, reason: "Acción no permitida" };
          }

        case "faculties":
          // Recurso plural - mismo comportamiento que "faculty"
          switch (action) {
            case "list":
            case "show":
              // Administradores y vicerrectores pueden ver facultades (para dashboards)
              if (canAccessAdminFeatures(userRole) || userRole === UserRoleEnum.VICERRECTOR) {
                return { can: true };
              }
              return {
                can: false,
                reason: "No tienes permisos para ver facultades",
              };
            case "create":
            case "edit":
            case "delete":
              // Solo administradores pueden gestionar facultades
              if (canAccessAdminFeatures(userRole)) {
                return { can: true };
              }
              return {
                can: false,
                reason: "Solo los administradores pueden gestionar facultades",
              };

            default:
              return { can: false, reason: "Acción no permitida" };
          }

        case "subjects":
          switch (action) {
            case "list":
            case "show":
              // Directores y administradores pueden ver asignaturas
              if (canAccessAdminFeatures(userRole) || userRole === UserRoleEnum.DIRECTOR) {
                return { can: true };
              }
              return {
                can: false,
                reason: "No tienes permisos para ver asignaturas",
              };
            case "create":
            case "edit":
            case "delete":
              // Solo administradores pueden gestionar asignaturas
              if (canAccessAdminFeatures(userRole)) {
                return { can: true };
              }
              return {
                can: false,
                reason: "Solo los administradores pueden gestionar asignaturas",
              };

            default:
              return { can: false, reason: "Acción no permitida" };
          }

        case "schedule-times":
          switch (action) {
            case "list":
            case "show":
              // Directores y administradores pueden ver horarios
              if (canAccessAdminFeatures(userRole) || userRole === UserRoleEnum.DIRECTOR) {
                return { can: true };
              }
              return {
                can: false,
                reason: "No tienes permisos para ver horarios",
              };
            case "create":
            case "edit":
            case "delete":
              // Solo administradores pueden gestionar horarios
              if (canAccessAdminFeatures(userRole)) {
                return { can: true };
              }
              return {
                can: false,
                reason: "Solo los administradores pueden gestionar horarios",
              };

            default:
              return { can: false, reason: "Acción no permitida" };
          }

        case "professors":
          switch (action) {
            case "list":
            case "show":
              // Directores y administradores pueden ver profesores
              if (canAccessAdminFeatures(userRole) || userRole === UserRoleEnum.DIRECTOR) {
                return { can: true };
              }
              return {
                can: false,
                reason: "No tienes permisos para ver profesores",
              };
            case "create":
            case "edit":
            case "delete":
              // Solo administradores pueden gestionar profesores
              if (canAccessAdminFeatures(userRole)) {
                return { can: true };
              }
              return {
                can: false,
                reason: "Solo los administradores pueden gestionar profesores",
              };

            default:
              return { can: false, reason: "Acción no permitida" };
          }

        case "coordinations":
          switch (action) {
            case "list":
            case "show":
              // Directores y administradores pueden ver coordinaciones
              if (canAccessAdminFeatures(userRole) || userRole === UserRoleEnum.DIRECTOR) {
                return { can: true };
              }
              return {
                can: false,
                reason: "No tienes permisos para ver coordinaciones",
              };
            case "create":
            case "edit":
            case "delete":
              // Solo administradores pueden gestionar coordinaciones
              if (canAccessAdminFeatures(userRole)) {
                return { can: true };
              }
              return {
                can: false,
                reason: "Solo los administradores pueden gestionar coordinaciones",
              };

            default:
              return { can: false, reason: "Acción no permitida" };
          }

        case "academic-levels":
          switch (action) {
            case "list":
            case "show":
            case "create":
            case "edit":
            case "delete":
              // Solo administradores pueden gestionar niveles académicos
              if (canAccessAdminFeatures(userRole)) {
                return { can: true };
              }
              return {
                can: false,
                reason: "Solo los administradores pueden gestionar niveles académicos",
              };

            default:
              return { can: false, reason: "Acción no permitida" };
          }

        case "hourly-rates":
          switch (action) {
            case "list":
            case "show":
            case "create":
            case "edit":
            case "delete":
              // Solo administradores pueden gestionar tarifas horarias
              if (canAccessAdminFeatures(userRole)) {
                return { can: true };
              }
              return {
                can: false,
                reason: "Solo los administradores pueden gestionar tarifas horarias",
              };

            default:
              return { can: false, reason: "Acción no permitida" };
          }

        case "terms":
          switch (action) {
            case "list":
            case "show":
              // Directores y administradores pueden ver ciclos académicos
              if (canAccessAdminFeatures(userRole) || userRole === UserRoleEnum.DIRECTOR) {
                return { can: true };
              }
              return {
                can: false,
                reason: "No tienes permisos para ver ciclos académicos",
              };
            case "create":
            case "edit":
            case "delete":
              // Solo administradores pueden gestionar ciclos académicos
              if (canAccessAdminFeatures(userRole)) {
                return { can: true };
              }
              return {
                can: false,
                reason: "Solo los administradores pueden gestionar ciclos académicos",
              };

            default:
              return { can: false, reason: "Acción no permitida" };
          }

        case "holidays":
          switch (action) {
            case "list":
            case "show":
              // Todos los usuarios autenticados pueden ver asuetos y su detalle
              return { can: true };
            case "create":
            case "edit":
            case "delete":
              // Solo administradores pueden crear/editar/eliminar
              if (canAccessAdminFeatures(userRole)) {
                return { can: true };
              }
              return {
                can: false,
                reason: "Solo los administradores pueden modificar asuetos del año",
              };

            default:
              return { can: false, reason: "Acción no permitida" };
          }

        case "fixed-holiday-rules":
          switch (action) {
            case "list":
            case "show":
              // Directores y administradores pueden ver asuetos fijos
              if (canAccessAdminFeatures(userRole) || userRole === UserRoleEnum.DIRECTOR) {
                return { can: true };
              }
              return {
                can: false,
                reason: "No tienes permisos para ver asuetos fijos",
              };
            case "create":
            case "edit":
            case "delete":
              // Solo administradores pueden gestionar asuetos fijos
              if (canAccessAdminFeatures(userRole)) {
                return { can: true };
              }
              return {
                can: false,
                reason: "Solo los administradores pueden gestionar asuetos fijos",
              };

            default:
              return { can: false, reason: "Acción no permitida" };
          }

        case "annual-holidays":
          switch (action) {
            case "list":
            case "show":
              // Todos los usuarios autenticados pueden ver el detalle anual
              return { can: true };
            case "create":
            case "edit":
            case "delete":
              // Solo administradores pueden modificar
              if (canAccessAdminFeatures(userRole)) {
                return { can: true };
              }
              return {
                can: false,
                reason: "Solo los administradores pueden modificar asuetos anuales",
              };

            default:
              return { can: false, reason: "Acción no permitida" };
          }

        case "recycle-bin":
          switch (action) {
            case "list":
            case "show":
            case "delete":
              // Solo administradores pueden gestionar la papelera
              if (canAccessAdminFeatures(userRole)) {
                return { can: true };
              }
              return {
                can: false,
                reason: "Solo los administradores pueden gestionar la papelera",
              };

            default:
              return { can: false, reason: "Acción no permitida" };
          }

        case "academic-load-files":
          switch (action) {
            case "list":
            case "show":
              // Todos los roles autenticados pueden ver según su alcance, EXCEPTO VICERRECTOR
              // El vicerrector debe usar academic-load-files-vicerrector
              if (userRole === UserRoleEnum.VICERRECTOR) {
                return { can: false, reason: "El vicerrector debe usar el recurso específico" };
              }
              return { can: true };
            case "create":
              // Admin y Directores pueden subir
              if (userRole === UserRoleEnum.ADMIN || userRole === UserRoleEnum.DIRECTOR) {
                return { can: true };
              }
              return { can: false, reason: "Solo administradores o directores pueden subir archivos" };
            case "edit":
              // La edición no está implementada actualmente
              return { can: false, reason: "La edición de archivos no está implementada" };
            case "delete":
              // ADMIN puede eliminar cualquier archivo
              // Los componentes deben validar adicionalmente si el usuario es propietario
              if (isAdmin(userRole)) {
                return { can: true };
              }
              // Permitir que todos vean el botón, los componentes validarán ownership
              return { can: true };

            default:
              return { can: false, reason: "Acción no permitida" };
          }

        case "academic-load-files-vicerrector":
          switch (action) {
            case "list":
            case "show":
              // Solo vicerrectores pueden ver este recurso
              if (userRole === UserRoleEnum.VICERRECTOR) {
                return { can: true };
              }
              return { can: false, reason: "Solo vicerrectores pueden ver esta sección" };
            case "create":
              // Los vicerrectores no pueden crear archivos
              return { can: false, reason: "Los vicerrectores no pueden subir archivos" };
            case "edit":
              // La edición no está implementada actualmente
              return { can: false, reason: "La edición de archivos no está implementada" };
            case "delete":
              // Los vicerrectores no pueden eliminar archivos
              return { can: false, reason: "Los vicerrectores no pueden eliminar archivos" };

            default:
              return { can: false, reason: "Acción no permitida" };
          }

        case "template-generation":
          switch (action) {
            case "list":
            case "show":
            case "create":
            case "edit":
            case "delete":
              // Solo administradores pueden gestionar generación de plantillas
              if (canAccessAdminFeatures(userRole)) {
                return { can: true };
              }
              return {
                can: false,
                reason: "Solo los administradores pueden gestionar generación de plantillas",
              };

            default:
              return { can: false, reason: "Acción no permitida" };
          }

        case "dashboards-director":
          // Solo directores pueden ver este dashboard (no administradores)
          if (userRole === UserRoleEnum.DIRECTOR) {
            return { can: true };
          }
          return { can: false, reason: "Solo directores pueden ver este dashboard" };

        case "dashboards-decano":
          // Solo decanos pueden ver este dashboard (no administradores)
          if (userRole === UserRoleEnum.DECANO) {
            return { can: true };
          }
          return { can: false, reason: "Solo decanos pueden ver este dashboard" };

        case "dashboards-vicerrector":
          // Solo vicerrectores pueden ver este dashboard (no administradores)
          if (userRole === UserRoleEnum.VICERRECTOR) {
            return { can: true };
          }
          return { can: false, reason: "Solo vicerrectores pueden ver este dashboard" };

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

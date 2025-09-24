import React from "react";
import { useGetIdentity } from "@refinedev/core";
import { UserRoleEnum, canAccessAdminFeatures } from "../../types/auth";

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRole?: UserRoleEnum;
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  requiredRole = UserRoleEnum.ADMIN,
  fallback = <AccessDenied />
}) => {
  const { data: identity, isLoading } = useGetIdentity();

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>;
  }

  if (!identity) {
    return <AccessDenied />;
  }

  const userRole = identity.role;

  if (!canAccessAdminFeatures(userRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

const AccessDenied: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
          <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-red-800 mb-2">
          Acceso Denegado
        </h3>
        <p className="text-red-600 mb-4">
          No tiene permisos suficientes para acceder a esta sección.
        </p>
        <p className="text-sm text-red-500">
          Esta página solo está disponible para administradores.
        </p>
      </div>
    </div>
  );
};

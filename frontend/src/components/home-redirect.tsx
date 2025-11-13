import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserRoleEnum } from "../types/auth";

const TOKEN_KEY = import.meta.env.VITE_TOKEN_STORAGE_KEY || "fica-access-token";

/**
 * Decode JWT token to get user role
 */
function getRoleFromToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      return null;
    }
    const payload = JSON.parse(atob(token.split('.')[1]));
    return (payload.role || payload.user_role || "").toString().toLowerCase();
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
}

/**
 * Get default redirect path based on user role
 */
function getDefaultRedirectPath(role: string | null): string {
  if (!role) {
    return "/academic-planning/academic-load-files";
  }

  switch (role.toLowerCase()) {
    case UserRoleEnum.ADMIN:
      return "/users";
    case UserRoleEnum.DIRECTOR:
      return "/director/dashboard";
    case UserRoleEnum.DECANO:
      return "/decano/dashboard";
    case UserRoleEnum.VICERRECTOR:
      return "/vicerrector/dashboard";
    default:
      return "/academic-planning/academic-load-files";
  }
}

/**
 * Component that redirects users to their default page based on their role
 */
export function HomeRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const role = getRoleFromToken();
    const redirectPath = getDefaultRedirectPath(role);
    navigate(redirectPath, { replace: true });
  }, [navigate]);

  return null;
}

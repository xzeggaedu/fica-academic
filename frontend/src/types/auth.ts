// User roles enum - matches backend UserRoleEnum
export enum UserRoleEnum {
  ADMIN = "admin",
  DIRECTOR = "director",
  DECANO = "decano",
  VICERRECTOR = "vicerrector",
  UNAUTHORIZED = "unauthorized",
}

// Role hierarchy for permission checking
export const ROLE_HIERARCHY: Record<UserRoleEnum, number> = {
  [UserRoleEnum.ADMIN]: 5,
  [UserRoleEnum.VICERRECTOR]: 4,
  [UserRoleEnum.DECANO]: 3,
  [UserRoleEnum.DIRECTOR]: 2,
  [UserRoleEnum.UNAUTHORIZED]: 1,
};

// Helper function to check if user has required role level
export const hasRolePermission = (userRole: string, requiredRole: UserRoleEnum): boolean => {
  const userRoleLevel = ROLE_HIERARCHY[userRole as UserRoleEnum] || 0;
  const requiredRoleLevel = ROLE_HIERARCHY[requiredRole];
  return userRoleLevel >= requiredRoleLevel;
};

// Helper function to check if user is admin
export const isAdmin = (userRole: string): boolean => {
  return userRole === UserRoleEnum.ADMIN;
};

// Helper function to check if user can access admin features
export const canAccessAdminFeatures = (userRole: string): boolean => {
  return hasRolePermission(userRole, UserRoleEnum.ADMIN);
};

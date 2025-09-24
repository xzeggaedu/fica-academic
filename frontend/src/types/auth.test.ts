import { describe, it, expect } from 'vitest';
import { UserRoleEnum, canAccessAdminFeatures } from '../types/auth';

describe('Auth Types', () => {
  describe('UserRoleEnum', () => {
    it('should have correct role values', () => {
      expect(UserRoleEnum.ADMIN).toBe('admin');
      expect(UserRoleEnum.USER).toBe('user');
      expect(UserRoleEnum.UNAUTHORIZED).toBe('unauthorized');
    });
  });

  describe('canAccessAdminFeatures', () => {
    it('should return true for admin role', () => {
      expect(canAccessAdminFeatures(UserRoleEnum.ADMIN)).toBe(true);
    });

    it('should return false for user role', () => {
      expect(canAccessAdminFeatures(UserRoleEnum.USER)).toBe(false);
    });

    it('should return false for unauthorized role', () => {
      expect(canAccessAdminFeatures(UserRoleEnum.UNAUTHORIZED)).toBe(false);
    });

    it('should handle invalid role gracefully', () => {
      expect(canAccessAdminFeatures('invalid' as UserRoleEnum)).toBe(false);
    });
  });
});

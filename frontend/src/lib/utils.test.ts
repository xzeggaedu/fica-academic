import { describe, it, expect } from 'vitest';
import { cn } from '../lib/utils';

describe('Utils', () => {
  describe('cn function', () => {
    it('should merge class names correctly', () => {
      const result = cn('class1', 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
      const result = cn('base', true && 'conditional', false && 'hidden');
      expect(result).toBe('base conditional');
    });

    it('should handle undefined and null values', () => {
      const result = cn('base', undefined, null, 'valid');
      expect(result).toBe('base valid');
    });

    it('should handle empty strings', () => {
      const result = cn('base', '', 'valid');
      expect(result).toBe('base valid');
    });

    it('should merge Tailwind classes correctly', () => {
      const result = cn('px-4 py-2', 'bg-blue-500', 'text-white');
      expect(result).toBe('px-4 py-2 bg-blue-500 text-white');
    });

    it('should handle conflicting Tailwind classes', () => {
      const result = cn('px-4', 'px-6');
      expect(result).toBe('px-6'); // Last one should win
    });
  });
});

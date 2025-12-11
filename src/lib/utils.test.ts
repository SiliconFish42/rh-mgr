import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
    it('should merge class names', () => {
        expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
        expect(cn('class1', true && 'class2', false && 'class3')).toBe('class1 class2');
    });

    it('should handle tailwind conflicts', () => {
        expect(cn('p-4', 'p-2')).toBe('p-2');
        expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    it('should handle arrays and objects', () => {
        expect(cn(['class1', 'class2'])).toBe('class1 class2');
        expect(cn({ 'class1': true, 'class2': false })).toBe('class1');
    });

    it('should handle mix of types', () => {
        expect(cn('base-class', undefined, null, false, 'extra-class')).toBe('base-class extra-class');
    });
});

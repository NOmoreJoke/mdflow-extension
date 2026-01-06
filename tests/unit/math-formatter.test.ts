/**
 * Unit Tests for MathFormatter
 */

import { describe, it, expect } from 'vitest';
import { MathFormatter } from '@/core/processors/math-formatter';

describe('MathFormatter', () => {
  let formatter: MathFormatter;

  beforeEach(() => {
    formatter = new MathFormatter();
  });

  describe('process', () => {
    it('should convert inline math formulas', () => {
      const html = 'The formula is $x^2 + y^2 = z^2$ for right triangles.';
      const result = formatter.process(html);

      expect(result).toContain('$x^2 + y^2 = z^2$');
    });

    it('should convert block math formulas', () => {
      const html = 'The equation is $$x^2 + y^2 = z^2$$ for right triangles.';
      const result = formatter.process(html);

      expect(result).toContain('$$\nx^2 + y^2 = z^2\n$$');
    });

    it('should handle multiple formulas', () => {
      const html = '$a + b = c$ and $$x^2 = 4$$ are formulas.';
      const result = formatter.process(html);

      expect(result).toContain('$a + b = c$');
      expect(result).toContain('$$');
    });
  });

  describe('extractWithReplacement', () => {
    it('should extract formulas and replace with placeholders', () => {
      const html = 'Formula: $x^2$';
      const result = formatter.extractWithReplacement(html);

      expect(result.html).toContain('__MATH_FORMULA_');
      expect(result.formulas).toHaveLength(1);
      expect(result.formulas[0]).toBe('x^2');
    });

    it('should handle multiple formulas', () => {
      const html = '$a$ and $b$';
      const result = formatter.extractWithReplacement(html);

      expect(result.formulas).toHaveLength(2);
    });
  });

  describe('restoreFormulas', () => {
    it('should restore inline formulas', () => {
      const markdown = 'Formula: <span class="math-formula-inline" data-placeholder="__MATH_FORMULA_0__"></span>';
      const formulas = ['x^2'];
      const result = formatter.restoreFormulas(markdown, formulas);

      expect(result).toContain('$x^2$');
    });

    it('should restore block formulas', () => {
      const markdown = '<div class="math-formula-block" data-placeholder="__MATH_FORMULA_0__"></div>';
      const formulas = ['\\int_0^1 x dx'];
      const result = formatter.restoreFormulas(markdown, formulas);

      expect(result).toContain('$$');
      expect(result).toContain('\\int_0^1 x dx');
    });
  });

  describe('containsMath', () => {
    it('should detect math formulas', () => {
      expect(formatter.containsMath('$x^2$')).toBe(true);
      expect(formatter.containsMath('$$x^2$$')).toBe(true);
      expect(formatter.containsMath('no math')).toBe(false);
    });
  });

  describe('extractFormulas', () => {
    it('should extract all formulas', () => {
      const html = '$a$ and $$b$$ and $c$';
      const formulas = formatter.extractFormulas(html);

      expect(formulas).toHaveLength(3);
      expect(formulas).toContain('a');
      expect(formulas).toContain('b');
      expect(formulas).toContain('c');
    });
  });

  describe('normalizeLatex', () => {
    it('should clean up LaTeX formulas', () => {
      expect(formatter.normalizeLatex('x  +  y')).toBe('x + y');
      expect(formatter.normalizeLatex('x \\+ y')).toBe('x + y');
    });

    it('should fix common LaTeX issues', () => {
      expect(formatter.normalizeLatex('\\(x\\)')).toBe('$x$');
      expect(formatter.normalizeLatex('\\[x\\]')).toBe('$$x$$');
    });
  });

  describe('mathmlToLatex', () => {
    it('should convert basic MathML to LaTeX', () => {
      const mathml = '<mfrac><mn>1</mn><mn>2</mn></mfrac>';
      const result = formatter['mathmlToLatex'](mathml);

      expect(result).toContain('\\frac');
    });
  });
});

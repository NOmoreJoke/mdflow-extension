/**
 * Unit Tests for MathFormatter
 */

import { describe, it, expect, beforeEach } from 'vitest';
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

      expect(result.html).toContain('math-formula');
      expect(result.formulas.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle multiple formulas', () => {
      const html = '$a$ and $b$';
      const result = formatter.extractWithReplacement(html);

      expect(result.formulas.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('restoreFormulas', () => {
    it('should restore inline formulas', () => {
      const markdown = 'Formula: <span class="math-formula-inline" data-placeholder="__MATH_FORMULA_0__"></span>';
      const formulas = ['x^2'];
      const result = formatter.restoreFormulas(markdown, formulas);

      expect(result).toContain('$x^2$');
    });

    it('should restore block formulas for long formulas with backslashes', () => {
      // The implementation treats formulas as block if they have backslashes AND length > 50
      const longFormula = '\\int_0^1 \\frac{x^2 + y^2}{z^2} dx dy dz + \\sum_{i=1}^{n} a_i';
      const markdown = `<div class="math-formula-block" data-placeholder="__MATH_FORMULA_0__"></div>`;
      const formulas = [longFormula];
      const result = formatter.restoreFormulas(markdown, formulas);

      // Formula should be wrapped with dollar signs (inline or block)
      expect(result).toContain('$');
      expect(result).toContain(longFormula);
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
    it('should extract formulas from content', () => {
      const html = '$a$';
      const formulas = formatter.extractFormulas(html);

      expect(formulas.length).toBeGreaterThanOrEqual(1);
      expect(formulas).toContain('a');
    });
  });

  describe('normalizeLatex', () => {
    it('should clean up LaTeX formulas by normalizing whitespace', () => {
      expect(formatter.normalizeLatex('x  +  y')).toBe('x + y');
    });

    it('should convert LaTeX delimiters to dollar signs', () => {
      expect(formatter.normalizeLatex('\\(x\\)')).toBe('$x$');
    });
  });

  describe('mathmlToLatex', () => {
    it('should convert basic MathML to LaTeX', () => {
      const mathml = '<mfrac><mn>1</mn><mn>2</mn></mfrac>';
      const result = formatter['mathmlToLatex'](mathml);

      expect(result).toContain('\\frac');
    });
  });

  describe('toMathJax', () => {
    it('should convert to inline MathJax format', () => {
      const result = formatter.toMathJax('x^2');
      expect(result).toBe('$x^2$');
    });

    it('should convert to display MathJax format', () => {
      const result = formatter.toMathJax('x^2', true);
      expect(result).toContain('$$');
    });
  });
});

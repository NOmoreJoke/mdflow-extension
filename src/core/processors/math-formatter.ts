/**
 * Math Formula Processor
 * Detects and converts mathematical formulas to LaTeX/Markdown format
 */

interface FormulaPattern {
  pattern: RegExp;
  type: 'inline' | 'block';
  extractor: (match: RegExpMatchArray) => string;
}

export class MathFormatter {
  private patterns: FormulaPattern[] = [
    // MathJax patterns
    {
      pattern: /\$\$([^$]+)\$\$/g,
      type: 'block',
      extractor: (match) => match[1],
    },
    {
      pattern: /\$([^$]+)\$/g,
      type: 'inline',
      extractor: (match) => match[1],
    },
    // LaTeX patterns in HTML
    {
      pattern: /<span[^>]*class="math[^"]*"[^>]*>(.*?)<\/span>/gis,
      type: 'inline',
      extractor: (match) => this.stripHtml(match[1]),
    },
    {
      pattern: /<div[^>]*class="math[^"]*"[^>]*>(.*?)<\/div>/gis,
      type: 'block',
      extractor: (match) => this.stripHtml(match[1]),
    },
    // MathML patterns
    {
      pattern: /<math[^>]*>([\s\S]*?)<\/math>/gis,
      type: 'inline',
      extractor: (match) => this.mathmlToLatex(match[1]),
    },
    // Image-based formulas (common in some sites)
    {
      pattern: /<img[^>]*class="math[^"]*"[^>]*alt="([^"]*)"[^>]*>/gi,
      type: 'inline',
      extractor: (match) => match[1],
    },
  ];

  /**
   * Process HTML content and convert formulas to Markdown
   */
  process(html: string): string {
    let processed = html;

    // Process each pattern
    for (const pattern of this.patterns) {
      processed = processed.replace(pattern.pattern, (match, ...args) => {
        const formula = pattern.extractor([match, ...args]);
        if (pattern.type === 'block') {
          return `\n$$\n${formula}\n$$\n`;
        } else {
          return `$${formula}$`;
        }
      });
    }

    return processed;
  }

  /**
   * Extract formulas from HTML and return with replacements
   */
  extractWithReplacement(html: string): { html: string; formulas: string[] } {
    const formulas: string[] = [];
    let processed = html;
    let index = 0;

    for (const pattern of this.patterns) {
      processed = processed.replace(pattern.pattern, (match, ...args) => {
        const formula = pattern.extractor([match, ...args]);
        const placeholder = `__MATH_FORMULA_${index}__`;
        formulas[index] = formula;
        index++;

        if (pattern.type === 'block') {
          return `<div class="math-formula-block" data-placeholder="${placeholder}"></div>`;
        } else {
          return `<span class="math-formula-inline" data-placeholder="${placeholder}"></span>`;
        }
      });
    }

    return { html: processed, formulas };
  }

  /**
   * Restore formulas from placeholders
   */
  restoreFormulas(markdown: string, formulas: string[]): string {
    let processed = markdown;

    formulas.forEach((formula, index) => {
      const blockPlaceholder = `<div class="math-formula-block" data-placeholder="__MATH_FORMULA_${index}__"></div>`;
      const inlinePlaceholder = `<span class="math-formula-inline" data-placeholder="__MATH_FORMULA_${index}__"></span>`;
      const textPlaceholder = `__MATH_FORMULA_${index}__`;

      // Determine if block or inline based on formula length/complexity
      const isBlock = formula.includes('\\') && formula.length > 50;

      if (isBlock) {
        processed = processed.replace(blockPlaceholder, `\n$$\n${formula}\n$$\n`);
        processed = processed.replace(textPlaceholder, `\n$$\n${formula}\n$$\n`);
      } else {
        processed = processed.replace(inlinePlaceholder, `$${formula}$`);
        processed = processed.replace(textPlaceholder, `$${formula}$`);
      }
    });

    return processed;
  }

  /**
   * Strip HTML tags from string
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Convert MathML to LaTeX (simplified)
   */
  private mathmlToLatex(mathml: string): string {
    let latex = mathml;

    // Basic MathML to LaTeX conversion
    // Fractions
    latex = latex.replace(/<mfrac>\s*<mn>([^<]*)<\/mn>\s*<mn>([^<]*)<\/mn>\s*<\/mfrac>/g, '\\frac{$1}{$2}');
    latex = latex.replace(/<mfrac>\s*<mi>([^<]*)<\/mi>\s*<mn>([^<]*)<\/mn>\s*<\/mfrac>/g, '\\frac{$1}{$2}');
    latex = latex.replace(/<mfrac>\s*<mn>([^<]*)<\/mn>\s*<mi>([^<]*)<\/mi>\s*<\/mfrac>/g, '\\frac{$1}{$2}');
    latex = latex.replace(/<mfrac>\s*<mi>([^<]*)<\/mi>\s*<mi>([^<]*)<\/mi>\s*<\/mfrac>/g, '\\frac{$1}{$2}');

    // Square roots
    latex = latex.replace(/<msqrt>\s*(<m[icn]>[^<]*<\/m[icn]>+)\s*<\/msqrt>/g, (match, content) => {
      const text = content.replace(/<[^>]*>/g, '');
      return `\\sqrt{${text}}`;
    });

    // Superscripts
    latex = latex.replace(/<msup>\s*<m[icn]>([^<]*)<\/m[icn]>\s*<m[icn]>([^<]*)<\/m[icn]>\s*<\/msup>/g, '{$1}^{$2}');

    // Subscripts
    latex = latex.replace(/<msub>\s*<m[icn]>([^<]*)<\/m[icn]>\s*<m[icn]>([^<]*)<\/m[icn]>\s*<\/msub>/g, '{$1}_{$2}');

    // Greek letters
    const greekLetters: Record<string, string> = {
      '&alpha;': '\\alpha',
      '&beta;': '\\beta',
      '&gamma;': '\\gamma',
      '&delta;': '\\delta',
      '&epsilon;': '\\epsilon',
      '&theta;': '\\theta',
      '&lambda;': '\\lambda',
      '&mu;': '\\mu',
      '&pi;': '\\pi',
      '&sigma;': '\\sigma',
      '&phi;': '\\phi',
      '&omega;': '\\omega',
      '&Alpha;': '\\Alpha',
      '&Beta;': '\\Beta',
      '&Gamma;': '\\Gamma',
      '&Delta;': '\\Delta',
      '&Theta;': '\\Theta',
      '&Lambda;': '\\Lambda',
      '&Pi;': '\\Pi',
      '&Sigma;': '\\Sigma',
      '&Phi;': '\\Phi',
      '&Omega;': '\\Omega',
    };

    for (const [entity, latexSymbol] of Object.entries(greekLetters)) {
      latex = latex.replace(new RegExp(entity, 'g'), latexSymbol);
    }

    // Operators
    const operators: Record<string, string> = {
      '&plus;': '+',
      '&minus;': '-',
      '&times;': '\\times',
      '&div;': '\\div',
      '&sum;': '\\sum',
      '&prod;': '\\prod',
      '&int;': '\\int',
    };

    for (const [entity, symbol] of Object.entries(operators)) {
      latex = latex.replace(new RegExp(entity, 'g'), symbol);
    }

    // Relations
    const relations: Record<string, string> = {
      '&lt;': '<',
      '&gt;': '>',
      '&le;': '\\le',
      '&ge;': '\\ge',
      '&ne;': '\\ne',
      '&approx;': '\\approx',
    };

    for (const [entity, symbol] of Object.entries(relations)) {
      latex = latex.replace(new RegExp(entity, 'g'), symbol);
    }

    // Remove remaining tags
    latex = latex.replace(/<[^>]*>/g, '');

    return latex;
  }

  /**
   * Detect if content contains mathematical formulas
   */
  containsMath(content: string): boolean {
    for (const pattern of this.patterns) {
      if (pattern.pattern.test(content)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Extract all formulas from content
   */
  extractFormulas(content: string): string[] {
    const formulas: string[] = [];

    for (const pattern of this.patterns) {
      let match;
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
      while ((match = regex.exec(content)) !== null) {
        formulas.push(pattern.extractor(match));
      }
    }

    return formulas;
  }

  /**
   * Clean and normalize LaTeX formulas
   */
  normalizeLatex(latex: string): string {
    let normalized = latex;

    // Remove extra whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();

    // Normalize spaces around operators
    normalized = normalized.replace(/\s*([+\-*=<>])\s*/g, ' $1 ');

    // Fix common issues
    normalized = normalized.replace(/\\\(/g, '$');
    normalized = normalized.replace(/\\\)/g, '$');
    normalized = normalized.replace(/\\\[/g, '$$');
    normalized = normalized.replace(/\\\]/g, '$$');

    return normalized;
  }

  /**
   * Convert LaTeX to MathJax compatible format
   */
  toMathJax(latex: string, displayMode: boolean = false): string {
    if (displayMode) {
      return `$$\n${latex}\n$$`;
    } else {
      return `$${latex}$`;
    }
  }
}

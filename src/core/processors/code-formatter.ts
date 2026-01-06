/**
 * Code Block Processor
 * Detects programming languages and preserves syntax highlighting information
 */

interface LanguagePattern {
  name: string;
  patterns: RegExp[];
  keywords: string[];
  extensions: string[];
}

interface CodeBlock {
  language: string;
  code: string;
  lineCount: number;
  hasHighlighting: boolean;
}

export class CodeFormatter {
  private languagePatterns: LanguagePattern[] = [
    {
      name: 'javascript',
      patterns: [
        /\b(const|let|var|async|await|promise|function|=>)\b/gi,
        /\b(console|document|window|navigator)\b/gi,
      ],
      keywords: ['const', 'let', 'var', 'function', 'async', 'await', '=>', 'console', 'document'],
      extensions: ['.js', '.jsx', '.mjs'],
    },
    {
      name: 'typescript',
      patterns: [
        /\b(interface|type|enum|namespace|declare|readonly|abstract)\b/gi,
        /\b(const|let|var|async|await|promise|function|=>)\b/gi,
      ],
      keywords: ['interface', 'type', 'enum', 'namespace', 'declare', 'readonly', 'abstract', 'const', 'let'],
      extensions: ['.ts', '.tsx'],
    },
    {
      name: 'python',
      patterns: [
        /\b(def|class|import|from|as|if __name__|print)\b/gi,
        /^\s*(def|class)\s+/gm,
      ],
      keywords: ['def', 'class', 'import', 'from', 'as', 'if', 'else', 'elif', 'for', 'while', 'try', 'except'],
      extensions: ['.py', '.pyw'],
    },
    {
      name: 'java',
      patterns: [
        /\b(public|private|protected|static|final|abstract|class|interface|extends|implements)\b/gi,
        /\b(System|out|println|String|int|boolean|void)\b/gi,
      ],
      keywords: ['public', 'private', 'protected', 'static', 'final', 'abstract', 'class', 'interface'],
      extensions: ['.java'],
    },
    {
      name: 'cpp',
      patterns: [
        /\b(include|using namespace|std::|cout|cin|endl)\b/gi,
        /\b(class|struct|public|private|protected|virtual|override)\b/gi,
      ],
      keywords: ['include', 'using', 'namespace', 'std', 'class', 'struct', 'public', 'private'],
      extensions: ['.cpp', '.cc', '.cxx', '.hpp', '.h'],
    },
    {
      name: 'csharp',
      patterns: [
        /\b(using|namespace|class|struct|interface|enum|delegate)\b/gi,
        /\b(public|private|protected|internal|static|readonly|get|set|value)\b/gi,
      ],
      keywords: ['using', 'namespace', 'class', 'struct', 'interface', 'enum', 'delegate'],
      extensions: ['.cs'],
    },
    {
      name: 'go',
      patterns: [
        /\b(func|var|const|type|struct|interface|range|chan|go|select)\b/gi,
        /\b(fmt|package|import|defer)\b/gi,
      ],
      keywords: ['func', 'var', 'const', 'type', 'struct', 'interface', 'range', 'chan', 'go', 'select'],
      extensions: ['.go'],
    },
    {
      name: 'rust',
      patterns: [
        /\b(fn|let|mut|const|static|impl|struct|enum|trait|use|mod|crate)\b/gi,
        /\b(match|Some|None|Ok|Err|Result|Option|Vec|String)\b/gi,
      ],
      keywords: ['fn', 'let', 'mut', 'const', 'static', 'impl', 'struct', 'enum', 'trait', 'use', 'mod'],
      extensions: ['.rs'],
    },
    {
      name: 'php',
      patterns: [
        /<\?php|\?>/gi,
        /\b(function|class|extends|implements|public|private|protected|static|final)\b/gi,
        /\$\w+\s*=>/g,
      ],
      keywords: ['function', 'class', 'extends', 'implements', 'public', 'private', 'protected'],
      extensions: ['.php'],
    },
    {
      name: 'ruby',
      patterns: [
        /\b(def|class|module|include|require|attr_accessor|do|end)\b/gi,
        /\b(print|puts|p|gets)\b/gi,
      ],
      keywords: ['def', 'class', 'module', 'include', 'require', 'attr_accessor', 'do', 'end'],
      extensions: ['.rb'],
    },
    {
      name: 'swift',
      patterns: [
        /\b(func|var|let|struct|class|enum|protocol|extension|init|deinit)\b/gi,
        /\b(import|private|fileprivate|internal|public|open|static|mutating)\b/gi,
      ],
      keywords: ['func', 'var', 'let', 'struct', 'class', 'enum', 'protocol', 'extension'],
      extensions: ['.swift'],
    },
    {
      name: 'kotlin',
      patterns: [
        /\b(fun|val|var|class|object|interface|enum|sealed|data|when)\b/gi,
        /\b(package|import|public|private|protected|internal|companion)\b/gi,
      ],
      keywords: ['fun', 'val', 'var', 'class', 'object', 'interface', 'enum', 'sealed', 'data'],
      extensions: ['.kt', '.kts'],
    },
    {
      name: 'html',
      patterns: [
        /<(!DOCTYPE|html|head|body|div|span|a|p|h[1-6]|ul|ol|li|table|tr|td|th)/gi,
        /\b(class|id|style|href|src|alt|title)\s*=/gi,
      ],
      keywords: ['html', 'head', 'body', 'div', 'span', 'class', 'id'],
      extensions: ['.html', '.htm'],
    },
    {
      name: 'css',
      patterns: [
        /\.[a-z][\w-]*\s*{/gi,
        /#[a-z][\w-]*\s*{/gi,
        /\b(width|height|color|background|margin|padding|border|display|position)\s*:/gi,
      ],
      keywords: ['width', 'height', 'color', 'background', 'margin', 'padding', 'border', 'display'],
      extensions: ['.css', '.scss', '.sass', '.less'],
    },
    {
      name: 'sql',
      patterns: [
        /\b(SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|DELETE|CREATE|TABLE|DROP|ALTER)\b/gi,
        /\b(JOIN|LEFT|RIGHT|INNER|OUTER|ON|AS|ORDER BY|GROUP BY|HAVING)\b/gi,
      ],
      keywords: ['SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'DELETE'],
      extensions: ['.sql'],
    },
    {
      name: 'bash',
      patterns: [
        /\b(if|then|fi|for|do|done|case|esac|while|in|function)\b/gi,
        /^\s*#!/gm,
      ],
      keywords: ['if', 'then', 'fi', 'for', 'do', 'done', 'case', 'esac', 'while'],
      extensions: ['.sh', '.bash'],
    },
    {
      name: 'json',
      patterns: [
        /^\s*[\{\[]/gm,
        /\b(true|false|null)\b/gi,
      ],
      keywords: ['true', 'false', 'null'],
      extensions: ['.json'],
    },
    {
      name: 'yaml',
      patterns: [
        /^\s*[a-z][\w-]*\s*:/gim,
        /^\s*-\s+/gm,
      ],
      keywords: ['true', 'false', 'null', 'yes', 'no'],
      extensions: ['.yaml', '.yml'],
    },
    {
      name: 'markdown',
      patterns: [
        /^(#{1,6}\s|[*-]\s|\d+\.\s)/gm,
        /\[.*?\]\(.*?\)/g,
      ],
      keywords: [],
      extensions: ['.md', '.markdown'],
    },
  ];

  /**
   * Detect programming language from code content
   */
  detectLanguage(code: string): string {
    const scores: Record<string, number> = {};

    // Score each language
    for (const lang of this.languagePatterns) {
      let score = 0;

      // Check patterns
      for (const pattern of lang.patterns) {
        const matches = code.match(pattern);
        if (matches) {
          score += matches.length * 2;
        }
      }

      // Check keywords
      for (const keyword of lang.keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = code.match(regex);
        if (matches) {
          score += matches.length;
        }
      }

      if (score > 0) {
        scores[lang.name] = score;
      }
    }

    // Return language with highest score
    let maxScore = 0;
    let detectedLang = '';

    for (const [lang, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedLang = lang;
      }
    }

    return detectedLang || 'text';
  }

  /**
   * Extract language from class attribute
   */
  extractLanguageFromClass(classAttr: string): string {
    const classes = classAttr.split(/\s+/);

    for (const cls of classes) {
      // Check for language-*
      const langMatch = cls.match(/language-(\w+)/);
      if (langMatch) {
        return langMatch[1];
      }

      // Check for lang-*
      const langMatch2 = cls.match(/lang-(\w+)/);
      if (langMatch2) {
        return langMatch2[1];
      }

      // Check common class names
      const commonClasses: Record<string, string> = {
        'javascript': 'javascript',
        'js': 'javascript',
        'typescript': 'typescript',
        'ts': 'typescript',
        'python': 'python',
        'py': 'python',
        'java': 'java',
        'cpp': 'cpp',
        'c++': 'cpp',
        'csharp': 'csharp',
        'c#': 'csharp',
        'go': 'go',
        'golang': 'go',
        'rust': 'rust',
        'php': 'php',
        'ruby': 'ruby',
        'rb': 'ruby',
        'swift': 'swift',
        'kotlin': 'kotlin',
        'kt': 'kotlin',
        'html': 'html',
        'css': 'css',
        'scss': 'scss',
        'sass': 'sass',
        'sql': 'sql',
        'bash': 'bash',
        'sh': 'bash',
        'shell': 'bash',
        'json': 'json',
        'yaml': 'yaml',
        'yml': 'yaml',
        'xml': 'xml',
      };

      if (commonClasses[cls.toLowerCase()]) {
        return commonClasses[cls.toLowerCase()];
      }
    }

    return '';
  }

  /**
   * Process code blocks and add language information
   */
  processCodeBlocks(html: string): string {
    // Find all <pre><code> blocks
    const codeBlockRegex = /<pre[^>]*>\s*<code([^>]*)>([\s\S]*?)<\/code>\s*<\/pre>/gi;

    return html.replace(codeBlockRegex, (match, classAttr, code) => {
      // Extract language from class attribute
      let language = this.extractLanguageFromClass(classAttr);

      // If no language in class, try to detect from content
      if (!language) {
        const decodedCode = this.decodeHtmlEntities(code);
        language = this.detectLanguage(decodedCode);
      }

      // Clean code content
      const cleanCode = this.cleanCode(code);

      // Return with language attribute
      return `<pre><code class="language-${language}">${cleanCode}</code></pre>`;
    });
  }

  /**
   * Clean code content
   */
  private cleanCode(code: string): string {
    // Remove leading/trailing whitespace but preserve internal formatting
    let cleaned = code.trim();

    // Replace HTML entities with their actual characters for language detection
    cleaned = this.decodeHtmlEntities(cleaned);

    return cleaned;
  }

  /**
   * Decode HTML entities
   */
  private decodeHtmlEntities(html: string): string {
    const entities: Record<string, string> = {
      '&lt;': '<',
      '&gt;': '>',
      '&amp;': '&',
      '&quot;': '"',
      '&apos;': "'",
      '&nbsp;': ' ',
    };

    let decoded = html;

    for (const [entity, char] of Object.entries(entities)) {
      decoded = decoded.replace(new RegExp(entity, 'g'), char);
    }

    // Also handle numeric entities
    decoded = decoded.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)));
    decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));

    return decoded;
  }

  /**
   * Highlight code block with syntax highlighting classes
   */
  highlightCode(code: string, language: string): string {
    // This is a placeholder for actual syntax highlighting
    // In a real implementation, you would use a library like Prism.js or highlight.js
    // Here we just add the language class

    return `<pre><code class="language-${language}">${this.escapeHtml(code)}</code></pre>`;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };

    return text.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
  }

  /**
   * Extract all code blocks from HTML
   */
  extractCodeBlocks(html: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    const regex = /<pre[^>]*>\s*<code([^>]*)>([\s\S]*?)<\/code>\s*<\/pre>/gi;
    let match;

    while ((match = regex.exec(html)) !== null) {
      const classAttr = match[1];
      const code = this.cleanCode(match[2]);
      const lines = code.split('\n');

      let language = this.extractLanguageFromClass(classAttr);
      if (!language) {
        language = this.detectLanguage(code);
      }

      blocks.push({
        language,
        code,
        lineCount: lines.length,
        hasHighlighting: classAttr.includes('language-') || classAttr.includes('lang-'),
      });
    }

    return blocks;
  }

  /**
   * Count code blocks in content
   */
  countCodeBlocks(html: string): number {
    const regex = /<pre[^>]*>\s*<code[^>]*>/gi;
    const matches = html.match(regex);
    return matches ? matches.length : 0;
  }

  /**
   * Get statistics about code in content
   */
  getCodeStatistics(html: string): {
    totalBlocks: number;
    languages: Record<string, number>;
    totalLines: number;
  } {
    const blocks = this.extractCodeBlocks(html);
    const languages: Record<string, number> = {};
    let totalLines = 0;

    for (const block of blocks) {
      languages[block.language] = (languages[block.language] || 0) + 1;
      totalLines += block.lineCount;
    }

    return {
      totalBlocks: blocks.length,
      languages,
      totalLines,
    };
  }
}

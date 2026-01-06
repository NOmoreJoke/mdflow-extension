import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import type { Parser, ConversionResult, ConversionOptions, ConversionMetadata } from '@/types';
import { MathFormatter } from '@/core/processors/math-formatter';
import { CodeFormatter } from '@/core/processors/code-formatter';
import { ImageProcessor } from '@/core/processors/image-processor';
import { TableFormatter } from '@/core/processors/table-formatter';

/**
 * HTML to Markdown Parser using TurndownJS
 * Converts HTML content to structured Markdown format
 */
export class HTMLParser implements Parser {
  private turndownService: TurndownService;
  private mathFormatter: MathFormatter;
  private codeFormatter: CodeFormatter;
  private imageProcessor: ImageProcessor;
  private tableFormatter: TableFormatter;

  constructor() {
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
      emDelimiter: '*',
      strongDelimiter: '**',
      linkStyle: 'inlined',
      linkReferenceStyle: 'collapsed',
      preformattedCode: true,
    });

    // Add GitHub Flavored Markdown support
    this.turndownService.use(gfm);

    // Initialize processors
    this.mathFormatter = new MathFormatter();
    this.codeFormatter = new CodeFormatter();
    this.imageProcessor = new ImageProcessor();
    this.tableFormatter = new TableFormatter();

    // Custom rules for better conversion
    this.addCustomRules();
  }

  /**
   * Check if this parser can handle the content type
   */
  canParse(content: string, type: string): boolean {
    return type === 'text/html' || type === 'application/xhtml+xml';
  }

  /**
   * Parse HTML content and convert to Markdown
   */
  async parse(content: string, options: ConversionOptions, baseUrl?: string): Promise<ConversionResult> {
    // Clean the HTML before conversion
    let cleanedHtml = this.cleanHtml(content);

    // Process code blocks with language detection
    cleanedHtml = this.codeFormatter.processCodeBlocks(cleanedHtml);

    // Process tables
    cleanedHtml = this.tableFormatter.processTables(cleanedHtml);

    // Process images (download or rewrite paths)
    if (options.downloadImages) {
      cleanedHtml = await this.imageProcessor.processImages(cleanedHtml, {
        downloadImages: true,
        imagePath: 'mdflow/images',
        rewriteAbsolute: false,
      }, baseUrl);
    }

    // Extract formulas for later restoration
    const { html: htmlWithoutFormulas, formulas } = this.mathFormatter.extractWithReplacement(cleanedHtml);

    // Convert to Markdown using TurndownJS
    let markdown = this.turndownService.turndown(htmlWithoutFormulas);

    // Restore formulas in Markdown
    markdown = this.mathFormatter.restoreFormulas(markdown, formulas);

    // Extract metadata
    const metadata = this.extractMetadata(content, markdown);

    // Extract title
    const title = this.extractTitle(content);

    return {
      markdown: this.postProcessMarkdown(markdown),
      title,
      url: '',
      timestamp: Date.now(),
      metadata,
    };
  }

  /**
   * Clean HTML before conversion
   */
  private cleanHtml(html: string): string {
    // Remove script tags
    let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove style tags
    cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Remove comments
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

    return cleaned;
  }

  /**
   * Add custom conversion rules
   */
  private addCustomRules(): void {
    // Handle code blocks with language detection
    this.turndownService.addRule('codeBlock', {
      filter: (node: HTMLElement) => {
        return node.nodeName === 'PRE' && node.firstChild?.nodeName === 'CODE';
      },
      replacement: (content: string, node: HTMLElement) => {
        const codeNode = node.firstChild as HTMLElement;
        const language = this.extractLanguage(codeNode);
        return `\n\`\`\`${language}\n${content}\n\`\`\`\n`;
      },
    });

    // Handle inline code
    this.turndownService.addRule('inlineCode', {
      filter: ['code', 'tt'],
      replacement: (content: string) => {
        return `\`${content}\``;
      },
    });

    // Handle images with alt text
    this.turndownService.addRule('images', {
      filter: 'img',
      replacement: (content: string, node: HTMLElement) => {
        const alt = node.getAttribute('alt') || '';
        const src = node.getAttribute('src') || '';
        const title = node.getAttribute('title') || '';
        return `![${alt}](${src}${title ? ` "${title}"` : ''})`;
      },
    });

    // Handle divs (replace with newlines)
    this.turndownService.addRule('div', {
      filter: 'div',
      replacement: (content: string) => {
        return `${content}\n`;
      },
    });

    // Handle line breaks
    this.turndownService.addRule('lineBreak', {
      filter: 'br',
      replacement: () => {
        return '\n';
      },
    });
  }

  /**
   * Extract programming language from code element
   */
  private extractLanguage(node: HTMLElement): string {
    const className = node.className || '';

    // Use CodeFormatter to extract language
    let language = this.codeFormatter.extractLanguageFromClass(className);

    if (!language) {
      // Try to detect from content
      const codeContent = node.textContent || '';
      language = this.codeFormatter.detectLanguage(codeContent);
    }

    return language;
  }

  /**
   * Extract title from HTML
   */
  private extractTitle(html: string): string {
    // Try to get from title tag
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    if (titleMatch) {
      return titleMatch[1].trim();
    }

    // Try to get from h1 tag
    const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    if (h1Match) {
      return this.stripHtml(h1Match[1]).trim();
    }

    // Try to get from meta og:title
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["'][^>]*>/i);
    if (ogTitleMatch) {
      return ogTitleMatch[1];
    }

    return 'Untitled';
  }

  /**
   * Extract metadata from HTML and Markdown
   */
  private extractMetadata(html: string, markdown: string): ConversionMetadata {
    const metadata: ConversionMetadata = {};

    // Extract author
    const authorMatch = html.match(/<meta[^>]*name=["']author["'][^>]*content=["']([^"']*)["'][^>]*>/i);
    if (authorMatch) {
      metadata.author = authorMatch[1];
    }

    // Extract date
    const dateMatch = html.match(/<meta[^>]*name=["']date["'][^>]*content=["']([^"']*)["'][^>]*>/i);
    if (dateMatch) {
      metadata.date = dateMatch[1];
    }

    // Extract keywords/tags
    const keywordsMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']*)["'][^>]*>/i);
    if (keywordsMatch) {
      metadata.tags = keywordsMatch[1].split(',').map(t => t.trim());
    }

    // Count words
    metadata.wordCount = markdown.split(/\s+/).filter(w => w.length > 0).length;

    // Count images
    metadata.imageCount = (markdown.match(/!\[.*?\]\(.*?\)/g) || []).length;

    // Count code blocks
    metadata.codeBlocks = (markdown.match(/```/g) || []).length / 2;

    return metadata;
  }

  /**
   * Post-process Markdown to improve quality
   */
  private postProcessMarkdown(markdown: string): string {
    let processed = markdown;

    // Remove excessive blank lines (more than 2)
    processed = processed.replace(/\n{3,}/g, '\n\n');

    // Fix list formatting
    processed = processed.replace(/\n\s*[-*+]\s*\n/g, '\n');

    // Fix table spacing
    processed = processed.replace(/\n\|/g, '\n|');
    processed = processed.replace(/\|\n/g, '|\n');

    // Remove trailing whitespace from each line
    processed = processed.split('\n').map(line => line.trimRight()).join('\n');

    // Trim leading and trailing whitespace
    processed = processed.trim();

    return processed;
  }

  /**
   * Strip HTML tags from string
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }
}

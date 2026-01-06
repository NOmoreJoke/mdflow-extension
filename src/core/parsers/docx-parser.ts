/**
 * DOCX to Markdown Parser using Mammoth.js
 * Converts Word documents to clean Markdown format
 */

import mammoth from 'mammoth';
import type { Parser, ConversionResult, ConversionOptions, ConversionMetadata } from '@/types';

interface MammothResult {
  value: string;
  messages: mammoth.Message[];
}

interface MammothOptions {
  styleMap: string[];
  convertImage: mammoth.ImageConverter | boolean;
  includeDefaultStyleMap: boolean;
  ignoreEmptyParagraphs: boolean;
}

export class DocxParser implements Parser {
  private defaultOptions: MammothOptions = {
    styleMap: [
      // Headings
      'p[style-name=\'Heading 1\'] => h1:fresh',
      'p[style-name=\'Heading 2\'] => h2:fresh',
      'p[style-name=\'Heading 3\'] => h3:fresh',
      'p[style-name=\'Heading 4\'] => h4:fresh',
      'p[style-name=\'Heading 5\'] => h5:fresh',
      'p[style-name=\'Heading 6\'] => h6:fresh',
      // Chinese headings
      'p[style-name=\'标题 1\'] => h1:fresh',
      'p[style-name=\'标题 2\'] => h2:fresh',
      'p[style-name=\'标题 3\'] => h3:fresh',
      'p[style-name=\'标题 4\'] => h4:fresh',
      'p[style-name=\'标题 5\'] => h5:fresh',
      'p[style-name=\'标题 6\'] => h6:fresh',
      // Bold and Italic
      'b => strong',
      'i => em',
      // Code
      'r[style-name=\'Code\'] => code:inline',
      'p[style-name=\'Code\'] => pre:fresh',
      // Blockquote
      'p[style-name=\'Quote\'] => blockquote:fresh',
      'p[style-name=\'引用\'] => blockquote:fresh',
    ],
    convertImage: mammoth.images.imgElement(function (image) {
      return image.read('base64').then(function (imageBuffer) {
        return {
          src: `data:${image.contentType};base64,${imageBuffer}`,
        };
      });
    }),
    includeDefaultStyleMap: true,
    ignoreEmptyParagraphs: true,
  };

  /**
   * Check if this parser can handle the content type
   */
  canParse(content: string, type: string): boolean {
    return (
      type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      type === 'application/msword' ||
      type === 'docx' ||
      type === 'doc'
    );
  }

  /**
   * Parse DOCX content and convert to Markdown
   */
  async parse(file: File | ArrayBuffer, options: ConversionOptions): Promise<ConversionResult> {
    try {
      const arrayBuffer = file instanceof File ? await file.arrayBuffer() : file;

      // Convert to HTML first
      const htmlResult = await this.convertToHtml(arrayBuffer);

      // Convert HTML to Markdown
      const markdown = this.htmlToMarkdown(htmlResult.value);

      // Extract metadata
      const metadata = await this.extractMetadata(arrayBuffer);

      return {
        markdown,
        title: metadata.title || 'Word Document',
        url: '',
        timestamp: Date.now(),
        metadata,
      };
    } catch (error) {
      throw new Error(`DOCX parsing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Convert DOCX to HTML using Mammoth
   */
  private async convertToHtml(arrayBuffer: ArrayBuffer): Promise<MammothResult> {
    return mammoth.convertToHtml({ arrayBuffer }, this.defaultOptions);
  }

  /**
   * Convert HTML to Markdown
   */
  private htmlToMarkdown(html: string): string {
    let markdown = html;

    // Headings
    markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
    markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
    markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
    markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
    markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
    markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');

    // Bold and Italic
    markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');

    // Underline (convert to bold for MD)
    markdown = markdown.replace(/<u[^>]*>(.*?)<\/u>/gi, '**$1**');

    // Strikethrough
    markdown = markdown.replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~');
    markdown = markdown.replace(/<strike[^>]*>(.*?)<\/strike>/gi, '~~$1~~');
    markdown = markdown.replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~');

    // Code
    markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
    markdown = markdown.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '```\n$1\n```\n\n');

    // Blockquote
    markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (match, content) => {
      const lines = content.replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '').split('\n');
      return lines.map(line => `> ${line}`).join('\n') + '\n\n';
    });

    // Links
    markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');

    // Images
    markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)');
    markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)');

    // Unordered lists
    markdown = markdown.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
      return this.convertList(content, false);
    });

    // Ordered lists
    markdown = markdown.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
      return this.convertList(content, true);
    });

    // Tables
    markdown = markdown.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match, content) => {
      return this.convertTable(content);
    });

    // Paragraphs and line breaks
    markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
    markdown = markdown.replace(/<br[^>]*>/gi, '\n');

    // Remove remaining HTML tags
    markdown = markdown.replace(/<[^>]+>/g, '');

    // Clean up whitespace
    markdown = markdown.replace(/\n{3,}/g, '\n\n');

    return markdown.trim();
  }

  /**
   * Convert HTML list to Markdown list
   */
  private convertList(content: string, ordered: boolean): string {
    const items = content.split(/<li[^>]*>/).filter(item => item.trim());
    let index = 1;

    const convertedItems = items.map(item => {
      const text = item.replace(/<\/li>/gi, '').trim();
      if (!text) return '';

      const prefix = ordered ? `${index++}.` : '-';
      return `  ${prefix} ${text}`;
    });

    return convertedItems.filter(item => item).join('\n') + '\n\n';
  }

  /**
   * Convert HTML table to Markdown table
   */
  private convertTable(content: string): string {
    // Parse table rows
    const rowMatches = content.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
    if (!rowMatches) return '';

    const rows: string[][] = [];

    rowMatches.forEach(rowMatch => {
      const cellMatches = rowMatch.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi);
      if (cellMatches) {
        const cells = cellMatches.map(cell => {
          // Remove tags and get text
          return cell.replace(/<\/?t[dh][^>]*>/gi, '').trim();
        });
        rows.push(cells);
      }
    });

    if (rows.length < 2) return '';

    // Build Markdown table
    const header = rows[0].map(cell => this.escapeTableCell(cell)).join(' | ');
    const separator = rows[0].map(() => '---').join(' | ');
    const body = rows
      .slice(1)
      .map(row => row.map(cell => this.escapeTableCell(cell)).join(' | '));

    return `| ${header} |\n| ${separator} |\n${body.map(line => `| ${line} |`).join('\n')}\n\n`;
  }

  /**
   * Escape special characters in table cells
   */
  private escapeTableCell(cell: string): string {
    return cell.replace(/\|/g, '\\|').replace(/\n/g, ' ');
  }

  /**
   * Extract metadata from DOCX
   */
  private async extractMetadata(arrayBuffer: ArrayBuffer): Promise<ConversionMetadata> {
    const metadata: ConversionMetadata = {};

    try {
      // Extract raw text for word count
      const result = await mammoth.extractRawText({ arrayBuffer });
      metadata.wordCount = result.value.split(/\s+/).length;
    } catch (error) {
      console.warn('Failed to extract DOCX metadata:', error);
    }

    return metadata;
  }

  /**
   * Custom style map for preserving document structure
   */
  private buildStyleMap(options: ConversionOptions): string[] {
    const styleMap = [...this.defaultOptions.styleMap];

    if (options.preserveFormatting) {
      // Add more style mappings
      styleMap.push(
        'p[style-name=\'Title\'] => h1:fresh',
        'p[style-name=\'Subtitle\'] => h2:fresh'
      );
    }

    return styleMap;
  }

  /**
   * Advanced style handling for Chinese documents
   */
  private handleChineseStyles(html: string): string {
    // Handle common Chinese document patterns
    let processed = html;

    // Convert common Chinese punctuation
    processed = processed.replace(/【/g, '[').replace(/】/g, ']');
    processed = processed.replace(/（/g, '(').replace(/）/g, ')');

    // Handle Chinese-style numbering (一、二、三、)
    processed = processed.replace(/([一二三四五六七八九十]+)、/g, (match, num) => {
      return `### ${num}、`;
    });

    // Handle Chinese-style enumeration (1. 2. 3.)
    processed = processed.replace(/(\d+)\.、/g, '$1.');

    return processed;
  }

  /**
   * Handle document sections
   */
  private handleSections(markdown: string): string {
    const lines = markdown.split('\n');
    const processed: string[] = [];

    for (const line of lines) {
      // Detect section breaks (multiple dashes or equals)
      if (line.match(/^[-=]{3,}$/)) {
        processed.push('---');
        continue;
      }

      // Detect page breaks
      if (line.includes('\f') || line.includes('\u000C')) {
        processed.push('---');
        continue;
      }

      processed.push(line);
    }

    return processed.join('\n');
  }
}

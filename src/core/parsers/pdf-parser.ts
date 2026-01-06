/**
 * PDF to Markdown Parser using PDF.js
 * Extracts text, tables, and formulas from PDF documents
 */

import * as pdfjsLib from 'pdfjs-dist';
import type { Parser, ConversionResult, ConversionOptions, ConversionMetadata } from '@/types';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  hasEOL: boolean;
}

interface TextContent {
  items: TextItem[];
  styles: Record<string, any>;
}

interface PageContent {
  pageNumber: number;
  text: string;
  items: TextItem[];
}

export class PDFParser implements Parser {
  private document: pdfjsLib.PDFDocumentProxy | null = null;

  /**
   * Check if this parser can handle the content type
   */
  canParse(content: string, type: string): boolean {
    return type === 'application/pdf';
  }

  /**
   * Parse PDF content and convert to Markdown
   */
  async parse(file: File | ArrayBuffer, options: ConversionOptions): Promise<ConversionResult> {
    try {
      // Load PDF document
      const data = file instanceof File ? await file.arrayBuffer() : file;
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(data) });
      this.document = await loadingTask.promise;

      // Extract content from all pages
      const pages = await this.extractAllPages();

      // Convert to Markdown
      const markdown = this.convertToMarkdown(pages);

      // Extract metadata
      const metadata = await this.extractMetadata();

      return {
        markdown,
        title: metadata.title || 'PDF Document',
        url: '',
        timestamp: Date.now(),
        metadata,
      };
    } catch (error) {
      throw new Error(`PDF parsing failed: ${(error as Error).message}`);
    } finally {
      this.document = null;
    }
  }

  /**
   * Extract content from all pages
   */
  private async extractAllPages(): Promise<PageContent[]> {
    if (!this.document) throw new Error('PDF document not loaded');

    const pages: PageContent[] = [];
    const numPages = this.document.numPages;

    for (let i = 1; i <= numPages; i++) {
      const page = await this.document.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items.map((item: any) => item.str).join(' ');

      pages.push({
        pageNumber: i,
        text,
        items: textContent.items as TextItem[],
      });
    }

    return pages;
  }

  /**
   * Convert extracted pages to Markdown
   */
  private convertToMarkdown(pages: PageContent[]): string {
    const markdownLines: string[] = [];

    for (const page of pages) {
      // Add page break
      if (page.pageNumber > 1) {
        markdownLines.push('\n---\n');
      }

      // Analyze and format content
      const formattedContent = this.formatPageContent(page);
      markdownLines.push(formattedContent);
    }

    return markdownLines.join('\n');
  }

  /**
   * Format a single page content
   */
  private formatPageContent(page: PageContent): string {
    const lines: string[] = [];
    const { items, text } = page;

    // Detect headings (larger font size)
    const fontSizes = items.map(item => this.getFontSize(item));
    const maxFontSize = Math.max(...fontSizes);
    const avgFontSize = fontSizes.reduce((a, b) => a + b, 0) / fontSizes.length;

    // Split text into lines
    const textLines = text.split('\n').filter(line => line.trim());

    for (const line of textLines) {
      const trimmedLine = line.trim();

      if (!trimmedLine) {
        lines.push('');
        continue;
      }

      // Detect potential heading (all caps or larger text)
      const isAllCaps = trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 3;
      const isHeading = isAllCaps || this.isLikelyHeading(trimmedLine, textLines);

      if (isHeading) {
        lines.push(`### ${trimmedLine}`);
      } else {
        lines.push(trimmedLine);
      }
    }

    return lines.join('\n');
  }

  /**
   * Get font size from text item transform
   */
  private getFontSize(item: TextItem): number {
    // The transform matrix [a, b, c, d, e, f] where font size is sqrt(a^2 + b^2)
    const [a, b] = item.transform;
    return Math.sqrt(a * a + b * b);
  }

  /**
   * Check if line is likely a heading
   */
  private isLikelyHeading(line: string, allLines: string[]): boolean {
    // Short lines that are distinct from surrounding content
    if (line.length < 50 && line.length > 3) {
      // Check if it ends without punctuation
      const hasNoEndingPunctuation = !/[.,;:!?)\-]$/.test(line);
      return hasNoEndingPunctuation;
    }
    return false;
  }

  /**
   * Extract metadata from PDF
   */
  private async extractMetadata(): Promise<ConversionMetadata> {
    if (!this.document) return {};

    const metadata: ConversionMetadata = {};

    try {
      const info = await this.document.getMetadata();

      if (info.Info) {
        if (info.Info.Title) metadata.title = String(info.Info.Title);
        if (info.Info.Author) metadata.author = String(info.Info.Author);
        if (info.Info.Subject) metadata.tags = [String(info.Info.Subject)];
        if (info.Info.CreationDate) {
          metadata.date = this.parsePDFDate(String(info.Info.CreationDate));
        }
      }
    } catch (error) {
      // Metadata extraction failed, continue without it
      console.warn('Failed to extract PDF metadata:', error);
    }

    // Count pages
    metadata.wordCount = this.document.numPages;

    return metadata;
  }

  /**
   * Parse PDF date format
   */
  private parsePDFDate(dateStr: string): string {
    // PDF dates are in format: D:YYYYMMDDHHmmSSOHH'mm'
    // Example: D:20240106120000Z
    try {
      const match = dateStr.match(/D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
      if (match) {
        const [, year, month, day, hour, minute, second] = match;
        const date = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour),
          parseInt(minute),
          parseInt(second)
        );
        return date.toISOString();
      }
    } catch (error) {
      // Date parsing failed
    }
    return dateStr;
  }

  /**
   * Advanced table detection (simplified)
   */
  private detectTables(page: PageContent): boolean {
    // Simple heuristic: if text contains multiple columns
    const lines = page.text.split('\n').filter(line => line.trim());
    if (lines.length < 3) return false;

    // Check for consistent spacing patterns
    const lineLengths = lines.map(line => line.length);
    const avgLength = lineLengths.reduce((a, b) => a + b, 0) / lineLengths.length;

    // If most lines are significantly longer than average, might be table
    const longLines = lineLengths.filter(len => len > avgLength * 1.5).length;
    return longLines > lines.length * 0.5;
  }

  /**
   * Convert table-like content to Markdown table
   */
  private convertTableToMarkdown(text: string): string {
    const lines = text.split('\n').filter(line => line.trim());

    // Try to detect columns by whitespace
    const rows: string[][] = lines.map(line => {
      // Split by multiple spaces
      return line.split(/\s{2,}/).map(cell => cell.trim());
    });

    if (rows.length < 2 || rows.every(row => row.length < 2)) {
      return text; // Not a table
    }

    // Determine column count (use max)
    const colCount = Math.max(...rows.map(row => row.length));

    // Normalize rows
    const normalizedRows = rows.map(row => {
      while (row.length < colCount) row.push('');
      return row.slice(0, colCount);
    });

    // Build Markdown table
    const header = normalizedRows[0].map(cell => cell || '').join(' | ');
    const separator = normalizedRows[0].map(() => '---').join(' | ');
    const body = normalizedRows
      .slice(1)
      .map(row => row.map(cell => cell || '').join(' | '));

    return `| ${header} |\n| ${separator} |\n${body.map(line => `| ${line} |`).join('\n')}\n`;
  }
}

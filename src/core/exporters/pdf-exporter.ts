/**
 * PDF Exporter
 * Converts Markdown to PDF using HTML rendering and print-to-PDF
 */

import { marked } from 'marked';
import type { ConversionResult } from '@/types';
import type { Exporter, ExportResult, ExportOptions } from './exporter-factory';

// PDF-specific styles
const PDF_STYLES = `
  @page {
    size: A4;
    margin: 2.5cm;
  }
  
  body {
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 12pt;
    line-height: 1.5;
    color: #000;
    background: #fff;
    max-width: none;
    margin: 0;
    padding: 0;
  }
  
  h1, h2, h3, h4, h5, h6 {
    font-family: 'Helvetica Neue', 'Arial', sans-serif;
    page-break-after: avoid;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
  }
  
  h1 { font-size: 24pt; border-bottom: 2px solid #333; padding-bottom: 0.3em; }
  h2 { font-size: 18pt; border-bottom: 1px solid #666; padding-bottom: 0.2em; }
  h3 { font-size: 14pt; }
  h4 { font-size: 12pt; }
  
  p { margin: 1em 0; text-align: justify; }
  
  a { color: #0066cc; text-decoration: underline; }
  
  code {
    font-family: 'Courier New', Courier, monospace;
    font-size: 10pt;
    background: #f5f5f5;
    padding: 0.2em 0.4em;
    border-radius: 2px;
  }
  
  pre {
    background: #f5f5f5;
    padding: 1em;
    border: 1px solid #ddd;
    border-radius: 4px;
    overflow-x: auto;
    page-break-inside: avoid;
  }
  
  pre code {
    background: none;
    padding: 0;
  }
  
  blockquote {
    margin: 1em 0;
    padding: 0.5em 1em;
    border-left: 4px solid #666;
    background: #f9f9f9;
    font-style: italic;
  }
  
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
    page-break-inside: avoid;
  }
  
  th, td {
    border: 1px solid #333;
    padding: 0.5em;
    text-align: left;
  }
  
  th { background: #f0f0f0; font-weight: bold; }
  
  img { 
    max-width: 100%; 
    height: auto; 
    page-break-inside: avoid;
  }
  
  hr {
    border: 0;
    border-top: 1px solid #333;
    margin: 2em 0;
  }
  
  ul, ol { padding-left: 2em; }
  li { margin: 0.3em 0; }
  
  .metadata {
    background: #f5f5f5;
    border: 1px solid #ddd;
    padding: 1em;
    margin-bottom: 2em;
    font-size: 10pt;
  }
  
  .metadata h4 { margin: 0 0 0.5em 0; font-size: 11pt; }
  .metadata p { margin: 0.2em 0; text-align: left; }
  
  .page-break { page-break-after: always; }
`;

export class PdfExporter implements Exporter {
    /**
     * Export conversion result as PDF
     * Note: In browser extension context, we generate an HTML string
     * that will be printed to PDF using the browser's print dialog
     */
    async export(result: ConversionResult, options: ExportOptions = {}): Promise<ExportResult> {
        const {
            includeTitle = true,
            includeMetadata = false,
            customStyles = '',
        } = options;

        // Configure marked for PDF output
        marked.setOptions({
            gfm: true,
            breaks: false, // PDF prefers semantic line breaks
        });

        // Convert markdown to HTML
        const bodyHtml = await marked.parse(result.markdown);

        // Build the HTML document for PDF
        const html = this.buildPdfHtml({
            title: result.title,
            body: bodyHtml,
            url: result.url,
            metadata: result.metadata,
            timestamp: result.timestamp,
            includeTitle,
            includeMetadata,
            customStyles,
        });

        const sanitizedTitle = this.sanitizeFilename(result.title || 'untitled');

        // Return HTML content with PDF mime type
        // The actual PDF conversion will be handled by the background script
        // using Chrome's print API or a dedicated offscreen document
        return {
            content: html,
            filename: `${sanitizedTitle}.pdf`,
            mimeType: 'application/pdf',
            extension: 'pdf',
        };
    }

    /**
     * Build HTML document optimized for PDF printing
     */
    private buildPdfHtml(params: {
        title: string;
        body: string;
        url: string;
        metadata?: ConversionResult['metadata'];
        timestamp: number;
        includeTitle: boolean;
        includeMetadata: boolean;
        customStyles: string;
    }): string {
        const {
            title,
            body,
            url,
            metadata,
            timestamp,
            includeTitle,
            includeMetadata,
            customStyles,
        } = params;

        let metadataHtml = '';
        if (includeMetadata && metadata) {
            metadataHtml = `
        <div class="metadata">
          <h4>Document Information</h4>
          <p><strong>Source:</strong> ${this.escapeHtml(url)}</p>
          <p><strong>Generated:</strong> ${new Date(timestamp).toLocaleString()}</p>
          ${metadata.author ? `<p><strong>Author:</strong> ${this.escapeHtml(metadata.author)}</p>` : ''}
          ${metadata.wordCount ? `<p><strong>Word Count:</strong> ${metadata.wordCount}</p>` : ''}
        </div>
      `;
        }

        const titleHtml = includeTitle ? `<h1>${this.escapeHtml(title)}</h1>` : '';

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)} - PDF Export</title>
  <style>
${PDF_STYLES}
${customStyles}
  </style>
</head>
<body>
  ${metadataHtml}
  ${titleHtml}
  ${body}
</body>
</html>`;
    }

    /**
     * Escape HTML special characters
     */
    private escapeHtml(text: string): string {
        const htmlEntities: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        };
        return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
    }

    /**
     * Sanitize filename
     */
    private sanitizeFilename(filename: string): string {
        return filename
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
            .replace(/\s+/g, '_')
            .substring(0, 100);
    }

    /**
     * Generate a printable window for PDF export
     * This is used in content scripts or popup to trigger print dialog
     */
    static openPrintWindow(html: string): void {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();

            // Wait for content to load, then trigger print
            printWindow.onload = () => {
                printWindow.print();
            };
        }
    }
}

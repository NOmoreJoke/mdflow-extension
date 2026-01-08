/**
 * Exporter Factory
 * Manages different format exporters for MDFlow Extension
 */

import { HtmlExporter } from './html-exporter';
import { TxtExporter } from './txt-exporter';
import { PdfExporter } from './pdf-exporter';
import type { ConversionResult, ConversionOptions } from '@/types';

export type ExportFormat = 'markdown' | 'html' | 'txt' | 'pdf';

export interface ExportResult {
    content: string | Blob;
    filename: string;
    mimeType: string;
    extension: string;
}

export interface Exporter {
    export(result: ConversionResult, options?: ExportOptions): Promise<ExportResult>;
}

export interface ExportOptions {
    includeTitle?: boolean;
    includeMetadata?: boolean;
    customStyles?: string;
    templateName?: string;
}

class ExporterFactory {
    private htmlExporter: HtmlExporter;
    private txtExporter: TxtExporter;
    private pdfExporter: PdfExporter;

    constructor() {
        this.htmlExporter = new HtmlExporter();
        this.txtExporter = new TxtExporter();
        this.pdfExporter = new PdfExporter();
    }

    /**
     * Get the appropriate exporter for the given format
     */
    getExporter(format: ExportFormat): Exporter | null {
        switch (format) {
            case 'html':
                return this.htmlExporter;
            case 'txt':
                return this.txtExporter;
            case 'pdf':
                return this.pdfExporter;
            case 'markdown':
                // Markdown is the default, return as-is
                return null;
            default:
                console.warn(`Unknown export format: ${format}`);
                return null;
        }
    }

    /**
     * Export conversion result to the specified format
     */
    async export(
        result: ConversionResult,
        format: ExportFormat,
        options: ExportOptions = {}
    ): Promise<ExportResult> {
        const sanitizedTitle = this.sanitizeFilename(result.title || 'untitled');

        // Handle markdown format directly
        if (format === 'markdown') {
            let content = result.markdown;

            // Add front matter if metadata is requested
            if (options.includeMetadata && result.metadata) {
                const frontMatter = this.generateFrontMatter(result);
                content = frontMatter + content;
            }

            return {
                content,
                filename: `${sanitizedTitle}.md`,
                mimeType: 'text/markdown',
                extension: 'md',
            };
        }

        // Get the appropriate exporter
        const exporter = this.getExporter(format);
        if (!exporter) {
            throw new Error(`No exporter available for format: ${format}`);
        }

        return exporter.export(result, options);
    }

    /**
     * Generate YAML front matter for markdown
     */
    private generateFrontMatter(result: ConversionResult): string {
        const lines = ['---'];
        lines.push(`title: "${result.title || 'Untitled'}"`);
        lines.push(`url: "${result.url || ''}"`);
        lines.push(`date: "${new Date(result.timestamp).toISOString()}"`);

        if (result.metadata) {
            if (result.metadata.author) {
                lines.push(`author: "${result.metadata.author}"`);
            }
            if (result.metadata.wordCount) {
                lines.push(`wordCount: ${result.metadata.wordCount}`);
            }
            if (result.metadata.tags && result.metadata.tags.length > 0) {
                lines.push(`tags: [${result.metadata.tags.map(t => `"${t}"`).join(', ')}]`);
            }
        }

        lines.push('---', '', '');
        return lines.join('\n');
    }

    /**
     * Sanitize filename for safe download
     */
    private sanitizeFilename(filename: string): string {
        return filename
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
            .replace(/\s+/g, '_')
            .substring(0, 100);
    }

    /**
     * Get supported export formats
     */
    getSupportedFormats(): ExportFormat[] {
        return ['markdown', 'html', 'txt', 'pdf'];
    }

    /**
     * Get MIME type for a format
     */
    getMimeType(format: ExportFormat): string {
        switch (format) {
            case 'markdown':
                return 'text/markdown';
            case 'html':
                return 'text/html';
            case 'txt':
                return 'text/plain';
            case 'pdf':
                return 'application/pdf';
            default:
                return 'application/octet-stream';
        }
    }

    /**
     * Get file extension for a format
     */
    getExtension(format: ExportFormat): string {
        switch (format) {
            case 'markdown':
                return 'md';
            case 'html':
                return 'html';
            case 'txt':
                return 'txt';
            case 'pdf':
                return 'pdf';
            default:
                return 'txt';
        }
    }
}

// Singleton instance
export const exporterFactory = new ExporterFactory();
export { ExporterFactory };

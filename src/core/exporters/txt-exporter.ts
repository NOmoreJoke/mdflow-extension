/**
 * TXT Exporter
 * Converts Markdown to plain text, removing all formatting
 */

import type { ConversionResult } from '@/types';
import type { Exporter, ExportResult, ExportOptions } from './exporter-factory';

export class TxtExporter implements Exporter {
    /**
     * Export conversion result as plain text
     */
    async export(result: ConversionResult, options: ExportOptions = {}): Promise<ExportResult> {
        const { includeTitle = true, includeMetadata = false } = options;

        let text = '';

        // Add metadata header if requested
        if (includeMetadata) {
            text += this.generateMetadataHeader(result);
        }

        // Add title
        if (includeTitle && result.title) {
            text += result.title + '\n';
            text += '='.repeat(Math.min(result.title.length, 80)) + '\n\n';
        }

        // Convert markdown to plain text
        text += this.convertMarkdownToPlainText(result.markdown);

        const sanitizedTitle = this.sanitizeFilename(result.title || 'untitled');

        return {
            content: text,
            filename: `${sanitizedTitle}.txt`,
            mimeType: 'text/plain',
            extension: 'txt',
        };
    }

    /**
     * Generate metadata header for plain text
     */
    private generateMetadataHeader(result: ConversionResult): string {
        const lines = [];
        lines.push('Document Information');
        lines.push('-'.repeat(40));
        lines.push(`Source: ${result.url}`);
        lines.push(`Exported: ${new Date(result.timestamp).toLocaleString()}`);

        if (result.metadata) {
            if (result.metadata.author) {
                lines.push(`Author: ${result.metadata.author}`);
            }
            if (result.metadata.wordCount) {
                lines.push(`Word Count: ${result.metadata.wordCount}`);
            }
        }

        lines.push('-'.repeat(40), '', '');
        return lines.join('\n');
    }

    /**
     * Convert markdown to plain text
     */
    private convertMarkdownToPlainText(markdown: string): string {
        let text = markdown;

        // Remove code blocks but keep content
        text = text.replace(/```[\s\S]*?```/g, (match) => {
            const content = match.replace(/```\w*\n?/, '').replace(/```$/, '');
            return '\n' + content.split('\n').map(line => '    ' + line).join('\n') + '\n';
        });

        // Remove inline code backticks
        text = text.replace(/`([^`]+)`/g, '$1');

        // Convert headers to plain text with underlines
        text = text.replace(/^#{1,6}\s+(.+)$/gm, (_, content) => {
            return content + '\n';
        });

        // Remove bold/italic markers
        text = text.replace(/\*\*\*(.+?)\*\*\*/g, '$1');
        text = text.replace(/\*\*(.+?)\*\*/g, '$1');
        text = text.replace(/\*(.+?)\*/g, '$1');
        text = text.replace(/___(.+?)___/g, '$1');
        text = text.replace(/__(.+?)__/g, '$1');
        text = text.replace(/_(.+?)_/g, '$1');

        // Convert links to plain text format
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');

        // Convert images to description
        text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '[Image: $1]');

        // Convert blockquotes
        text = text.replace(/^>\s+/gm, '  ');

        // Convert horizontal rules
        text = text.replace(/^[-*_]{3,}$/gm, '\n' + '-'.repeat(40) + '\n');

        // Convert unordered lists
        text = text.replace(/^[\s]*[-*+]\s+/gm, '  • ');

        // Convert ordered lists
        text = text.replace(/^[\s]*(\d+)\.\s+/gm, '  $1. ');

        // Convert tables to simple format
        text = this.convertTablesToPlainText(text);

        // Remove HTML tags
        text = text.replace(/<[^>]+>/g, '');

        // Normalize whitespace
        text = text.replace(/\n{3,}/g, '\n\n');
        text = text.trim();

        return text;
    }

    /**
     * Convert markdown tables to plain text format
     */
    private convertTablesToPlainText(text: string): string {
        // Match table blocks
        const tableRegex = /(\|[^\n]+\|\n)+/g;

        return text.replace(tableRegex, (table) => {
            const rows = table.trim().split('\n');
            const result: string[] = [];

            for (const row of rows) {
                // Skip separator rows (|---|---|)
                if (/^\|[\s\-:]+\|$/.test(row)) {
                    continue;
                }

                // Extract cells
                const cells = row
                    .split('|')
                    .filter(cell => cell.trim())
                    .map(cell => cell.trim());

                if (cells.length > 0) {
                    result.push(cells.join('  |  '));
                }
            }

            return result.join('\n') + '\n';
        });
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
}

/**
 * HTML Exporter
 * Converts Markdown to formatted HTML document
 */

import { marked } from 'marked';
import type { ConversionResult } from '@/types';
import type { Exporter, ExportResult, ExportOptions } from './exporter-factory';

// Default CSS styles for exported HTML
const DEFAULT_STYLES = `
  body {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    background: #fff;
  }
  
  h1, h2, h3, h4, h5, h6 {
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    font-weight: 600;
    line-height: 1.25;
  }
  
  h1 { font-size: 2em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
  h2 { font-size: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
  h3 { font-size: 1.25em; }
  
  p { margin: 1em 0; }
  
  a {
    color: #0366d6;
    text-decoration: none;
  }
  a:hover { text-decoration: underline; }
  
  code {
    background: #f6f8fa;
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 85%;
  }
  
  pre {
    background: #f6f8fa;
    padding: 1em;
    border-radius: 6px;
    overflow-x: auto;
  }
  
  pre code {
    background: none;
    padding: 0;
  }
  
  blockquote {
    margin: 1em 0;
    padding-left: 1em;
    border-left: 4px solid #dfe2e5;
    color: #6a737d;
  }
  
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
  }
  
  th, td {
    border: 1px solid #dfe2e5;
    padding: 0.6em 1em;
    text-align: left;
  }
  
  th { background: #f6f8fa; font-weight: 600; }
  
  img { max-width: 100%; height: auto; }
  
  hr {
    border: 0;
    border-top: 1px solid #eee;
    margin: 2em 0;
  }
  
  ul, ol { padding-left: 2em; }
  li { margin: 0.25em 0; }
  
  .metadata {
    background: #f6f8fa;
    border: 1px solid #e1e4e8;
    border-radius: 6px;
    padding: 1em;
    margin-bottom: 2em;
    font-size: 0.9em;
    color: #586069;
  }
  
  .metadata h4 { margin: 0 0 0.5em 0; color: #24292e; }
  .metadata p { margin: 0.25em 0; }
  
  @media (prefers-color-scheme: dark) {
    body { background: #0d1117; color: #c9d1d9; }
    h1, h2 { border-bottom-color: #21262d; }
    code, pre { background: #161b22; }
    blockquote { border-left-color: #30363d; color: #8b949e; }
    th, td { border-color: #30363d; }
    th { background: #161b22; }
    .metadata { background: #161b22; border-color: #30363d; }
    .metadata h4 { color: #c9d1d9; }
    a { color: #58a6ff; }
  }
`;

export class HtmlExporter implements Exporter {
    /**
     * Export conversion result as HTML document
     */
    async export(result: ConversionResult, options: ExportOptions = {}): Promise<ExportResult> {
        const {
            includeTitle = true,
            includeMetadata = false,
            customStyles = '',
        } = options;

        // Configure marked
        marked.setOptions({
            gfm: true,
            breaks: true,
        });

        // Convert markdown to HTML
        const bodyHtml = await marked.parse(result.markdown);

        // Build the full HTML document
        const html = this.buildHtmlDocument({
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

        return {
            content: html,
            filename: `${sanitizedTitle}.html`,
            mimeType: 'text/html',
            extension: 'html',
        };
    }

    /**
     * Build a complete HTML document
     */
    private buildHtmlDocument(params: {
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
          <h4>Document Info</h4>
          <p><strong>Source:</strong> <a href="${url}" target="_blank">${url}</a></p>
          <p><strong>Exported:</strong> ${new Date(timestamp).toLocaleString()}</p>
          ${metadata.author ? `<p><strong>Author:</strong> ${metadata.author}</p>` : ''}
          ${metadata.wordCount ? `<p><strong>Word Count:</strong> ${metadata.wordCount}</p>` : ''}
          ${metadata.imageCount ? `<p><strong>Images:</strong> ${metadata.imageCount}</p>` : ''}
          ${metadata.codeBlocks ? `<p><strong>Code Blocks:</strong> ${metadata.codeBlocks}</p>` : ''}
        </div>
      `;
        }

        const titleHtml = includeTitle ? `<h1>${this.escapeHtml(title)}</h1>` : '';

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="MDFlow Extension">
  <meta name="source" content="${this.escapeHtml(url)}">
  <title>${this.escapeHtml(title)}</title>
  <style>
${DEFAULT_STYLES}
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
}

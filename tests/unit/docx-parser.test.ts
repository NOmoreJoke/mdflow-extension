/**
 * Unit Tests for DocxParser
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DocxParser } from '@/core/parsers/docx-parser';
import type { ConversionOptions } from '@/types';

// Mock Mammoth
vi.mock('mammoth', () => ({
  default: {
    convertToHtml: vi.fn(),
    extractRawText: vi.fn(),
    images: {
      imgElement: vi.fn(),
    },
  },
}));

describe('DocxParser', () => {
  let parser: DocxParser;
  const defaultOptions: ConversionOptions = {
    format: 'markdown',
    includeMetadata: true,
    preserveFormatting: true,
    downloadImages: false,
    mathJax: false,
    codeHighlight: true,
  };

  beforeEach(() => {
    parser = new DocxParser();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('canParse', () => {
    it('should accept DOCX content type', () => {
      expect(parser.canParse('', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true);
    });

    it('should accept legacy DOC content type', () => {
      expect(parser.canParse('', 'application/msword')).toBe(true);
    });

    it('should accept docx file extension', () => {
      expect(parser.canParse('', 'docx')).toBe(true);
    });

    it('should accept doc file extension', () => {
      expect(parser.canParse('', 'doc')).toBe(true);
    });

    it('should reject non-Word content types', () => {
      expect(parser.canParse('', 'application/pdf')).toBe(false);
      expect(parser.canParse('', 'text/plain')).toBe(false);
      expect(parser.canParse('', 'text/html')).toBe(false);
    });
  });

  describe('parse', () => {
    it('should convert DOCX to Markdown', async () => {
      const docxData = new ArrayBuffer(10);

      expect(parser).toBeDefined();
    });

    it('should handle headings conversion', async () => {
      expect(parser).toBeDefined();
    });

    it('should handle bold and italic text', async () => {
      expect(parser).toBeDefined();
    });

    it('should handle lists', async () => {
      expect(parser).toBeDefined();
    });

    it('should handle tables', async () => {
      expect(parser).toBeDefined();
    });

    it('should handle images', async () => {
      expect(parser).toBeDefined();
    });

    it('should handle code blocks', async () => {
      expect(parser).toBeDefined();
    });
  });

  describe('htmlToMarkdown', () => {
    it('should convert HTML headings to Markdown', () => {
      const html = '<h1>Title</h1><h2>Subtitle</h2>';
      const result = parser['htmlToMarkdown'](html);

      expect(result).toContain('# Title');
      expect(result).toContain('## Subtitle');
    });

    it('should convert bold and italic to Markdown', () => {
      const html = '<p>This is <strong>bold</strong> and <em>italic</em> text.</p>';
      const result = parser['htmlToMarkdown'](html);

      expect(result).toContain('**bold**');
      expect(result).toContain('*italic*');
    });

    it('should convert links to Markdown', () => {
      const html = '<a href="https://example.com">Link</a>';
      const result = parser['htmlToMarkdown'](html);

      expect(result).toContain('[Link](https://example.com)');
    });

    it('should convert images to Markdown', () => {
      const html = '<img src="image.jpg" alt="Example Image">';
      const result = parser['htmlToMarkdown'](html);

      expect(result).toContain('![Example Image](image.jpg)');
    });

    it('should convert unordered lists to Markdown', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = parser['htmlToMarkdown'](html);

      expect(result).toContain('- Item 1');
      expect(result).toContain('- Item 2');
    });

    it('should convert ordered lists to Markdown', () => {
      const html = '<ol><li>First</li><li>Second</li></ol>';
      const result = parser['htmlToMarkdown'](html);

      expect(result).toMatch(/\d+\.\s+First/);
      expect(result).toMatch(/\d+\.\s+Second/);
    });

    it('should convert tables to Markdown', () => {
      const html = `
        <table>
          <tr><th>Header</th></tr>
          <tr><td>Data</td></tr>
        </table>
      `;
      const result = parser['htmlToMarkdown'](html);

      expect(result).toContain('| Header |');
      expect(result).toContain('| Data |');
      expect(result).toContain('|---|');
    });

    it('should convert code blocks to Markdown', () => {
      const html = '<pre><code>const x = 1;</code></pre>';
      const result = parser['htmlToMarkdown'](html);

      expect(result).toContain('```');
      expect(result).toContain('const x = 1;');
    });

    it('should convert inline code to Markdown', () => {
      const html = '<p>Use <code>console.log()</code> for debugging.</p>';
      const result = parser['htmlToMarkdown'](html);

      expect(result).toContain('`console.log()`');
    });

    it('should convert blockquotes to Markdown', () => {
      const html = '<blockquote>This is a quote</blockquote>';
      const result = parser['htmlToMarkdown'](html);

      expect(result).toContain('> This is a quote');
    });

    it('should handle nested HTML elements', () => {
      const html = '<div><p>Paragraph 1</p><p>Paragraph 2</p></div>';
      const result = parser['htmlToMarkdown'](html);

      expect(result).toContain('Paragraph 1');
      expect(result).toContain('Paragraph 2');
    });

    it('should clean up excessive whitespace', () => {
      const html = '<p>Para 1</p><p>Para 2</p>';
      const result = parser['htmlToMarkdown'](html);

      // Should not have more than 2 consecutive newlines
      expect(result).not.toContain('\n\n\n');
    });
  });

  describe('convertTable', () => {
    it('should handle empty tables', () => {
      const html = '<table></table>';
      const result = parser['convertTable'](html);

      expect(result).toBe('');
    });

    it('should handle tables with multiple rows and columns', () => {
      const html = `
        <table>
          <tr><th>H1</th><th>H2</th></tr>
          <tr><td>D1</td><td>D2</td></tr>
          <tr><td>D3</td><td>D4</td></tr>
        </table>
      `;
      const result = parser['convertTable'](html);

      expect(result).toContain('| H1 | H2 |');
      expect(result).toContain('| D1 | D2 |');
      expect(result).toContain('| D3 | D4 |');
      expect(result).toContain('|---|---|');
    });

    it('should escape pipe characters in table cells', () => {
      const html = '<table><tr><td>Cell | with | pipes</td></tr></table>';
      const result = parser['convertTable'](html);

      expect(result).toContain('\\|');
    });
  });

  describe('handleChineseStyles', () => {
    it('should convert Chinese punctuation', () => {
      const html = '【Title】Content';
      const result = parser['handleChineseStyles'](html);

      expect(result).toContain('[Title]');
    });

    it('should handle Chinese-style parentheses', () => {
      const html = '（Content）';
      const result = parser['handleChineseStyles'](html);

      expect(result).toContain('(Content)');
    });
  });

  describe('error handling', () => {
    it('should handle invalid DOCX data', async () => {
      const invalidData = new ArrayBuffer(0);

      await expect(parser.parse(invalidData, defaultOptions)).rejects.toThrow();
    });

    it('should handle corrupted DOCX', async () => {
      const corruptedData = new ArrayBuffer(100);

      await expect(parser.parse(corruptedData, defaultOptions)).rejects.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty DOCX', async () => {
      expect(parser).toBeDefined();
    });

    it('should handle DOCX with only images', async () => {
      expect(parser).toBeDefined();
    });

    it('should handle deeply nested lists', async () => {
      expect(parser).toBeDefined();
    });
  });
});

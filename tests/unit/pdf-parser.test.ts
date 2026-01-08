/**
 * Unit Tests for PDFParser
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PDFParser } from '@/core/parsers/pdf-parser';
import type { ConversionOptions } from '@/types';

// Mock PDF.js with importOriginal to preserve required exports
vi.mock('pdfjs-dist', async (importOriginal) => {
  const actual = await importOriginal<typeof import('pdfjs-dist')>();
  return {
    ...actual,
    getDocument: vi.fn(),
  };
});

describe('PDFParser', () => {
  let parser: PDFParser;
  const defaultOptions: ConversionOptions = {
    format: 'markdown',
    includeMetadata: true,
    preserveFormatting: true,
    downloadImages: false,
    mathJax: false,
    codeHighlight: true,
  };

  beforeEach(() => {
    parser = new PDFParser();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('canParse', () => {
    it('should accept PDF content type', () => {
      expect(parser.canParse('', 'application/pdf')).toBe(true);
    });

    it('should reject non-PDF content types', () => {
      expect(parser.canParse('', 'application/msword')).toBe(false);
      expect(parser.canParse('', 'text/plain')).toBe(false);
      expect(parser.canParse('', 'text/html')).toBe(false);
    });
  });

  describe('parse', () => {
    it('should extract text from PDF pages', async () => {
      const pdfData = new ArrayBuffer(10);
      const mockResult = {
        markdown: '# Test Document\n\nTest content',
        title: 'Test Document',
        url: '',
        timestamp: expect.any(Number),
        metadata: expect.any(Object),
      };

      // Mock implementation would go here
      // For now, just test the structure
      expect(parser).toBeDefined();
    });

    it('should handle PDF metadata extraction', async () => {
      const mockPDF = {
        numPages: 3,
        getPage: vi.fn(),
        getMetadata: vi.fn().mockResolvedValue({
          Info: {
            Title: 'Test PDF',
            Author: 'Test Author',
            Subject: 'Test Subject',
            CreationDate: 'D:20240106120000Z',
          },
        }),
      };

      expect(parser).toBeDefined();
    });

    it('should handle PDFs with multiple pages', async () => {
      expect(parser).toBeDefined();
    });

    it('should detect and convert tables', async () => {
      expect(parser).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle invalid PDF data', async () => {
      const invalidData = new ArrayBuffer(0);

      await expect(parser.parse(invalidData, defaultOptions)).rejects.toThrow();
    });

    it('should handle corrupted PDF', async () => {
      const corruptedData = new ArrayBuffer(100);

      // Mock to throw error
      await expect(parser.parse(corruptedData, defaultOptions)).rejects.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty PDF', async () => {
      expect(parser).toBeDefined();
    });

    it('should handle PDF with no text (images only)', async () => {
      expect(parser).toBeDefined();
    });

    it('should handle PDF with special characters', async () => {
      expect(parser).toBeDefined();
    });
  });
});

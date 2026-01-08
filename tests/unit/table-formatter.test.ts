/**
 * Unit Tests for TableFormatter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TableFormatter } from '@/core/processors/table-formatter';

describe('TableFormatter', () => {
    let formatter: TableFormatter;

    beforeEach(() => {
        formatter = new TableFormatter();
    });

    describe('detectTables', () => {
        it('should detect tables in HTML', () => {
            const html = '<table><tr><td>Cell</td></tr></table>';
            expect(formatter.detectTables(html)).toBe(true);
        });

        it('should return false for HTML without tables', () => {
            const html = '<p>No tables here</p>';
            expect(formatter.detectTables(html)).toBe(false);
        });

        it('should detect tables with attributes', () => {
            const html = '<table class="data-table" id="main"><tr><td>Cell</td></tr></table>';
            expect(formatter.detectTables(html)).toBe(true);
        });
    });

    describe('countTables', () => {
        it('should count multiple tables', () => {
            const html = `
        <table><tr><td>1</td></tr></table>
        <table><tr><td>2</td></tr></table>
        <table><tr><td>3</td></tr></table>
      `;
            expect(formatter.countTables(html)).toBe(3);
        });

        it('should return 0 for no tables', () => {
            const html = '<p>No tables</p>';
            expect(formatter.countTables(html)).toBe(0);
        });
    });

    describe('processTables', () => {
        it('should convert simple table to Markdown', () => {
            const html = `
        <table>
          <tr><th>Name</th><th>Age</th></tr>
          <tr><td>John</td><td>25</td></tr>
        </table>
      `;
            const result = formatter.processTables(html);

            expect(result).toContain('|');
            expect(result).toContain('---');
        });

        it('should handle empty table', () => {
            const html = '<table></table>';
            const result = formatter.processTables(html);
            expect(result).toBeDefined();
        });
    });

    describe('extractTableData', () => {
        it('should extract data from table', () => {
            const html = `
        <table>
          <tr><td>A1</td><td>B1</td></tr>
          <tr><td>A2</td><td>B2</td></tr>
        </table>
      `;
            const data = formatter.extractTableData(html);

            expect(data).toHaveLength(2);
            expect(data[0]).toContain('A1');
            expect(data[0]).toContain('B1');
        });

        it('should return empty array for invalid HTML', () => {
            const data = formatter.extractTableData('<p>Not a table</p>');
            expect(data).toEqual([]);
        });
    });

    describe('arrayToMarkdownTable', () => {
        it('should convert 2D array to Markdown table', () => {
            const data = [
                ['Name', 'Age'],
                ['John', '25'],
                ['Jane', '30'],
            ];

            const result = formatter.arrayToMarkdownTable(data);

            expect(result).toContain('| Name | Age |');
            expect(result).toContain('| --- | --- |');
            expect(result).toContain('| John | 25 |');
            expect(result).toContain('| Jane | 30 |');
        });

        it('should use provided headers', () => {
            const data = [
                ['John', '25'],
                ['Jane', '30'],
            ];
            const headers = ['Name', 'Age'];

            const result = formatter.arrayToMarkdownTable(data, headers);

            expect(result).toContain('| Name | Age |');
        });

        it('should return empty string for empty data', () => {
            const result = formatter.arrayToMarkdownTable([]);
            expect(result).toBe('');
        });
    });

    describe('validateTable', () => {
        it('should validate empty table', () => {
            const table = {
                rows: [],
                hasHeaders: false,
                columns: 0,
            };

            const validation = formatter.validateTable(table);

            expect(validation.valid).toBe(false);
            expect(validation.errors).toContain('Table has no rows');
        });

        it('should flag inconsistent column counts', () => {
            const table = {
                rows: [
                    {
                        cells: [
                            { text: 'A', colspan: 1, rowspan: 1, isHeader: true },
                            { text: 'B', colspan: 1, rowspan: 1, isHeader: true },
                        ],
                        isHeader: true,
                    },
                    {
                        cells: [
                            { text: 'C', colspan: 1, rowspan: 1, isHeader: false },
                        ],
                        isHeader: false,
                    },
                ],
                hasHeaders: true,
                columns: 2,
            };

            const validation = formatter.validateTable(table);

            expect(validation.errors.some(e => e.includes('inconsistent'))).toBe(true);
        });

        it('should pass valid table', () => {
            const table = {
                rows: [
                    {
                        cells: [
                            { text: 'A', colspan: 1, rowspan: 1, isHeader: true },
                            { text: 'B', colspan: 1, rowspan: 1, isHeader: true },
                        ],
                        isHeader: true,
                    },
                    {
                        cells: [
                            { text: 'C', colspan: 1, rowspan: 1, isHeader: false },
                            { text: 'D', colspan: 1, rowspan: 1, isHeader: false },
                        ],
                        isHeader: false,
                    },
                ],
                hasHeaders: true,
                columns: 2,
            };

            const validation = formatter.validateTable(table);

            expect(validation.valid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });
    });

    describe('cleanTableHtml', () => {
        it('should remove extra attributes', () => {
            const html = '<table width="100%" style="border: 1px solid"><tr><td width="50%">Cell</td></tr></table>';
            const cleaned = formatter.cleanTableHtml(html);

            expect(cleaned).not.toContain('width="100%"');
            expect(cleaned).not.toContain('style="border');
        });

        it('should preserve class attribute on table', () => {
            const html = '<table class="data-table" width="100%"><tr><td>Cell</td></tr></table>';
            const cleaned = formatter.cleanTableHtml(html);

            expect(cleaned).toContain('class="data-table"');
        });
    });

    describe('optimizeTable', () => {
        it('should remove empty rows', () => {
            const table = {
                rows: [
                    {
                        cells: [{ text: 'Value', colspan: 1, rowspan: 1, isHeader: false }],
                        isHeader: false,
                    },
                    {
                        cells: [{ text: '', colspan: 1, rowspan: 1, isHeader: false }],
                        isHeader: false,
                    },
                ],
                hasHeaders: false,
                columns: 1,
            };

            const optimized = formatter.optimizeTable(table);

            expect(optimized.rows).toHaveLength(1);
        });

        it('should handle table with all content', () => {
            const table = {
                rows: [
                    {
                        cells: [
                            { text: 'A', colspan: 1, rowspan: 1, isHeader: true },
                            { text: 'B', colspan: 1, rowspan: 1, isHeader: true },
                        ],
                        isHeader: true,
                    },
                ],
                hasHeaders: true,
                columns: 2,
            };

            const optimized = formatter.optimizeTable(table);

            expect(optimized.rows).toHaveLength(1);
        });
    });
});

/**
 * Table Processor
 * Optimizes table formatting and converts to Markdown
 */

interface TableCell {
  text: string;
  colspan: number;
  rowspan: number;
  isHeader: boolean;
  alignment?: 'left' | 'center' | 'right';
}

interface TableRow {
  cells: TableCell[];
  isHeader: boolean;
}

interface Table {
  rows: TableRow[];
  hasHeaders: boolean;
  columns: number;
}

export class TableFormatter {
  /**
   * Process HTML tables and convert to optimized Markdown
   */
  processTables(html: string): string {
    // Find all <table> tags
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;

    return html.replace(tableRegex, (match) => {
      const table = this.parseTable(match);
      return this.convertTableToMarkdown(table);
    });
  }

  /**
   * Parse HTML table into structured format
   */
  private parseTable(html: string): Table {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const tableElement = doc.querySelector('table');

    if (!tableElement) {
      return {
        rows: [],
        hasHeaders: false,
        columns: 0,
      };
    }

    const rows: TableRow[] = [];
    const headerRows = Array.from(tableElement.querySelectorAll('thead tr'));
    const bodyRows = Array.from(tableElement.querySelectorAll('tbody tr, tr:not(thead tr)'));

    // Process header rows
    let hasHeaders = false;
    for (const rowElement of [...headerRows, ...bodyRows]) {
      const cells = Array.from(rowElement.querySelectorAll('td, th'));
      const isHeaderRow = rowElement.parentElement?.tagName === 'THEAD' ||
        cells.every(cell => cell.tagName === 'TH');

      if (isHeaderRow && !hasHeaders && cells.length > 0) {
        hasHeaders = true;
      }

      const row = this.parseRow(cells, isHeaderRow);
      rows.push(row);
    }

    // Determine column count
    const columns = Math.max(...rows.map(r => r.cells.reduce((sum, cell) => sum + cell.colspan, 0)));

    return {
      rows,
      hasHeaders,
      columns,
    };
  }

  /**
   * Parse table row
   */
  private parseRow(cellElements: Element[], isHeader: boolean): TableRow {
    const cells: TableCell[] = [];

    for (const cellElement of cellElements) {
      const text = this.cleanCellText(cellElement.textContent || '');
      const colspan = parseInt(cellElement.getAttribute('colspan') || '1', 10);
      const rowspan = parseInt(cellElement.getAttribute('rowspan') || '1', 10);
      const isHeader = cellElement.tagName === 'TH' || isHeader;

      // Detect alignment from style or class
      const alignment = this.detectAlignment(cellElement);

      cells.push({
        text,
        colspan,
        rowspan,
        isHeader,
        alignment,
      });
    }

    return { cells, isHeader };
  }

  /**
   * Clean cell text
   */
  private cleanCellText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\|/g, '\\|'); // Escape pipe characters
  }

  /**
   * Detect cell alignment
   */
  private detectAlignment(cell: Element): 'left' | 'center' | 'right' | undefined {
    const style = cell.getAttribute('style') || '';
    const className = cell.getAttribute('class') || '';

    // Check style attribute
    if (style.includes('text-align:center') || className.includes('text-center')) {
      return 'center';
    }
    if (style.includes('text-align:right') || className.includes('text-right')) {
      return 'right';
    }
    if (style.includes('text-align:left') || className.includes('text-left')) {
      return 'left';
    }

    return undefined;
  }

  /**
   * Convert table to Markdown
   */
  private convertTableToMarkdown(table: Table): string {
    if (table.rows.length === 0) {
      return '';
    }

    const lines: string[] = [];

    // Find the first row with maximum columns as header
    let headerRow: TableRow | undefined;
    let maxRowCols = 0;

    for (const row of table.rows) {
      const rowCols = row.cells.reduce((sum, cell) => sum + cell.colspan, 0);
      if (rowCols > maxRowCols) {
        maxRowCols = rowCols;
        headerRow = row;
      }
    }

    if (!headerRow) {
      return '';
    }

    // Generate header row
    const headerCells = this.expandRow(headerRow);
    lines.push('| ' + headerCells.map(cell => cell.text || '').join(' | ') + ' |');

    // Generate separator row
    const separator = headerCells.map(cell => {
      const align = cell.alignment || 'left';
      switch (align) {
        case 'center':
          return ':---:';
        case 'right':
          return '---:';
        default:
          return '---';
      }
    });
    lines.push('| ' + separator.join(' | ') + ' |');

    // Generate body rows
    for (const row of table.rows) {
      if (row === headerRow) continue;

      const cells = this.expandRow(row);
      const line = '| ' + cells.map(cell => cell.text || '').join(' | ') + ' |';
      lines.push(line);
    }

    return lines.join('\n') + '\n\n';
  }

  /**
   * Expand row considering colspan and rowspan
   */
  private expandRow(row: TableRow): TableCell[] {
    const expanded: TableCell[] = [];

    for (const cell of row.cells) {
      // Add empty cells for colspan
      for (let i = 0; i < cell.colspan; i++) {
        expanded.push({
          ...cell,
          text: i === 0 ? cell.text : '',
          colspan: 1,
        });
      }
    }

    return expanded;
  }

  /**
   * Optimize table structure
   */
  optimizeTable(table: Table): Table {
    // Remove empty rows
    const filteredRows = table.rows.filter(row =>
      row.cells.some(cell => cell.text.length > 0)
    );

    // Remove empty columns
    if (filteredRows.length > 0) {
      const maxCols = Math.max(...filteredRows.map(row =>
        row.cells.reduce((sum, cell) => sum + cell.colspan, 0)
      ));

      const nonEmptyCols: number[] = [];
      for (let col = 0; col < maxCols; col++) {
        for (const row of filteredRows) {
          const expanded = this.expandRow(row);
          if (expanded[col] && expanded[col].text.length > 0) {
            nonEmptyCols.push(col);
            break;
          }
        }
      }

      // Filter cells
      const optimizedRows = filteredRows.map(row => {
        const expanded = this.expandRow(row);
        const filteredCells = expanded.filter((_, index) => nonEmptyCols.includes(index));
        return {
          ...row,
          cells: filteredCells,
        };
      });

      return {
        rows: optimizedRows,
        hasHeaders: table.hasHeaders,
        columns: nonEmptyCols.length,
      };
    }

    return {
      rows: filteredRows,
      hasHeaders: table.hasHeaders,
      columns: table.columns,
    };
  }

  /**
   * Detect tables in HTML content
   */
  detectTables(html: string): boolean {
    return /<table[^>]*>/i.test(html);
  }

  /**
   * Count tables in content
   */
  countTables(html: string): number {
    const matches = html.match(/<table[^>]*>/gi);
    return matches ? matches.length : 0;
  }

  /**
   * Extract table data
   */
  extractTableData(html: string): any[][] {
    const table = this.parseTable(html);
    const data: any[][] = [];

    for (const row of table.rows) {
      const rowData: any[] = [];
      const cells = this.expandRow(row);

      for (const cell of cells) {
        rowData.push(cell.text);
      }

      data.push(rowData);
    }

    return data;
  }

  /**
   * Convert array data to Markdown table
   */
  arrayToMarkdownTable(data: any[][], headers?: string[]): string {
    if (data.length === 0) {
      return '';
    }

    const rows: string[][] = [];

    // Add header row if provided
    if (headers && headers.length > 0) {
      rows.push(headers);
    } else if (data.length > 0) {
      // Use first row as header
      rows.push(data[0].map(String));
      data = data.slice(1);
    }

    // Add data rows
    for (const row of data) {
      rows.push(row.map(String));
    }

    // Build Markdown table
    const lines: string[] = [];

    // Header
    lines.push('| ' + rows[0].join(' | ') + ' |');

    // Separator
    const colCount = rows[0].length;
    lines.push('| ' + Array(colCount).fill('---').join(' | ') + ' |');

    // Data rows
    for (let i = 1; i < rows.length; i++) {
      lines.push('| ' + rows[i].join(' | ') + ' |');
    }

    return lines.join('\n') + '\n\n';
  }

  /**
   * Clean table HTML
   */
  cleanTableHtml(html: string): string {
    let cleaned = html;

    // Remove table attributes except class
    cleaned = cleaned.replace(/<table[^>]*>/gi, (match) => {
      const classMatch = match.match(/class=["']([^"']*)["']/i);
      const classAttr = classMatch ? ` class="${classMatch[1]}"` : '';
      return '<table' + classAttr + '>';
    });

    // Remove width, height, style attributes from cells
    cleaned = cleaned.replace(/\s+(width|height|style)=["'][^"']*["']/gi, '');

    // Remove nested tables warning
    cleaned = cleaned.replace(/<table[^>]*>.*?<table[^>]*>/gi, (match) => {
      console.warn('Nested tables detected, may not convert correctly');
      return match;
    });

    return cleaned;
  }

  /**
   * Validate table structure
   */
  validateTable(table: Table): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (table.rows.length === 0) {
      errors.push('Table has no rows');
      return { valid: false, errors };
    }

    // Check for inconsistent column counts
    const colCounts = table.rows.map(row =>
      row.cells.reduce((sum, cell) => sum + cell.colspan, 0)
    );

    const maxCols = Math.max(...colCounts);
    const minCols = Math.min(...colCounts);

    if (maxCols !== minCols) {
      errors.push(`Table has inconsistent column counts: min=${minCols}, max=${maxCols}`);
    }

    // Check for overly wide tables
    if (maxCols > 20) {
      errors.push(`Table is very wide: ${maxCols} columns`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

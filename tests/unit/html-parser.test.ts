/**
 * Unit Tests for HTMLParser
 */

import { describe, it, expect } from 'vitest';
import { HTMLParser } from '@/core/parsers/html-parser';
import type { ConversionOptions } from '@/types';

describe('HTMLParser', () => {
  const parser = new HTMLParser();
  const defaultOptions: ConversionOptions = {
    format: 'markdown',
    includeMetadata: true,
    preserveFormatting: true,
    downloadImages: false,
    mathJax: false,
    codeHighlight: true,
  };

  describe('canParse', () => {
    it('should accept HTML content types', () => {
      expect(parser.canParse('', 'text/html')).toBe(true);
      expect(parser.canParse('', 'application/xhtml+xml')).toBe(true);
    });

    it('should reject non-HTML content types', () => {
      expect(parser.canParse('', 'application/pdf')).toBe(false);
      expect(parser.canParse('', 'text/plain')).toBe(false);
    });
  });

  describe('parse', () => {
    it('should convert headings correctly', async () => {
      const html = '<h1>Title</h1><h2>Subtitle</h2><h3>Section</h3>';
      const result = await parser.parse(html, defaultOptions);

      expect(result.markdown).toContain('# Title');
      expect(result.markdown).toContain('## Subtitle');
      expect(result.markdown).toContain('### Section');
    });

    it('should convert bold and italic text', async () => {
      const html = '<p>This is <strong>bold</strong> and <em>italic</em> text.</p>';
      const result = await parser.parse(html, defaultOptions);

      expect(result.markdown).toContain('**bold**');
      expect(result.markdown).toContain('*italic*');
    });

    it('should convert links correctly', async () => {
      const html = '<a href="https://example.com">Example</a>';
      const result = await parser.parse(html, defaultOptions);

      expect(result.markdown).toContain('[Example](https://example.com)');
    });

    it('should convert images with alt text', async () => {
      const html = '<img src="image.jpg" alt="Example Image">';
      const result = await parser.parse(html, defaultOptions);

      expect(result.markdown).toContain('![Example Image](image.jpg)');
    });

    it('should convert inline code', async () => {
      const html = '<p>Use <code>const x = 1;</code> in JavaScript.</p>';
      const result = await parser.parse(html, defaultOptions);

      expect(result.markdown).toContain('`const x = 1;`');
    });

    it('should convert code blocks with language', async () => {
      const html = '<pre><code class="language-javascript">const x = 1;</code></pre>';
      const result = await parser.parse(html, defaultOptions);

      expect(result.markdown).toContain('```javascript');
      expect(result.markdown).toContain('const x = 1;');
      expect(result.markdown).toContain('```');
    });

    it('should convert unordered lists', async () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>';
      const result = await parser.parse(html, defaultOptions);

      expect(result.markdown).toContain('-   Item 1');
      expect(result.markdown).toContain('-   Item 2');
      expect(result.markdown).toContain('-   Item 3');
    });

    it('should convert ordered lists', async () => {
      const html = '<ol><li>First</li><li>Second</li><li>Third</li></ol>';
      const result = await parser.parse(html, defaultOptions);

      expect(result.markdown).toMatch(/\d+\.\s*First/);
    });

    it('should convert blockquotes', async () => {
      const html = '<blockquote>This is a quote</blockquote>';
      const result = await parser.parse(html, defaultOptions);

      expect(result.markdown).toContain('> This is a quote');
    });

    it('should convert tables', async () => {
      const html = `
        <table>
          <tr><th>Name</th><th>Age</th></tr>
          <tr><td>John</td><td>25</td></tr>
        </table>
      `;
      const result = await parser.parse(html, defaultOptions);

      expect(result.markdown).toContain('| Name |');
      expect(result.markdown).toContain('| Age |');
      expect(result.markdown).toContain('| John |');
      expect(result.markdown).toContain('| 25 |');
    });

    it('should handle nested lists', async () => {
      const html = '<ul><li>Item 1<ul><li>Subitem 1</li><li>Subitem 2</li></ul></li></ul>';
      const result = await parser.parse(html, defaultOptions);

      expect(result.markdown).toContain('-   Item 1');
      expect(result.markdown).toMatch(/\s+-\s+Subitem/);
    });

    it('should extract title from HTML', async () => {
      const html = '<title>Test Page</title><h1>Content</h1>';
      const result = await parser.parse(html, defaultOptions);

      expect(result.title).toBe('Test Page');
    });

    it('should extract title from h1 if no title tag', async () => {
      const html = '<h1>Main Heading</h1><p>Content</p>';
      const result = await parser.parse(html, defaultOptions);

      expect(result.title).toBe('Main Heading');
    });

    it('should extract metadata', async () => {
      const html = `
        <html>
          <head>
            <title>Test</title>
            <meta name="author" content="John Doe">
            <meta name="keywords" content="test, markdown, parser">
          </head>
          <body>
            <p>This is a test paragraph with multiple words. It should count correctly.</p>
            <img src="test.jpg" alt="Test Image">
            <pre><code>console.log('test');</code></pre>
          </body>
        </html>
      `;
      const result = await parser.parse(html, defaultOptions);

      expect(result.metadata?.author).toBe('John Doe');
      expect(result.metadata?.tags).toEqual(['test', 'markdown', 'parser']);
      expect(result.metadata?.wordCount).toBeGreaterThan(0);
      expect(result.metadata?.imageCount).toBe(1);
      expect(result.metadata?.codeBlocks).toBe(1);
    });

    it('should clean up excessive whitespace', async () => {
      const html = '<p>Paragraph 1</p><p>Paragraph 2</p>';
      const result = await parser.parse(html, defaultOptions);

      // Should not have more than 2 consecutive newlines
      expect(result.markdown).not.toContain('\n\n\n');
    });

    it('should handle empty HTML', async () => {
      const result = await parser.parse('', defaultOptions);

      expect(result.markdown).toBe('');
    });

    it('should handle complex HTML structure', async () => {
      const html = `
        <article>
          <header>
            <h1>Article Title</h1>
            <p class="meta">By <span class="author">John Doe</span></p>
          </header>
          <section>
            <h2>Introduction</h2>
            <p>This is the <strong>introduction</strong> paragraph.</p>
            <h3>Key Points</h3>
            <ul>
              <li>Point 1</li>
              <li>Point 2</li>
            </ul>
          </section>
          <section>
            <h2>Code Example</h2>
            <pre><code class="language-javascript">function hello() {
  return 'Hello, World!';
}</code></pre>
          </section>
        </article>
      `;
      const result = await parser.parse(html, defaultOptions);

      expect(result.markdown).toContain('# Article Title');
      expect(result.markdown).toContain('## Introduction');
      expect(result.markdown).toContain('**introduction**');
      expect(result.markdown).toContain('### Key Points');
      expect(result.markdown).toContain('-   Point 1');
      expect(result.markdown).toContain('```javascript');
      expect(result.markdown).toContain("return 'Hello, World!'");
    });
  });

  describe('edge cases', () => {
    it('should handle malformed HTML', async () => {
      const html = '<p>Unclosed paragraph<div>Nested content</p>';
      const result = await parser.parse(html, defaultOptions);

      expect(result.markdown).toBeDefined();
      expect(result.markdown.length).toBeGreaterThan(0);
    });

    it('should handle special characters', async () => {
      const html = '<p>Special chars: &lt; &gt; &amp; &quot; &#39;</p>';
      const result = await parser.parse(html, defaultOptions);

      expect(result.markdown).toContain('<');
      expect(result.markdown).toContain('>');
      expect(result.markdown).toContain('&');
      expect(result.markdown).toContain('"');
      expect(result.markdown).toContain("'");
    });

    it('should handle deep nesting', async () => {
      const html = '<div><div><div><div><p>Deep content</p></div></div></div></div>';
      const result = await parser.parse(html, defaultOptions);

      expect(result.markdown).toContain('Deep content');
    });

    it('should handle script and style tags removal', async () => {
      const html = `
        <script>alert('test');</script>
        <style>.test { color: red; }</style>
        <p>Content</p>
      `;
      const result = await parser.parse(html, defaultOptions);

      expect(result.markdown).not.toContain('alert');
      expect(result.markdown).not.toContain('color: red');
      expect(result.markdown).toContain('Content');
    });

    it('should handle HTML comments removal', async () => {
      const html = '<p>Before</p><!-- This is a comment --><p>After</p>';
      const result = await parser.parse(html, defaultOptions);

      expect(result.markdown).not.toContain('<!--');
      expect(result.markdown).toContain('Before');
      expect(result.markdown).toContain('After');
    });
  });
});

/**
 * Unit Tests for NoiseFilter
 */

import { describe, it, expect } from 'vitest';
import { NoiseFilter } from '@/core/processors/noise-filter';

// Mock JSDOM environment
const { JSDOM } = require('jsdom');

describe('NoiseFilter', () => {
  let filter: NoiseFilter;
  let dom: JSDOM;
  let document: Document;

  beforeEach(() => {
    // Setup JSDOM
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
    filter = new NoiseFilter();
  });

  describe('clean', () => {
    it('should remove invisible elements', () => {
      const html = `
        <div>
          <p>Visible content</p>
          <p style="display: none;">Hidden content</p>
          <p style="visibility: hidden;">Invisible content</p>
          <p style="opacity: 0;">Transparent content</p>
        </div>
      `;
      document.body.innerHTML = html;

      const result = filter.clean(html);
      const resultDom = new JSDOM(result);
      const resultDocument = resultDom.window.document;

      expect(resultDocument.body.textContent).toContain('Visible content');
      expect(resultDocument.body.textContent).not.toContain('Hidden content');
      expect(resultDocument.body.textContent).not.toContain('Invisible content');
      expect(resultDocument.body.textContent).not.toContain('Transparent content');
    });

    it('should remove empty elements', () => {
      const html = `
        <div>
          <p>Content</p>
          <div></div>
          <span></span>
          <p>More content</p>
        </div>
      `;
      document.body.innerHTML = html;

      const result = filter.clean(html);
      const resultDom = new JSDOM(result);
      const resultDocument = resultDom.window.document;

      // Empty divs and spans should be removed
      const emptyDivs = resultDocument.querySelectorAll('div:empty');
      const emptySpans = resultDocument.querySelectorAll('span:empty');

      expect(emptyDivs.length).toBe(0);
      expect(emptySpans.length).toBe(0);
    });

    it('should preserve elements with images', () => {
      const html = `
        <div>
          <img src="test.jpg" alt="Test">
        </div>
      `;
      document.body.innerHTML = html;

      const result = filter.clean(html);
      const resultDom = new JSDOM(result);
      const resultDocument = resultDom.window.document;

      expect(resultDocument.querySelector('img')).not.toBeNull();
    });

    it('should clean attributes', () => {
      const html = `
        <div class="container" id="main" style="color: red;" onclick="alert('test')" data-value="123">
          <p>Content</p>
        </div>
      `;
      document.body.innerHTML = html;

      const result = filter.clean(html);
      const resultDom = new JSDOM(result);
      const resultDocument = resultDom.window.document;
      const div = resultDocument.querySelector('div') as HTMLElement;

      // Should keep class and id
      expect(div.getAttribute('class')).toBe('container');
      expect(div.getAttribute('id')).toBe('main');

      // Should remove style and onclick
      expect(div.getAttribute('style')).toBeNull();
      expect(div.getAttribute('onclick')).toBeNull();

      // Should keep data-* attributes
      expect(div.getAttribute('data-value')).toBe('123');
    });
  });

  describe('removeNoiseByPattern', () => {
    it('should remove script tags', () => {
      const html = `
        <div>
          <p>Content</p>
          <script>alert('test');</script>
          <p>More content</p>
        </div>
      `;
      document.body.innerHTML = html;

      const result = filter.removeNoiseByPattern(html);

      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
      expect(result).toContain('Content');
    });

    it('should remove style tags', () => {
      const html = `
        <div>
          <p>Content</p>
          <style>.test { color: red; }</style>
          <p>More content</p>
        </div>
      `;
      document.body.innerHTML = html;

      const result = filter.removeNoiseByPattern(html);

      expect(result).not.toContain('<style>');
      expect(result).not.toContain('color: red');
      expect(result).toContain('Content');
    });

    it('should remove HTML comments', () => {
      const html = `
        <div>
          <p>Before</p>
          <!-- This is a comment -->
          <p>After</p>
        </div>
      `;
      document.body.innerHTML = html;

      const result = filter.removeNoiseByPattern(html);

      expect(result).not.toContain('<!--');
      expect(result).toContain('Before');
      expect(result).toContain('After');
    });

    it('should remove noscript tags', () => {
      const html = `
        <div>
          <p>Content</p>
          <noscript>Enable JavaScript</noscript>
          <p>More content</p>
        </div>
      `;
      document.body.innerHTML = html;

      const result = filter.removeNoiseByPattern(html);

      expect(result).not.toContain('<noscript>');
      expect(result).not.toContain('Enable JavaScript');
    });
  });

  describe('cleanUrls', () => {
    it('should remove tracking parameters', () => {
      const html = `
        <a href="https://example.com?utm_source=test&utm_medium=email&param=keep">Link</a>
      `;
      document.body.innerHTML = html;

      const result = filter.cleanUrls(html);
      const resultDom = new JSDOM(result);
      const resultDocument = resultDom.window.document;
      const link = resultDocument.querySelector('a') as HTMLAnchorElement;

      expect(link.href).toContain('param=keep');
      expect(link.href).not.toContain('utm_source');
      expect(link.href).not.toContain('utm_medium');
    });

    it('should remove facebook tracking', () => {
      const html = `
        <a href="https://example.com?fbclid=abc123">Link</a>
      `;
      document.body.innerHTML = html;

      const result = filter.cleanUrls(html);
      const resultDom = new JSDOM(result);
      const resultDocument = resultDom.window.document;
      const link = resultDocument.querySelector('a') as HTMLAnchorElement;

      expect(link.href).not.toContain('fbclid');
    });

    it('should handle invalid URLs gracefully', () => {
      const html = `<a href="not-a-url">Link</a>`;
      document.body.innerHTML = html;

      const result = filter.cleanUrls(html);

      expect(result).toContain('not-a-url');
    });
  });

  describe('sanitize', () => {
    it('should remove event handlers', () => {
      const html = `
        <div onclick="alert('click')" onmouseover="alert('hover')">
          <p>Content</p>
        </div>
      `;
      document.body.innerHTML = html;

      const result = filter.sanitize(html);
      const resultDom = new JSDOM(result);
      const resultDocument = resultDom.window.document;
      const div = resultDocument.querySelector('div') as HTMLElement;

      expect(div.getAttribute('onclick')).toBeNull();
      expect(div.getAttribute('onmouseover')).toBeNull();
    });

    it('should remove javascript: URLs', () => {
      const html = `<a href="javascript:alert('xss')">Link</a>`;
      document.body.innerHTML = html;

      const result = filter.sanitize(html);
      const resultDom = new JSDOM(result);
      const resultDocument = resultDom.window.document;
      const link = resultDocument.querySelector('a') as HTMLAnchorElement;

      expect(link.getAttribute('href')).toBeNull();
    });

    it('should preserve safe attributes', () => {
      const html = `
        <a href="https://example.com" class="link" id="test-link">Link</a>
      `;
      document.body.innerHTML = html;

      const result = filter.sanitize(html);
      const resultDom = new JSDOM(result);
      const resultDocument = resultDom.window.document;
      const link = resultDocument.querySelector('a') as HTMLElement;

      expect(link.getAttribute('href')).toBe('https://example.com');
      expect(link.getAttribute('class')).toBe('link');
      expect(link.getAttribute('id')).toBe('test-link');
    });
  });

  describe('integration', () => {
    it('should handle complex real-world HTML', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <script>alert('xss');</script>
            <style>.test { color: red; }</style>
          </head>
          <body>
            <nav class="navbar">Navigation</nav>
            <div class="sidebar">
              <a href="javascript:void(0)">Bad Link</a>
            </div>
            <main class="content">
              <article>
                <h1>Main Article</h1>
                <p>This is the main content.</p>
                <div class="advertisement" style="display: block;">Ad</div>
                <p>More content.</p>
              </article>
            </main>
            <footer>Footer content</footer>
          </body>
        </html>
      `;
      document.body.innerHTML = html;

      const cleaned = filter.clean(html);
      const resultDom = new JSDOM(cleaned);
      const resultDocument = resultDom.window.document;

      // Scripts and styles removed
      expect(cleaned).not.toContain('alert');
      expect(cleaned).not.toContain('color: red');

      // Main content preserved
      expect(resultDocument.body.textContent).toContain('Main Article');
      expect(resultDocument.body.textContent).toContain('main content');
    });
  });
});

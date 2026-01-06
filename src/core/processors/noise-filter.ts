/**
 * Noise Filter
 * Removes noise and unwanted elements from HTML content
 */

export class NoiseFilter {
  /**
   * Clean HTML content by removing noise
   */
  clean(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const body = doc.body;

    // Apply all cleaning steps
    this.removeInvisibleElements(body);
    this.removeEmptyElements(body);
    this.removeDuplicateAttributes(body);
    this.cleanAttributes(body);
    this.normalizeWhitespace(body);

    return body.innerHTML;
  }

  /**
   * Remove invisible elements
   */
  private removeInvisibleElements(element: HTMLElement): void {
    const elements = element.querySelectorAll('*');
    const toRemove: HTMLElement[] = [];

    elements.forEach(el => {
      const htmlEl = el as HTMLElement;
      const style = htmlEl.style;
      const computedStyle = window.getComputedStyle?.(htmlEl);

      const isHidden =
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.opacity === '0' ||
        computedStyle?.display === 'none' ||
        computedStyle?.visibility === 'hidden' ||
        computedStyle?.opacity === '0' ||
        htmlEl.getAttribute('aria-hidden') === 'true' ||
        htmlEl.hidden === true;

      if (isHidden) {
        toRemove.push(htmlEl);
      }
    });

    toRemove.forEach(el => el.remove());
  }

  /**
   * Remove empty elements
   */
  private removeEmptyElements(element: HTMLElement): void {
    const elements = element.querySelectorAll('*');
    const toRemove: HTMLElement[] = [];

    elements.forEach(el => {
      const htmlEl = el as HTMLElement;
      const hasText = (htmlEl.textContent?.trim().length || 0) > 0;
      const hasImage = htmlEl.querySelector('img, svg, canvas, video') !== null;
      const hasBr = htmlEl.querySelector('br') !== null;
      const hasInput = htmlEl.querySelector('input, textarea, select') !== null;

      // Skip elements that are commonly empty by design
      const tagName = htmlEl.tagName.toLowerCase();
      const isVoidElement = ['br', 'hr', 'img', 'input', 'area', 'base', 'col', 'embed', 'link', 'meta', 'source', 'track', 'wbr'].includes(tagName);

      if (!isVoidElement && !hasText && !hasImage && !hasBr && !hasInput) {
        toRemove.push(htmlEl);
      }
    });

    toRemove.forEach(el => el.remove());
  }

  /**
   * Remove duplicate attributes
   */
  private removeDuplicateAttributes(element: HTMLElement): void {
    const elements = element.querySelectorAll('*');

    elements.forEach(el => {
      const htmlEl = el as HTMLElement;
      const seenAttributes = new Set<string>();

      // Get all attributes
      const attrs = Array.from(htmlEl.attributes);

      // Remove duplicates
      attrs.forEach(attr => {
        if (seenAttributes.has(attr.name)) {
          htmlEl.removeAttribute(attr.name);
        } else {
          seenAttributes.add(attr.name);
        }
      });
    });
  }

  /**
   * Clean attributes, keeping only essential ones
   */
  private cleanAttributes(element: HTMLElement): void {
    // Allowed attributes for different elements
    const allowedAttributes = {
      global: ['class', 'id', 'title'],
      a: ['href', 'target', 'rel', 'download'],
      img: ['src', 'alt', 'title', 'loading', 'width', 'height'],
      video: ['src', 'poster', 'controls', 'loop', 'muted', 'autoplay'],
      audio: ['src', 'controls', 'loop', 'muted', 'autoplay'],
      iframe: ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen'],
      source: ['src', 'type'],
      td: ['colspan', 'rowspan', 'headers'],
      th: ['colspan', 'rowspan', 'headers', 'scope'],
      time: ['datetime'],
      data: ['value', 'data-type'],
      code: ['class'],
      pre: ['class'],
    };

    const elements = element.querySelectorAll('*');

    elements.forEach(el => {
      const htmlEl = el as HTMLElement;
      const tagName = el.tagName.toLowerCase();
      const attrs = Array.from(htmlEl.attributes);

      // Get allowed attributes for this element
      const allowed = [
        ...allowedAttributes.global,
        ...(allowedAttributes[tagName as keyof typeof allowedAttributes] || []),
      ];

      // Remove disallowed attributes
      attrs.forEach(attr => {
        // Keep data-* attributes
        if (attr.name.startsWith('data-')) {
          return;
        }

        // Keep aria-* attributes
        if (attr.name.startsWith('aria-')) {
          return;
        }

        // Remove if not in allowed list
        if (!allowed.includes(attr.name)) {
          htmlEl.removeAttribute(attr.name);
        }
      });
    });
  }

  /**
   * Normalize whitespace
   */
  private normalizeWhitespace(element: HTMLElement): void {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );

    const textNodes: Text[] = [];
    let node: Node | null;

    while ((node = walker.nextNode())) {
      textNodes.push(node as Text);
    }

    textNodes.forEach(textNode => {
      // Normalize whitespace within text nodes
      textNode.nodeValue = textNode.nodeValue?.trim().replace(/\s+/g, ' ') || '';
    });
  }

  /**
   * Remove specific noise patterns
   */
  removeNoiseByPattern(html: string): string {
    let cleaned = html;

    // Remove script tags
    cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove style tags
    cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Remove comments
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

    // Remove noscript tags
    cleaned = cleaned.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '');

    return cleaned;
  }

  /**
   * Remove tracking parameters from URLs
   */
  cleanUrls(html: string): string {
    const trackingParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'fbclid',
      'gclid',
      'msclkid',
    ];

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const links = doc.querySelectorAll('a[href]');

    links.forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;

      try {
        const url = new URL(href);
        let modified = false;

        trackingParams.forEach(param => {
          if (url.searchParams.has(param)) {
            url.searchParams.delete(param);
            modified = true;
          }
        });

        if (modified) {
          link.setAttribute('href', url.toString());
        }
      } catch {
        // Invalid URL, skip
      }
    });

    return doc.body.innerHTML;
  }

  /**
   * Sanitize HTML content
   */
  sanitize(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const body = doc.body;

    // Remove all event handlers
    const elements = body.querySelectorAll('*');
    elements.forEach(el => {
      const htmlEl = el as HTMLElement;
      const attrs = Array.from(htmlEl.attributes);

      attrs.forEach(attr => {
        // Remove on* attributes (event handlers)
        if (attr.name.startsWith('on')) {
          htmlEl.removeAttribute(attr.name);
        }

        // Remove javascript: URLs
        if (attr.name === 'href' && attr.value?.startsWith('javascript:')) {
          htmlEl.removeAttribute('href');
        }
      });
    });

    return body.innerHTML;
  }
}

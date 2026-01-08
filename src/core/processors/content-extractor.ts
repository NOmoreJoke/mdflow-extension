/**
 * Content Extractor
 * Implements Readability-style algorithm to extract main content from web pages
 */

export class ContentExtractor {
  private readonly minContentLength = 200;
  private readonly minScore = 20;

  /**
   * Extract main content from a document
   */
  extractMainContent(document: Document): HTMLElement {
    // Remove unwanted elements first
    this.removeNoise(document.body);

    // Find candidate containers
    const candidates = this.findCandidates(document.body);

    // Score each candidate
    const scoredCandidates = candidates.map(el => ({
      element: el,
      score: this.calculateContentScore(el),
    }));

    // Sort by score descending
    scoredCandidates.sort((a, b) => b.score - a.score);

    // Return the highest scoring candidate
    if (scoredCandidates.length > 0 && scoredCandidates[0].score >= this.minScore) {
      return scoredCandidates[0].element;
    }

    // Fallback: return body if no good candidate found
    return document.body;
  }

  /**
   * Find potential content containers
   */
  private findCandidates(root: HTMLElement): HTMLElement[] {
    const candidates: HTMLElement[] = [];
    const contentSelectors = [
      'article',
      '[role="main"]',
      'main',
      '.content',
      '.post',
      '.article',
      '.entry-content',
      '#content',
      '.main-content',
      '.post-content',
      '.article-content',
      'article',
    ];

    // Try semantic selectors first
    for (const selector of contentSelectors) {
      const element = root.querySelector(selector);
      if (element && element.textContent && element.textContent.length >= this.minContentLength) {
        candidates.push(element as HTMLElement);
      }
    }

    // If no candidates found, look for divs with substantial content
    if (candidates.length === 0) {
      const allDivs = root.querySelectorAll('div');
      for (const div of allDivs) {
        const textLength = div.textContent?.length || 0;
        if (textLength >= this.minContentLength) {
          candidates.push(div as HTMLElement);
        }
      }
    }

    return candidates;
  }

  /**
   * Calculate content score for an element
   * Based on text length, link density, and punctuation
   */
  private calculateContentScore(element: HTMLElement): number {
    const textLength = element.textContent?.length || 0;
    if (textLength === 0) return 0;

    // Calculate link density (penalize elements with too many links)
    const linkDensity = this.calculateLinkDensity(element);

    // Count punctuation (commas, periods indicate content)
    const text = element.textContent || '';
    const commaCount = (text.match(/,/g) || []).length;
    const periodCount = (text.match(/\./g) || []).length;
    const questionCount = (text.match(/\?/g) || []).length;
    const exclamationCount = (text.match(/!/g) || []).length;
    const punctuationCount = commaCount + periodCount + questionCount + exclamationCount;

    // Base score from text length, penalized by link density
    let score = textLength * (1 - linkDensity);

    // Bonus for punctuation (indicates real content)
    score += punctuationCount * 10;

    // Bonus for paragraphs
    const paragraphCount = element.querySelectorAll('p').length;
    score += paragraphCount * 5;

    // Bonus for images (content images)
    const imageCount = element.querySelectorAll('img').length;
    score += imageCount * 3;

    // Bonus for headings
    const headingCount = element.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
    score += headingCount * 10;

    // Penalty for too many links relative to content
    if (linkDensity > 0.5) {
      score *= 0.5;
    }

    return Math.max(0, score);
  }

  /**
   * Calculate link density
   * Returns the ratio of link text length to total text length
   */
  private calculateLinkDensity(element: HTMLElement): number {
    const links = element.querySelectorAll('a');
    let linkLength = 0;

    links.forEach(link => {
      linkLength += link.textContent?.length || 0;
    });

    const textLength = element.textContent?.length || 1;
    return linkLength / textLength;
  }

  /**
   * Remove noise elements from the document
   */
  private removeNoise(element: HTMLElement): void {
    const noiseSelectors = [
      // Navigation
      'nav',
      '.nav',
      '.navigation',
      '.navbar',
      '.menu',
      '.breadcrumb',
      '.pagination',
      '.pager',

      // Headers and footers
      'header',
      'footer',
      '.header',
      '.footer',
      '.site-header',
      '.site-footer',

      // Sidebars
      '.sidebar',
      '.side-bar',
      '#sidebar',
      '.aside',
      'aside',

      // Comments
      '.comments',
      '.comment-list',
      '#comments',
      '.disqus',

      // Ads and social
      '.advertisement',
      '.ad',
      '.ads',
      '.advertisement-container',
      '.social-share',
      '.social-links',
      '.share-buttons',
      '.related-posts',
      '.recommended',
      '.sponsored',

      // Forms and interactive
      'form',
      '.form',
      '.search-form',
      '.subscribe',
      '.newsletter',

      // Media embeds
      'iframe',
      'embed',
      'object',

      // Scripts and styles
      'script',
      'style',
      'noscript',

      // Other common noise
      '.metadata',
      '.post-meta',
      '.entry-meta',
      '.byline',
      '.author-info',
      '.tags',
      '.categories',
      '.taxonomy',
    ];

    noiseSelectors.forEach(selector => {
      const elements = element.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });

    // Remove elements with hidden styling
    const allElements = element.querySelectorAll('*');
    allElements.forEach(el => {
      const htmlEl = el as HTMLElement;
      const style = htmlEl.style;

      // Try to get computed style, may fail on detached elements
      let computedStyle: CSSStyleDeclaration | null = null;
      try {
        if (typeof window !== 'undefined' && window.getComputedStyle) {
          computedStyle = window.getComputedStyle(htmlEl);
        }
      } catch {
        // getComputedStyle may throw on detached elements
      }

      if (
        style?.display === 'none' ||
        style?.visibility === 'hidden' ||
        style?.opacity === '0' ||
        computedStyle?.display === 'none' ||
        computedStyle?.visibility === 'hidden' ||
        computedStyle?.opacity === '0'
      ) {
        htmlEl.remove();
      }

      // Remove aria-hidden elements
      if (htmlEl.getAttribute('aria-hidden') === 'true') {
        htmlEl.remove();
      }
    });
  }

  /**
   * Clean up the extracted content
   */
  cleanupContent(element: HTMLElement): string {
    // Clone to avoid modifying original
    const clone = element.cloneNode(true) as HTMLElement;

    // Remove empty elements
    this.removeEmptyElements(clone);

    // Clean up attributes (keep only essential ones)
    this.cleanAttributes(clone);

    return clone.innerHTML;
  }

  /**
   * Remove empty elements
   */
  private removeEmptyElements(element: HTMLElement): void {
    const allElements = element.querySelectorAll('*');
    const toRemove: HTMLElement[] = [];

    allElements.forEach(el => {
      const htmlEl = el as HTMLElement;
      const hasText = htmlEl.textContent?.trim().length > 0;
      const hasImage = htmlEl.querySelector('img') !== null;
      const hasBr = htmlEl.querySelector('br') !== null;

      if (!hasText && !hasImage && !hasBr) {
        toRemove.push(htmlEl);
      }
    });

    toRemove.forEach(el => el.remove());
  }

  /**
   * Clean attributes, keeping only essential ones
   */
  private cleanAttributes(element: HTMLElement): void {
    const allowedAttributes = ['class', 'id', 'href', 'src', 'alt', 'title', 'colspan', 'rowspan'];
    const elements = element.querySelectorAll('*');

    elements.forEach(el => {
      const htmlEl = el as HTMLElement;
      const attrs = Array.from(htmlEl.attributes);

      attrs.forEach(attr => {
        if (!allowedAttributes.includes(attr.name)) {
          htmlEl.removeAttribute(attr.name);
        }
      });
    });
  }

  /**
   * Extract metadata from the document
   */
  extractMetadata(document: Document): {
    title?: string;
    author?: string;
    date?: string;
    description?: string;
    tags?: string[];
  } {
    const metadata: Record<string, any> = {};

    // Title
    const titleEl = document.querySelector('title');
    if (titleEl?.textContent) {
      metadata.title = titleEl.textContent.trim();
    }

    // Author
    const authorMeta = document.querySelector('meta[name="author"]');
    if (authorMeta?.getAttribute('content')) {
      metadata.author = authorMeta.getAttribute('content');
    }

    // Date
    const dateMeta = document.querySelector('meta[name="date"], meta[property="article:published_time"]');
    if (dateMeta?.getAttribute('content')) {
      metadata.date = dateMeta.getAttribute('content');
    }

    // Description
    const descMeta = document.querySelector('meta[name="description"], meta[property="og:description"]');
    if (descMeta?.getAttribute('content')) {
      metadata.description = descMeta.getAttribute('content');
    }

    // Tags/Keywords
    const keywordsMeta = document.querySelector('meta[name="keywords"], meta[name="tags"]');
    if (keywordsMeta?.getAttribute('content')) {
      metadata.tags = keywordsMeta.getAttribute('content')?.split(',').map(t => t.trim());
    }

    return metadata;
  }
}

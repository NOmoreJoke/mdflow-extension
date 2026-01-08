/**
 * Unit Tests for CodeFormatter
 */

import { describe, it, expect } from 'vitest';
import { CodeFormatter } from '@/core/processors/code-formatter';

describe('CodeFormatter', () => {
    const formatter = new CodeFormatter();

    describe('detectLanguage', () => {
        it('should detect JavaScript', () => {
            const code = `
        const x = 1;
        let y = 2;
        console.log(x + y);
        function add(a, b) {
          return a + b;
        }
      `;

            const lang = formatter.detectLanguage(code);
            expect(lang).toBe('javascript');
        });

        it('should detect TypeScript', () => {
            const code = `
        interface User {
          name: string;
          age: number;
        }
        const user: User = { name: 'John', age: 30 };
        type Status = 'active' | 'inactive';
      `;

            const lang = formatter.detectLanguage(code);
            expect(lang).toBe('typescript');
        });

        it('should detect Python', () => {
            const code = `
        def hello_world():
            print("Hello, World!")

        class MyClass:
            def __init__(self):
                pass

        if __name__ == "__main__":
            hello_world()
      `;

            const lang = formatter.detectLanguage(code);
            expect(lang).toBe('python');
        });

        it('should detect Java', () => {
            const code = `
        public class HelloWorld {
          public static void main(String[] args) {
            System.out.println("Hello, World!");
          }
        }
      `;

            const lang = formatter.detectLanguage(code);
            expect(lang).toBe('java');
        });

        it('should detect Go', () => {
            const code = `
        package main

        import "fmt"

        func main() {
          fmt.Println("Hello, World!")
        }
      `;

            const lang = formatter.detectLanguage(code);
            expect(lang).toBe('go');
        });

        it('should detect Rust', () => {
            const code = `
        fn main() {
          let x = 5;
          let mut y = 10;
          println!("Hello, World!");
        }

        struct Point {
          x: i32,
          y: i32,
        }
      `;

            const lang = formatter.detectLanguage(code);
            expect(lang).toBe('rust');
        });

        it('should detect SQL', () => {
            const code = `
        SELECT users.name, orders.total
        FROM users
        INNER JOIN orders ON users.id = orders.user_id
        WHERE orders.total > 100
        ORDER BY orders.total DESC;
      `;

            const lang = formatter.detectLanguage(code);
            expect(lang).toBe('sql');
        });

        it('should detect HTML', () => {
            const code = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Hello</title>
        </head>
        <body>
          <div class="container">
            <h1>Hello, World!</h1>
          </div>
        </body>
        </html>
      `;

            const lang = formatter.detectLanguage(code);
            expect(lang).toBe('html');
        });

        it('should detect CSS', () => {
            const code = `
        .container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        #header {
          background-color: #333;
          color: white;
        }
      `;

            const lang = formatter.detectLanguage(code);
            expect(lang).toBe('css');
        });

        it('should detect Bash', () => {
            const code = `
        #!/bin/bash
        if [ -f "$file" ]; then
          echo "File exists"
        fi

        for i in {1..10}; do
          echo $i
        done
      `;

            const lang = formatter.detectLanguage(code);
            expect(lang).toBe('bash');
        });

        it('should return text for unknown language', () => {
            const code = 'hello world goodbye';
            const lang = formatter.detectLanguage(code);
            expect(lang).toBe('text');
        });
    });

    describe('extractLanguageFromClass', () => {
        it('should extract language from language-* class', () => {
            const lang = formatter.extractLanguageFromClass('language-javascript');
            expect(lang).toBe('javascript');
        });

        it('should extract language from lang-* class', () => {
            const lang = formatter.extractLanguageFromClass('lang-python');
            expect(lang).toBe('python');
        });

        it('should extract language from common class names', () => {
            expect(formatter.extractLanguageFromClass('js')).toBe('javascript');
            expect(formatter.extractLanguageFromClass('ts')).toBe('typescript');
            expect(formatter.extractLanguageFromClass('py')).toBe('python');
            expect(formatter.extractLanguageFromClass('rb')).toBe('ruby');
            expect(formatter.extractLanguageFromClass('golang')).toBe('go');
        });

        it('should return empty string for unknown class', () => {
            const lang = formatter.extractLanguageFromClass('unknown-class');
            expect(lang).toBe('');
        });

        it('should handle multiple classes', () => {
            const lang = formatter.extractLanguageFromClass('hljs language-typescript some-other-class');
            expect(lang).toBe('typescript');
        });
    });

    describe('processCodeBlocks', () => {
        it('should add language class to code blocks', () => {
            const html = '<pre><code>const x = 1;</code></pre>';
            const result = formatter.processCodeBlocks(html);

            expect(result).toContain('language-');
        });

        it('should preserve existing language class', () => {
            const html = '<pre><code class="language-python">def foo(): pass</code></pre>';
            const result = formatter.processCodeBlocks(html);

            expect(result).toContain('language-python');
        });

        it('should detect language when not specified', () => {
            const html = '<pre><code>function hello() { return "world"; }</code></pre>';
            const result = formatter.processCodeBlocks(html);

            expect(result).toContain('language-javascript');
        });
    });

    describe('extractCodeBlocks', () => {
        it('should extract all code blocks from HTML', () => {
            const html = `
        <pre><code class="language-javascript">const x = 1;</code></pre>
        <pre><code class="language-python">def foo(): pass</code></pre>
      `;

            const blocks = formatter.extractCodeBlocks(html);

            expect(blocks).toHaveLength(2);
            expect(blocks[0].language).toBe('javascript');
            expect(blocks[1].language).toBe('python');
        });

        it('should return empty array for HTML without code blocks', () => {
            const html = '<p>No code here</p>';
            const blocks = formatter.extractCodeBlocks(html);

            expect(blocks).toHaveLength(0);
        });

        it('should include line count', () => {
            const html = '<pre><code>line1\nline2\nline3</code></pre>';
            const blocks = formatter.extractCodeBlocks(html);

            expect(blocks[0].lineCount).toBe(3);
        });

        it('should detect hasHighlighting', () => {
            const html1 = '<pre><code class="language-js">code</code></pre>';
            const html2 = '<pre><code>code</code></pre>';

            const blocks1 = formatter.extractCodeBlocks(html1);
            const blocks2 = formatter.extractCodeBlocks(html2);

            expect(blocks1[0].hasHighlighting).toBe(true);
            expect(blocks2[0].hasHighlighting).toBe(false);
        });
    });

    describe('countCodeBlocks', () => {
        it('should count code blocks correctly', () => {
            const html = `
        <pre><code>block 1</code></pre>
        <pre><code>block 2</code></pre>
        <pre><code>block 3</code></pre>
      `;

            const count = formatter.countCodeBlocks(html);
            expect(count).toBe(3);
        });

        it('should return 0 for no code blocks', () => {
            const html = '<p>No code</p>';
            const count = formatter.countCodeBlocks(html);
            expect(count).toBe(0);
        });
    });

    describe('getCodeStatistics', () => {
        it('should return correct statistics', () => {
            const html = `
        <pre><code class="language-javascript">const x = 1;\nconst y = 2;</code></pre>
        <pre><code class="language-javascript">function foo() {}</code></pre>
        <pre><code class="language-python">def bar(): pass</code></pre>
      `;

            const stats = formatter.getCodeStatistics(html);

            expect(stats.totalBlocks).toBe(3);
            expect(stats.languages['javascript']).toBe(2);
            expect(stats.languages['python']).toBe(1);
            expect(stats.totalLines).toBeGreaterThan(0);
        });

        it('should handle empty HTML', () => {
            const stats = formatter.getCodeStatistics('');

            expect(stats.totalBlocks).toBe(0);
            expect(stats.totalLines).toBe(0);
            expect(Object.keys(stats.languages)).toHaveLength(0);
        });
    });

    describe('highlightCode', () => {
        it('should wrap code with pre and code tags', () => {
            const result = formatter.highlightCode('const x = 1;', 'javascript');

            expect(result).toContain('<pre>');
            expect(result).toContain('<code');
            expect(result).toContain('language-javascript');
        });

        it('should escape HTML characters', () => {
            const result = formatter.highlightCode('<div class="test">', 'html');

            expect(result).toContain('&lt;');
            expect(result).toContain('&gt;');
            expect(result).toContain('&quot;');
        });
    });
});

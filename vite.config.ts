/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        options: resolve(__dirname, 'src/options/index.html'),
        history: resolve(__dirname, 'src/history/index.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          const name = chunkInfo.name;
          if (name === 'background') return 'background.js';
          if (name === 'content') return 'content.js';
          return '[name].js';
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || '';
          if (name.endsWith('.css')) return '[name][extname]';
          return 'assets/[name][extname]';
        },
        // Inline all content script dependencies to avoid chunk loading issues
        manualChunks: (id) => {
          // Don't create chunks - bundle everything into entry files
          return undefined;
        },
      },
    },
  },
  plugins: [
    {
      name: 'chrome-extension-fix',
      writeBundle() {
        const outDir = resolve(__dirname, 'dist');

        // Convert content.js to IIFE format to avoid module loading issues
        const contentJsPath = resolve(outDir, 'content.js');
        if (existsSync(contentJsPath)) {
          let contentCode = readFileSync(contentJsPath, 'utf-8');
          // Remove export statements and wrap in IIFE
          contentCode = contentCode
            .replace(/export\s*{\s*([^}]+)\s*}/g, '') // Remove exports
            .replace(/import\s*.*from\s*['"][^'"]+['"];?\s*/g, '') // Remove imports (already inlined by Rollup)
            .trim();
          // Wrap in IIFE
          contentCode = `(function() {\n'use strict';\n${contentCode}\n})();`;
          writeFileSync(contentJsPath, contentCode);
        }

        // Copy HTML files to root and fix paths
        const htmlFiles = [
          { src: 'src/popup/index.html', dest: 'popup.html' },
          { src: 'src/options/index.html', dest: 'options.html' },
          { src: 'src/history/index.html', dest: 'history.html' },
        ];

        htmlFiles.forEach(({ src, dest }) => {
          const srcPath = resolve(outDir, src);
          const destPath = resolve(outDir, dest);
          if (existsSync(srcPath)) {
            let content = readFileSync(srcPath, 'utf-8');
            // Fix absolute paths to relative
            content = content.replace(/="\/popup\.js"/g, '="popup.js"');
            content = content.replace(/="\/options\.js"/g, '="options.js"');
            content = content.replace(/="\/history\.js"/g, '="history.js"');
            content = content.replace(/="\/background\.js"/g, '="background.js"');
            content = content.replace(/="\/content\.js"/g, '="content.js"');
            content = content.replace(/="\/popup\.css"/g, '="popup.css"');
            content = content.replace(/="\/options\.css"/g, '="options.css"');
            content = content.replace(/="\/history\.css"/g, '="history.css"');
            content = content.replace(/="\/chunks\//g, '="chunks/');
            writeFileSync(destPath, content);
          }
        });

        // Copy _locales
        const localesSrc = resolve(__dirname, 'public/_locales');
        const localesDest = resolve(outDir, '_locales');
        if (!existsSync(localesDest)) {
          mkdirSync(localesDest, { recursive: true });
        }
        copyFileSync(
          resolve(localesSrc, 'en/messages.json'),
          resolve(localesDest, 'en/messages.json')
        );
        copyFileSync(
          resolve(localesSrc, 'zh_CN/messages.json'),
          resolve(localesDest, 'zh_CN/messages.json')
        );

        // Create manifest.json
        const manifest = {
          manifest_version: 3,
          name: '__MSG_extensionName__',
          description: '__MSG_extensionDescription__',
          version: '0.1.0',
          default_locale: 'en',
          icons: {
            '16': 'icons/icon16.png',
            '48': 'icons/icon48.png',
            '128': 'icons/icon128.png',
          },
          action: {
            default_popup: 'popup.html',
            default_icon: {
              '16': 'icons/icon16.png',
              '48': 'icons/icon48.png',
              '128': 'icons/icon128.png',
            },
            default_title: '__MSG_actionTitle__',
          },
          options_page: 'options.html',
          background: {
            service_worker: 'background.js',
            type: 'module',
          },
          content_scripts: [
            {
              matches: ['<all_urls>'],
              js: ['content.js'],
              run_at: 'document_idle',
            },
          ],
          permissions: [
            'storage',
            'contextMenus',
            'downloads',
            'clipboardWrite',
            'notifications',
            'activeTab',
          ],
          host_permissions: ['<all_urls>'],
          commands: {
            'convert-page': {
              suggested_key: {
                default: 'Ctrl+Shift+M',
                mac: 'Command+Shift+M',
              },
              description: '__MSG_commandConvert__',
            },
            'convert-selection': {
              suggested_key: {
                default: 'Ctrl+Shift+K',
                mac: 'Command+Shift+K',
              },
              description: '__MSG_commandConvertSelection__',
            },
          },
        };
        writeFileSync(resolve(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
      },
    },
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@core': resolve(__dirname, 'src/core'),
      '@storage': resolve(__dirname, 'src/storage'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@types': resolve(__dirname, 'src/types'),
    },
  },
  publicDir: 'public',
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/index.html',
        'src/manifest.json',
      ],
      reportsDirectory: './coverage',
    },
  },
});

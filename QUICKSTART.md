# Quick Start Guide

## 🚀 Getting Started with MDFlow Development

This guide will help you set up the development environment and run the MDFlow extension for the first time.

## Prerequisites

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Google Chrome** or **Chromium-based browser**
- Code editor (VSCode recommended)

## Setup Steps

### 1. Install Dependencies

```bash
cd f:\Project\web-to-md-plugin
npm install
```

### 2. Create Placeholder Icons

Before building, you need icon files. Create simple PNG icons:

```bash
# Quick method: Create a simple colored square using any image editor
# Save as:
# - public/icons/icon16.png (16x16)
# - public/icons/icon48.png (48x48)
# - public/icons/icon128.png (128x128)
```

**Pro tip**: Use [placeholder.com](https://placeholder.com/) or create a simple design with:
- Background: #6366f1 (purple)
- Text: "MD" in white

### 3. Build the Extension

```bash
npm run build
```

This will compile TypeScript and bundle all files into the `dist` folder.

### 4. Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Navigate to and select the `dist` folder
5. MDFlow should appear in your extensions list!

## Development Mode

For active development with hot reload:

```bash
npm run dev
```

Then reload the extension in Chrome:
1. Go to `chrome://extensions/`
2. Find MDFlow
3. Click the refresh icon

## Testing the Extension

### Test 1: Popup Interface
1. Click the MDFlow icon in your toolbar
2. You should see the popup with:
   - Convert Page button
   - Convert Selection button
   - File upload area
   - Recent conversions section

### Test 2: Right-Click Menu
1. Navigate to any webpage (e.g., https://example.com)
2. Right-click anywhere on the page
3. You should see "Convert Page to Markdown" option

### Test 3: Keyboard Shortcuts
1. Press `Ctrl+Shift+M` (Mac: `Cmd+Shift+M`)
2. You should see a conversion notification

### Test 4: Options Page
1. Right-click the MDFlow icon
2. Select "Options"
3. You should see the settings interface

### Test 5: History Page
1. Open MDFlow popup
2. Click "History" button at bottom
3. History page should open in a new tab

## File Structure Overview

```
src/
├── background/index.ts    # Service worker (handles events, menus)
├── content/index.ts       # Injected into web pages (extracts content)
├── popup/                # Popup UI (index.html, app.ts, styles.css)
├── options/              # Settings UI (index.html, app.ts, styles.css)
├── history/              # History management UI
├── storage/              # Chrome Storage API wrapper
└── types/                # TypeScript type definitions
```

## Common Issues

### Issue: Extension won't load
**Solution**: Check Chrome's errors page at `chrome://extensions/` → click "Errors" button

### Issue: TypeScript errors after npm install
**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: Icons not showing
**Solution**: Make sure you have created the PNG files in `public/icons/`:
- icon16.png
- icon48.png
- icon128.png

### Issue: Build fails
**Solution**: Check that all dependencies are installed:
```bash
npm install --force
```

## Next Steps

Once everything is running, check out:
- [PROJECT_PLAN.md](./PROJECT_PLAN.md) - Full development roadmap
- [README.md](./README.md) - Detailed documentation

## Useful Commands

```bash
# Development
npm run dev          # Start dev server

# Building
npm run build        # Production build
npm run preview      # Preview production build

# Code Quality
npm run lint         # Check code with ESLint
npm run format       # Format code with Prettier
npm run lint:fix     # Auto-fix linting issues

# Testing
npm run test         # Run unit tests
npm run test:ui      # Run tests with UI
npm run test:e2e     # Run end-to-end tests
```

## Chrome Developer Tools

### Inspect Background Service Worker
1. Go to `chrome://extensions/`
2. Find MDFlow
3. Click "Service worker" link
4. DevTools will open for the background script

### Inspect Popup
1. Right-click the MDFlow icon
2. Select "Inspect popup"
3. DevTools will open for the popup

### Inspect Content Script
1. Open any webpage
2. Open DevTools (F12)
3. Go to Sources tab → expand "Top" → expand "Content scripts"

### View Storage
1. Go to `chrome://extensions/`
2. Find MDFlow
3. Click "Storage views"
4. See all stored data

## Getting Help

- 📖 Check [PROJECT_PLAN.md](./PROJECT_PLAN.md) for architecture details
- 🐛 Report issues on GitHub
- 💬 Ask questions in Discussions

---

Happy coding! 🎉

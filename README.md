# MDFlow - Web to Markdown Converter

> A powerful Chrome extension for converting web pages and documents to clean Markdown format.

## Features

- **Convert Web Pages**: Transform any webpage into clean Markdown
- **Convert Selection**: Extract selected content to Markdown
- **File Support**: Convert PDF and Word documents (Coming Soon)
- **Multiple Output Formats**: Markdown, HTML, TXT, PDF
- **Smart Content Extraction**: Automatically removes ads and navigation
- **Math Support**: Convert mathematical formulas to MathJax
- **Code Highlighting**: Preserve code block syntax highlighting
- **Image Handling**: Download and localize images
- **History Management**: Track and manage all conversions
- **Keyboard Shortcuts**: Quick access with customizable shortcuts
- **Dark Theme**: Automatic theme detection

## Installation

### Development

```bash
# Clone the repository
git clone https://github.com/yourusername/mdflow-extension.git
cd mdflow-extension

# Install dependencies
npm install

# Build for development
npm run dev

# Load extension in Chrome
1. Open chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` folder
```

### Production Build

```bash
npm run build
```

## Usage

### Right-Click Menu

1. Right-click on any webpage
2. Select "Convert Page to Markdown" or "Convert Selection to Markdown"
3. The conversion will be processed automatically

### Keyboard Shortcuts

- `Ctrl+Shift+M` (Mac: `Cmd+Shift+M`) - Convert current page
- `Ctrl+Shift+K` (Mac: `Cmd+Shift+K`) - Convert selected text

### Popup Interface

Click the MDFlow icon in your browser toolbar to:
- Convert the current page
- Convert selected text
- Upload and convert files (PDF, Word)
- View recent conversions
- Access settings and history

## Project Structure

```
mdflow-extension/
├── public/                 # Static assets
│   ├── manifest.json      # Chrome Extension manifest
│   ├── icons/            # Extension icons
│   └── _locales/         # Internationalization
├── src/
│   ├── background/       # Service worker
│   ├── content/          # Content scripts
│   ├── popup/           # Popup UI
│   ├── options/         # Options/settings UI
│   ├── history/         # History management UI
│   ├── core/            # Core conversion logic
│   │   ├── parsers/     # HTML, PDF, DOCX parsers
│   │   ├── formatters/  # Markdown, HTML formatters
│   │   └── processors/  # Image, code processors
│   ├── storage/         # Chrome Storage wrapper
│   ├── utils/           # Utility functions
│   └── types/           # TypeScript types
├── tests/               # Test files
└── package.json
```

## Development

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests

### Tech Stack

- **Runtime**: Chrome Extension Manifest V3
- **Language**: TypeScript
- **Build Tool**: Vite with @crxjs/vite-plugin
- **Styling**: CSS Variables (with dark mode support)
- **Libraries**:
  - TurndownJS - HTML to Markdown conversion
  - PDF.js - PDF parsing
  - Mammoth.js - Word document parsing
  - date-fns - Date formatting

## Roadmap

See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for detailed development roadmap.

### Phase 1: Foundation ✅
- [x] Project setup and configuration
- [x] Basic UI (Popup, Options, History)
- [x] Chrome Storage wrapper
- [x] Background service worker
- [x] Content script injection

### Phase 2: HTML to Markdown 🚧
- [ ] TurndownJS integration
- [ ] Smart content extraction
- [ ] Right-click menu integration
- [ ] Clipboard output

### Phase 3: Document Support
- [ ] PDF conversion
- [ ] Word document conversion
- [ ] File upload interface

### Phase 4: Advanced Features
- [ ] MathJax formula conversion
- [ ] Code highlighting preservation
- [ ] Image download and localization
- [ ] Table formatting

### Phase 5: Batch & History
- [ ] Task queue system
- [ ] IndexedDB history storage
- [ ] History management UI
- [ ] Batch conversion

### Phase 6: Export & Config
- [ ] Multiple format export
- [ ] Custom conversion rules
- [ ] Template system
- [ ] Shortcut configuration

### Phase 7: Optimization
- [ ] Performance optimization
- [ ] Memory management
- [ ] Comprehensive testing
- [ ] Documentation

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - see LICENSE file for details

## Credits

- [MarkDownload](https://github.com/deathau/markdownload) - Inspiration for features
- [Turndown](https://github.com/mixmark-io/turndown) - HTML to Markdown library
- [SingleFile](https://github.com/gildas-lormeau/SingleFile) - Page archiving concepts

## Support

- 📖 [Documentation](https://github.com/yourusername/mdflow-extension/wiki)
- 🐛 [Report Issues](https://github.com/yourusername/mdflow-extension/issues)
- 💬 [Discussions](https://github.com/yourusername/mdflow-extension/discussions)

---

Made with ❤️ by the MDFlow Team

# Icon Files

This directory should contain the extension icon files in the following sizes:

- `icon16.png` - 16x16 pixels (for browser toolbar)
- `icon48.png` - 48x48 pixels (for extension management page)
- `icon128.png` - 128x128 pixels (for Chrome Web Store and installation)

## Temporary Placeholder

For development purposes, you can use any PNG image. Copy an image to each of the required filenames above.

## Recommended Icon Design

- **Style**: Simple, clean, recognizable at small sizes
- **Colors**: Use a primary color that matches your brand (e.g., #6366f1)
- **Concept**: Consider incorporating:
  - Document/page icon
  - MD (Markdown) text
  - Arrow/conversion symbol

## Icon Generation Tools

- [Favicon.io](https://favicon.io/) - Generate favicons from text or image
- [Canva](https://www.canva.com/) - Design custom icons
- [Figma](https://www.figma.com/) - Professional design tool

## Example Using SVG

If you have an SVG icon, you can convert it to PNG using:

```bash
# Using ImageMagick
convert icon.svg -resize 16x16 icon16.png
convert icon.svg -resize 48x48 icon48.png
convert icon.svg -resize 128x128 icon128.png

# Or using online tools like
# https://cloudconvert.com/svg-to-png
```

For now, create simple placeholder icons by copying any PNG image to the required filenames.

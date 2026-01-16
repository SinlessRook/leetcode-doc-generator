# LeetCode Documentation Generator

A Chrome extension that helps students document their LeetCode problem solutions in a standardized format.

## Features

- Automatically capture LeetCode submission details from submission pages
- Manage multiple problems in a problem set
- Reorder problems with drag-and-drop or arrow buttons
- Generate formatted .docx documents
- Simple and intuitive interface

## Project Structure

```
leetcode-doc-generator/
├── manifest.json          # Extension configuration (Manifest V3)
├── popup.html            # Popup UI
├── popup.js              # Popup logic
├── popup.css             # Popup styling
├── content.js            # LeetCode page integration & API calls
├── background.js         # Background service worker
├── docxGenerator.js      # .docx file generation
├── storage.js            # Chrome storage operations
└── icons/                # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Installation (Development)

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the `leetcode-doc-generator` directory

## Usage

1. Navigate to a LeetCode submission page (e.g., `leetcode.com/problems/*/submissions/*`)
2. Click the extension icon in the toolbar
3. Enter your problem set title and student name
4. Click "Capture from Current Page" to capture the submission
5. Repeat for all problems in your problem set
6. Click "Generate Document" to download a .docx file

## Development Status

This extension is currently under development. See `.kiro/specs/leetcode-doc-generator/tasks.md` for implementation progress.

## Requirements

- Chrome browser (Manifest V3 compatible)
- Active LeetCode session (must be logged in)

## License

MIT

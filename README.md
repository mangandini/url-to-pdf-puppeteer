# URL to PDF Converter

A command-line tool that converts multiple URLs to PDFs and combines them into a single document while maintaining the original order of the URLs.

## 📋 Project Overview

This tool automates the process of converting web pages to PDFs using headless Chrome via Puppeteer. It's designed to:

1. Read a list of URLs from a text file
2. Capture high-quality screenshots of each webpage
3. Convert screenshots to PDF documents
4. Combine all individual PDFs into a single merged document
5. Organize outputs in timestamped folders

## 🛠️ Technology Stack

- **Node.js**: JavaScript runtime (v18+ recommended)
- **Puppeteer**: Headless Chrome API for rendering web pages
- **PDF-lib**: Library for PDF manipulation and merging
- **Sharp**: Image processing library for handling screenshots
- **fs/promises**: Asynchronous file operations

## 📦 Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/url-to-pdf.git
   cd url-to-pdf
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## 🚀 Usage

### Basic Usage

```bash
node src/index.js input/urls.txt
```

This will:
- Read URLs from the specified file
- Convert each URL to a PDF using Chrome headless with @media screen emulation
- Combine all PDFs into a single file
- Save outputs to a timestamped directory

### Using Print Media Emulation

```bash
node src/index.js input/urls.txt --emulate-print
```

This uses @media print styling rules during rendering.

### Input File Format

Create a text file with one URL per line:

```
https://example1.com
https://example2.com
https://example3.com
```

## 📂 Project Structure

```
url-to-pdf/
├── package.json         # Project dependencies and scripts
├── src/
│   ├── index.js         # Entry point and command parsing
│   ├── pdfGenerator.js  # Core logic for converting URLs to PDFs
│   └── pdfMerger.js     # PDF merging functionality
├── input/               # Directory for URL input files
│   └── urls.txt         # Sample URLs file
└── output/              # Generated PDFs and screenshots
    └── [domain]_[timestamp]/
        ├── pdfs/        # Individual PDFs
        ├── screenshots/ # Full-page screenshots
        └── merged_*.pdf # Final combined PDF
```

## ⚙️ Technical Details

### Browser Configuration

The tool uses a preconfigured Chrome browser with:

- Headless mode enabled
- High-resolution viewport (1920×1080)
- Desktop user agent
- Custom CSS to remove annoying cookie popups and overlays

### PDF Generation Process

1. **URL Loading**: Each URL is loaded in a headless Chrome instance
2. **Content Processing**: 
   - Waits for all images and content to fully load
   - Automatically removes common cookie consent popups
   - Ensures proper header positioning
3. **Screenshot Capture**: Takes a full-page screenshot of the rendered page
4. **PDF Conversion**: Converts the screenshot to a PDF document
5. **Merging**: Combines all individual PDFs into a single document

### Error Handling

The tool implements basic error handling that:
- Attempts to process each URL independently
- Continues processing remaining URLs if one fails
- Provides detailed error messages in the console
- Ensures the browser is properly closed even on errors

## 🔮 Future Enhancements

Planned features for future versions:

- Parallel processing for faster conversion
- Graphical user interface (GUI)
- Advanced URL validation
- Automatic retries for failed URLs
- PDF compression options
- Custom file naming options
- Support for site authentication
- Timeout configuration
- Custom CSS injection

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🤔 Troubleshooting

**Q: The tool crashes with "No PDFs were generated"**  
A: Ensure all URLs are valid and publicly accessible. Check that you have a stable internet connection.

**Q: Pages are rendered incorrectly**  
A: Some websites may have anti-scraping measures or require JavaScript interactions. Try adding wait times or specific selectors in the code.

**Q: Process takes too long**  
A: The tool processes URLs sequentially. For many URLs, consider running multiple instances with different input files. 
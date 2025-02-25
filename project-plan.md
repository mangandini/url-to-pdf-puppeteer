# URL to PDF - Conversion Tool
Tool to convert multiple URLs to PDF and combine them into a single document.

## Project Description
Command line tool that:
1. Reads URLs from a text file
2. Converts each URL to PDF using Puppeteer and Chrome Headless
3. Combines all the PDFs into a single file
4. Maintains the original order of the URLs

## Main Technologies
- Node.js (v18+)
- Puppeteer - To render web pages to PDF using Chrome Headless
- pdf-lib - To combine PDFs
- fs/promises - For asynchronous file operations

## Dependencies
```json
{
"puppeteer": "^21.0.0",
"pdf-lib": "^1.17.1"
}
```

## MVP v1.0 Structure

url-to-pdf/
├── package.json
├── src/
│ ├── index.js # Entry point
│ ├── pdfGenerator.js # PDF generation logic
│ └── pdfMerger.js # PDF merge logic
├── input/
│ └── urls.txt # URLs file
└── output/
└── pdfs/ # Individual PDFs


## MVP Milestones

### 1. Initial Setup
- Create project structure
- Initialize package.json
- Install dependencies
- Create necessary directories

### 2. Core Functionality
- Read URLs file
- Convert URLs to PDF using Puppeteer
- Combine PDFs into one
- Basic error handling

### 3. PDF and Chrome Configuration
- A4 format
- Chrome Headless configuration:
  - Emulate @media screen by default for better visual fidelity
  - Option to respect @media print via parameter emulateScreenMedia=false
  - Configuration to match with Chrome desktop
  - Consistent viewport and dimensions
- Puppeteer configuration:

```javascript
const options = {
format: 'A4',
printBackground: true,
preferCSSPageSize: true,
emulateMediaType: 'screen', // Default
viewport: {
width: 1200,
height: 800,
deviceScaleFactor: 1,
}
};
```

## Basic Usage

Basic usage (emulates @media screen)
```bash
node src/index.js input/urls.txt
```
Use @media print rules
```bash
node src/index.js input/urls.txt --emulate-print
```

## URLs File Format
```text
https://example1.com
https://example2.com
https://example3.com
```

## MVP Considerations
- No graphical interface
- No exhaustive URL validation
- No automatic retries
- No parallel processing
- No PDF compression
- No customization of file names

## For Future Versions
- Graphical interface
- Parallel processing
- URL validation
- Automatic retries
- PDF compression
- Customization of file names
- Detailed logging
- Automated tests
- Support for site authentication
- Timeout configuration
- More PDF configuration options:
  - Custom margins
  - Page orientation
  - Headers and footers
  - Additional CSS styles
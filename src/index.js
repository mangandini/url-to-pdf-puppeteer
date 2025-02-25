import { readFile } from 'fs/promises';
import { generatePDF } from './pdfGenerator.js';
import { mergePDFs } from './pdfMerger.js';

async function main() {
  try {
    const inputFile = process.argv[2];
    const emulateScreenMedia = !process.argv.includes('--emulate-print');

    if (!inputFile) {
      console.error('Please provide an input file path');
      console.error('Usage: node src/index.js <urls-file> [--emulate-print]');
      process.exit(1);
    }

    const urls = (await readFile(inputFile, 'utf-8'))
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    if (urls.length === 0) {
      console.error('No URLs found in input file');
      process.exit(1);
    }

    console.log(`Processing ${urls.length} URLs...`);
    
    const options = {
      emulateScreenMedia: !process.argv.includes('--emulate-print'),
      timeout: 120000,
      waitForNetworkIdle: true
    };

    const { pdfFiles, timestamp, outputDir } = await generatePDF(urls, options);
    console.log(`Generated ${pdfFiles.length} PDF files`);

    if (pdfFiles.length > 0) {
      const mergedFile = await mergePDFs(pdfFiles, timestamp, outputDir);
      console.log('Process completed successfully!');
      console.log(`Output directory: ${outputDir}`);
      console.log(`Merged file: ${mergedFile}`);
    } else {
      console.error('No PDFs were generated');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main(); 
import { PDFDocument } from 'pdf-lib';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

/**
 * Merges multiple PDF files into a single document
 * @param {string[]} pdfPaths - Array of paths to PDF files to merge
 * @param {string} timestamp - Timestamp string for file naming
 * @param {string} outputDir - Directory to save the merged PDF
 * @returns {string} - Path to the merged PDF file
 */
export async function mergePDFs(pdfPaths, timestamp, outputDir) {
  if (!pdfPaths.length) {
    throw new Error('No PDF files to merge');
  }

  console.log('Merging PDFs...');
  const mergedPdf = await PDFDocument.create();

  for (const pdfPath of pdfPaths) {
    try {
      // Read the existing PDF
      const pdfBytes = await readFile(pdfPath);
      const pdf = await PDFDocument.load(pdfBytes);
      
      // Copy all pages to the final PDF
      // This preserves all content and formatting from the original PDFs
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach(page => {
        mergedPdf.addPage(page);
      });

      console.log(`Added ${path.basename(pdfPath)} to merged document`);
    } catch (error) {
      console.error(`Error processing ${pdfPath}:`, error.message);
    }
  }

  // Create the merged PDF file with timestamp in the filename
  // You can customize the filename format here if needed
  const mergedPdfFile = path.join(outputDir, `merged_${timestamp}.pdf`);
  const pdfBytes = await mergedPdf.save();
  await writeFile(mergedPdfFile, pdfBytes);

  console.log(`======================`);
  console.log(`PDFs merged successfully into: ${mergedPdfFile}`);
  console.log(`======================`);
  return mergedPdfFile;
} 
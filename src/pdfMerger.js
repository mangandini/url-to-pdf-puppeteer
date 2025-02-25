import { PDFDocument } from 'pdf-lib';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

export async function mergePDFs(pdfPaths, timestamp, outputDir) {
  if (!pdfPaths.length) {
    throw new Error('No PDF files to merge');
  }

  console.log('Merging PDFs...');
  const mergedPdf = await PDFDocument.create();

  for (const pdfPath of pdfPaths) {
    try {
      // Leer el PDF existente
      const pdfBytes = await readFile(pdfPath);
      const pdf = await PDFDocument.load(pdfBytes);
      
      // Copiar todas las páginas al PDF final
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach(page => {
        mergedPdf.addPage(page);
      });

      console.log(`Added ${path.basename(pdfPath)} to merged document`);
    } catch (error) {
      console.error(`Error processing ${pdfPath}:`, error.message);
    }
  }

  const mergedPdfFile = path.join(outputDir, `merged_${timestamp}.pdf`);
  const pdfBytes = await mergedPdf.save();
  await writeFile(mergedPdfFile, pdfBytes);

  console.log(`======================`);
  console.log(`PDFs merged successfully into: ${mergedPdfFile}`);
  console.log(`======================`);
  return mergedPdfFile;
} 
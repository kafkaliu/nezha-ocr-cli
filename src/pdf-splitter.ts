import { PDFDocument } from 'pdf-lib';

/**
 * Split a PDF into chunks with a maximum number of pages per chunk.
 * Returns an array of chunks, each containing PDF bytes and page range.
 */
export async function splitPdf(
  pdfBytes: Uint8Array,
  maxPages: number
): Promise<{ chunk: Uint8Array; startPage: number; endPage: number }[]> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const totalPages = pdfDoc.getPageCount();

  if (totalPages <= maxPages) {
    return [{ chunk: pdfBytes, startPage: 1, endPage: totalPages }];
  }

  const chunks: { chunk: Uint8Array; startPage: number; endPage: number }[] = [];

  for (let i = 0; i < totalPages; i += maxPages) {
    const startPage = i;
    const endPage = Math.min(i + maxPages, totalPages);

    // Create a new PDF document for this chunk
    const newPdf = await PDFDocument.create();

    // Copy pages from the original document
    const pageIndices = Array.from(
      { length: endPage - startPage },
      (_, idx) => startPage + idx
    );

    const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);

    // Add all copied pages to the new document
    copiedPages.forEach((page) => newPdf.addPage(page));

    // Save the chunk
    const chunkBytes = await newPdf.save();

    chunks.push({
      chunk: chunkBytes,
      startPage: startPage + 1, // Convert to 1-based indexing
      endPage: endPage, // Already 1-based due to how we calculate
    });
  }

  return chunks;
}

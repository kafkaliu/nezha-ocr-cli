/**
 * Unit tests for PDF splitting logic
 */

import { describe, it, expect } from 'vitest';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { splitPdf } from '../../src/pdf-splitter.js';

describe('splitPdf', () => {
  // Create a test PDF
  async function createTestPdf(pageCount: number): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (let i = 1; i <= pageCount; i++) {
      const page = pdfDoc.addPage([500, 700]);
      const { width, height } = page.getSize();

      page.drawText(`Page ${i}`, {
        x: 50,
        y: height - 50,
        size: 24,
        font,
        color: rgb(0, 0, 0),
      });
    }

    return await pdfDoc.save();
  }

  describe('Basic functionality', () => {
    it('should return single chunk when pages do not exceed maxPages', async () => {
      const pdfBytes = await createTestPdf(3);
      const chunks = await splitPdf(pdfBytes, 5);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].startPage).toBe(1);
      expect(chunks[0].endPage).toBe(3);
    });

    it('should split into multiple chunks when pages exceed maxPages', async () => {
      const pdfBytes = await createTestPdf(10);
      const chunks = await splitPdf(pdfBytes, 3);

      expect(chunks).toHaveLength(4); // 3 + 3 + 3 + 1
      expect(chunks[0].startPage).toBe(1);
      expect(chunks[0].endPage).toBe(3);
      expect(chunks[1].startPage).toBe(4);
      expect(chunks[1].endPage).toBe(6);
      expect(chunks[2].startPage).toBe(7);
      expect(chunks[2].endPage).toBe(9);
      expect(chunks[3].startPage).toBe(10);
      expect(chunks[3].endPage).toBe(10);
    });
  });

  describe('Chunk metadata', () => {
    it('should correctly set start and end pages for each chunk', async () => {
      const pdfBytes = await createTestPdf(5);
      const chunks = await splitPdf(pdfBytes, 2);

      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toMatchObject({ startPage: 1, endPage: 2 });
      expect(chunks[0].chunk).toBeInstanceOf(Uint8Array);
      expect(chunks[1]).toMatchObject({ startPage: 3, endPage: 4 });
      expect(chunks[1].chunk).toBeInstanceOf(Uint8Array);
      expect(chunks[2]).toMatchObject({ startPage: 5, endPage: 5 });
      expect(chunks[2].chunk).toBeInstanceOf(Uint8Array);
    });
  });

  describe('Chunk content validation', () => {
    it('each chunk should be a valid PDF', async () => {
      const pdfBytes = await createTestPdf(5);
      const chunks = await splitPdf(pdfBytes, 2);

      for (const chunk of chunks) {
        await expect(async () => {
          const pdfDoc = await PDFDocument.load(chunk.chunk);
          expect(pdfDoc.getPageCount()).toBe(chunk.endPage - chunk.startPage + 1);
        }).not.toThrow();
      }
    });

    it('total pages across chunks should equal original PDF page count', async () => {
      const originalPdf = await PDFDocument.load(await createTestPdf(7));
      const originalPageCount = originalPdf.getPageCount();

      const chunks = await splitPdf(await createTestPdf(7), 3);
      let totalChunkPages = 0;

      for (const chunk of chunks) {
        const pdfDoc = await PDFDocument.load(chunk.chunk);
        totalChunkPages += pdfDoc.getPageCount();
      }

      expect(totalChunkPages).toBe(originalPageCount);
    });
  });

  describe('Edge cases', () => {
    it('should handle single page PDF', async () => {
      const pdfBytes = await createTestPdf(1);
      const chunks = await splitPdf(pdfBytes, 10);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].startPage).toBe(1);
      expect(chunks[0].endPage).toBe(1);
    });

    it('should handle maxPages = 1', async () => {
      const pdfBytes = await createTestPdf(3);
      const chunks = await splitPdf(pdfBytes, 1);

      expect(chunks).toHaveLength(3);
      expect(chunks[0].startPage).toBe(1);
      expect(chunks[0].endPage).toBe(1);
      expect(chunks[1].startPage).toBe(2);
      expect(chunks[1].endPage).toBe(2);
      expect(chunks[2].startPage).toBe(3);
      expect(chunks[2].endPage).toBe(3);
    });

    it('should handle exact division', async () => {
      const pdfBytes = await createTestPdf(6);
      const chunks = await splitPdf(pdfBytes, 3);

      expect(chunks).toHaveLength(2);
      expect(chunks[0].startPage).toBe(1);
      expect(chunks[0].endPage).toBe(3);
      expect(chunks[1].startPage).toBe(4);
      expect(chunks[1].endPage).toBe(6);
    });
  });
});

/**
 * OCR API integration tests
 * Requires OCR_API_URL and OCR_API_TOKEN environment variables to be set
 */

import { describe, it, expect, beforeAll } from 'vitest';
import axios from 'axios';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { callOcrApi } from '../../src/ocr-client.js';
import { splitPdf } from '../../src/pdf-splitter.js';
import { mergeOcrResults } from '../../src/result-merger.js';
import { OCR_CONFIG, SKIP_INTEGRATION, printTestEnvInfo } from '../setup.js';

// Skip integration tests flag
const skipTest = SKIP_INTEGRATION ? describe.skip : describe;

describe('OCR API Integration Tests', () => {
  beforeAll(() => {
    printTestEnvInfo();
  });

  // Create test PDF
  async function createTestPdf(pageCount: number): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    for (let i = 1; i <= pageCount; i++) {
      const page = pdfDoc.addPage([500, 700]);
      const { width, height } = page.getSize();

      // Title
      page.drawText(`Page ${i}`, {
        x: 50,
        y: height - 50,
        size: 24,
        font: fontBold,
        color: rgb(0, 0, 0),
      });

      // Content
      const content = `Content for page ${i}.\nThis is a test for OCR integration.`;
      page.drawText(content, {
        x: 50,
        y: height - 120,
        size: 14,
        font,
        color: rgb(0, 0, 0),
        lineHeight: 20,
      });

      // Bottom marker
      page.drawText(`Bottom of page ${i}`, {
        x: 50,
        y: 50,
        size: 12,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    return await pdfDoc.save();
  }

  skipTest('OCR API basic calls', () => {
    it('should successfully call OCR API', async () => {
      const pdfBytes = await createTestPdf(1);

      const result = await callOcrApi(pdfBytes, OCR_CONFIG);

      expect(result).toBeDefined();
      expect(result.errorCode).toBe(0);
      expect(result.result.layoutParsingResults).toBeDefined();
      expect(result.result.layoutParsingResults.length).toBeGreaterThan(0);
    });

    it('should return correct data structure', async () => {
      const pdfBytes = await createTestPdf(1);

      const result = await callOcrApi(pdfBytes, OCR_CONFIG);

      expect(result.logId).toBeDefined();
      expect(typeof result.logId).toBe('string');

      const page = result.result.layoutParsingResults[0];
      expect(page.prunedResult).toBeDefined();
      expect(page.prunedResult.page_count).toBe(1);
      expect(page.prunedResult.width).toBeGreaterThan(0);
      expect(page.prunedResult.height).toBeGreaterThan(0);
      expect(page.prunedResult.parsing_res_list).toBeInstanceOf(Array);
      expect(page.markdown).toBeDefined();
      expect(typeof page.markdown.text).toBe('string');
    });

    it('should correctly recognize text content', async () => {
      const pdfBytes = await createTestPdf(1);

      const result = await callOcrApi(pdfBytes, OCR_CONFIG);

      const blocks = result.result.layoutParsingResults[0].prunedResult.parsing_res_list;
      const textContent = blocks.map((b: any) => b.block_content).join(' ');

      expect(textContent).toContain('Page 1');
      expect(textContent).toContain('Content for page 1');
    });
  });

  skipTest('Multi-page PDF processing', () => {
    it('should correctly process multi-page PDF', async () => {
      const pdfBytes = await createTestPdf(4);

      const result = await callOcrApi(pdfBytes, OCR_CONFIG);

      expect(result.result.layoutParsingResults.length).toBe(4);
    });

    it('each page should have correct content', async () => {
      const pdfBytes = await createTestPdf(3);

      const result = await callOcrApi(pdfBytes, OCR_CONFIG);

      for (let i = 0; i < 3; i++) {
        const page = result.result.layoutParsingResults[i];
        expect(page.prunedResult.page_count).toBe(1);

        const blocks = page.prunedResult.parsing_res_list;
        const textContent = blocks.map((b: any) => b.block_content).join(' ');

        expect(textContent).toContain(`Page ${i + 1}`);
        expect(textContent).toContain(`Content for page ${i + 1}`);
      }
    });
  });

  skipTest('Split-merge consistency', () => {
    it('split-merge result should match direct API call', async () => {
      const PAGE_COUNT = 4;
      const SPLIT_AFTER = 2;

      // Create test PDF
      const pdfBytes = await createTestPdf(PAGE_COUNT);

      // Method 1: Direct call
      const directResult = await callOcrApi(pdfBytes, OCR_CONFIG);

      // Method 2: Split, call, then merge
      const chunks = await splitPdf(pdfBytes, SPLIT_AFTER);
      const splitResults = [];

      for (const chunk of chunks) {
        const result = await callOcrApi(chunk.chunk, OCR_CONFIG);
        splitResults.push({
          result,
          metadata: { startPage: chunk.startPage, endPage: chunk.endPage },
        });
      }

      const mergedResult = mergeOcrResults(splitResults);

      // Compare page counts
      expect(directResult.result.layoutParsingResults.length).toBe(PAGE_COUNT);
      expect(mergedResult.result.layoutParsingResults.length).toBe(PAGE_COUNT);

      // Compare content of each page
      for (let i = 0; i < PAGE_COUNT; i++) {
        const directPage = directResult.result.layoutParsingResults[i];
        const mergedPage = mergedResult.result.layoutParsingResults[i];

        const directBlocks = directPage.prunedResult.parsing_res_list;
        const mergedBlocks = mergedPage.prunedResult.parsing_res_list;

        expect(directBlocks.length).toBe(mergedBlocks.length);

        for (let j = 0; j < directBlocks.length; j++) {
          expect(directBlocks[j].block_label).toBe(mergedBlocks[j].block_label);
          expect(directBlocks[j].block_content).toBe(mergedBlocks[j].block_content);
        }
      }
    });

    it('should maintain coordinate data accuracy', async () => {
      const pdfBytes = await createTestPdf(2);

      // Direct call
      const directResult = await callOcrApi(pdfBytes, OCR_CONFIG);

      // Split-merge
      const chunks = await splitPdf(pdfBytes, 1);
      const splitResults = [];

      for (const chunk of chunks) {
        const result = await callOcrApi(chunk.chunk, OCR_CONFIG);
        splitResults.push({
          result,
          metadata: { startPage: chunk.startPage, endPage: chunk.endPage },
        });
      }

      const mergedResult = mergeOcrResults(splitResults);

      // Compare coordinates
      for (let i = 0; i < 2; i++) {
        const directBlocks = directResult.result.layoutParsingResults[i].prunedResult.parsing_res_list;
        const mergedBlocks = mergedResult.result.layoutParsingResults[i].prunedResult.parsing_res_list;

        for (let j = 0; j < directBlocks.length; j++) {
          const directBbox = directBlocks[j].block_bbox;
          const mergedBbox = mergedBlocks[j].block_bbox;

          // Allow ±1 pixel error margin
          for (let k = 0; k < directBbox.length; k++) {
            expect(Math.abs(directBbox[k] - mergedBbox[k])).toBeLessThanOrEqual(1);
          }
        }
      }
    });
  });
});

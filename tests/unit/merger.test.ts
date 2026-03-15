/**
 * Unit tests for result merger functionality
 * Tests use mock data, no real OCR API required
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { mergeOcrResults } from '../../src/result-merger.js';
import type { OcrResult, ChunkMetadata } from '../../src/types.js';

describe('mergeOcrResults', () => {
  // Create mock OCR result
  function createMockOcrResult(startPage: number, pageCount: number): OcrResult {
    const layoutParsingResults = [];

    for (let i = 0; i < pageCount; i++) {
      const pageNum = startPage + i;

      layoutParsingResults.push({
        prunedResult: {
          page_count: 1,
          width: 800,
          height: 1000,
          model_settings: {
            use_doc_preprocessor: true,
            use_layout_detection: true,
            use_chart_recognition: false,
            use_seal_recognition: false,
            use_ocr_for_image_block: true,
            format_block_content: true,
            merge_layout_blocks: true,
            markdown_ignore_labels: [],
            return_layout_polygon_points: true,
          },
          parsing_res_list: [
            {
              block_label: 'text',
              block_content: `Page ${pageNum} content`,
              block_bbox: [100, 100, 700, 200],
              block_id: i,
              block_order: 0,
              group_id: 0,
              block_polygon_points: [
                [100, 100],
                [700, 100],
                [700, 200],
                [100, 200],
              ],
            },
          ],
        },
        markdown: { text: `Page ${pageNum}`, images: {} },
        outputImages: null,
        inputImage: null,
      });
    }

    return {
      logId: `log_${startPage}_${Date.now()}`,
      errorCode: 0,
      errorMsg: '',
      result: {
        layoutParsingResults,
        dataInfo: {
          type: 'pdf',
          numPages: pageCount,
          pages: Array(pageCount).fill({ width: 800, height: 1000 }),
        },
      },
    };
  }

  describe('Basic functionality', () => {
    it('should throw error when results array is empty', () => {
      expect(() => mergeOcrResults([])).toThrow('No results to merge');
    });

    it('should return the result directly when only one result', () => {
      const mockResult = createMockOcrResult(1, 2);
      const results = [{ result: mockResult, metadata: { startPage: 1, endPage: 2 } }];

      const merged = mergeOcrResults(results);

      expect(merged).toBe(mockResult);
    });

    it('should merge multiple results', () => {
      const chunk1 = { result: createMockOcrResult(1, 2), metadata: { startPage: 1, endPage: 2 } };
      const chunk2 = { result: createMockOcrResult(3, 2), metadata: { startPage: 3, endPage: 4 } };

      const merged = mergeOcrResults([chunk1, chunk2]);

      expect(merged.result.layoutParsingResults).toHaveLength(4);
      expect(merged.result.dataInfo.numPages).toBe(4);
    });
  });

  describe('dataInfo merging', () => {
    it('should correctly merge dataInfo', () => {
      const chunk1 = {
        result: createMockOcrResult(1, 2),
        metadata: { startPage: 1, endPage: 2 },
      };
      const chunk2 = {
        result: createMockOcrResult(3, 1),
        metadata: { startPage: 3, endPage: 3 },
      };

      const merged = mergeOcrResults([chunk1, chunk2]);

      expect(merged.result.dataInfo.type).toBe('pdf');
      expect(merged.result.dataInfo.numPages).toBe(3);
      expect(merged.result.dataInfo.pages).toHaveLength(3);
    });

    it('should preserve all page size information', () => {
      const chunk1 = { result: createMockOcrResult(1, 2), metadata: { startPage: 1, endPage: 2 } };
      const chunk2 = { result: createMockOcrResult(3, 1), metadata: { startPage: 3, endPage: 3 } };

      const merged = mergeOcrResults([chunk1, chunk2]);

      merged.result.dataInfo.pages.forEach((page) => {
        expect(page.width).toBe(800);
        expect(page.height).toBe(1000);
      });
    });
  });

  describe('preprocessedImages merging', () => {
    it('should merge preprocessedImages', () => {
      const result1 = createMockOcrResult(1, 1);
      const result2 = createMockOcrResult(2, 1);

      (result1.result as any).preprocessedImages = ['image1.jpg'];
      (result2.result as any).preprocessedImages = ['image2.jpg'];

      const chunk1 = { result: result1, metadata: { startPage: 1, endPage: 1 } };
      const chunk2 = { result: result2, metadata: { startPage: 2, endPage: 2 } };

      const merged = mergeOcrResults([chunk1, chunk2]);

      expect((merged.result as any).preprocessedImages).toEqual(['image1.jpg', 'image2.jpg']);
    });

    it('should handle missing preprocessedImages', () => {
      const chunk1 = { result: createMockOcrResult(1, 1), metadata: { startPage: 1, endPage: 1 } };
      const chunk2 = { result: createMockOcrResult(2, 1), metadata: { startPage: 2, endPage: 2 } };

      const merged = mergeOcrResults([chunk1, chunk2]);

      expect((merged.result as any).preprocessedImages).toBeUndefined();
    });
  });

  describe('parsing_res_list structure preservation', () => {
    it('should keep block_bbox as number array', () => {
      const chunk1 = { result: createMockOcrResult(1, 1), metadata: { startPage: 1, endPage: 1 } };

      const merged = mergeOcrResults([chunk1]);

      const block = merged.result.layoutParsingResults[0].prunedResult.parsing_res_list[0];
      expect(block.block_bbox).toEqual([100, 100, 700, 200]);
      expect(Array.isArray(block.block_bbox)).toBe(true);
      expect(typeof block.block_bbox[0]).toBe('number');
    });

    it('should keep block_polygon_points as 2D number array', () => {
      const chunk1 = { result: createMockOcrResult(1, 1), metadata: { startPage: 1, endPage: 1 } };

      const merged = mergeOcrResults([chunk1]);

      const block = merged.result.layoutParsingResults[0].prunedResult.parsing_res_list[0];
      expect(block.block_polygon_points).toEqual([
        [100, 100],
        [700, 100],
        [700, 200],
        [100, 200],
      ]);
      expect(Array.isArray(block.block_polygon_points)).toBe(true);
      expect(Array.isArray(block.block_polygon_points[0])).toBe(true);
      expect(typeof block.block_polygon_points[0][0]).toBe('number');
    });
  });

  describe('page number adjustment', () => {
    it('should adjust page number fields in blocks', () => {
      const result1 = createMockOcrResult(1, 1);
      const result2 = createMockOcrResult(2, 1);

      // Add page number field
      (result1.result.layoutParsingResults[0].prunedResult.parsing_res_list[0] as any).page_num = 1;
      (result2.result.layoutParsingResults[0].prunedResult.parsing_res_list[0] as any).page_num = 1;

      const chunk1 = { result: result1, metadata: { startPage: 1, endPage: 1 } };
      const chunk2 = { result: result2, metadata: { startPage: 2, endPage: 2 } };

      const merged = mergeOcrResults([chunk1, chunk2]);

      const block1 = merged.result.layoutParsingResults[0].prunedResult.parsing_res_list[0];
      const block2 = merged.result.layoutParsingResults[1].prunedResult.parsing_res_list[0];

      expect((block1 as any).page_num).toBe(1);
      expect((block2 as any).page_num).toBe(2); // 1 + 2 - 1 = 2
    });

    it('should recursively adjust page numbers in nested objects', () => {
      const result1 = createMockOcrResult(1, 1);
      const result2 = createMockOcrResult(2, 1);

      // Add nested page number field
      (result1.result.layoutParsingResults[0].prunedResult.parsing_res_list[0] as any).nested = {
        page_id: 1,
      };
      (result2.result.layoutParsingResults[0].prunedResult.parsing_res_list[0] as any).nested = {
        page_id: 1,
      };

      const chunk1 = { result: result1, metadata: { startPage: 1, endPage: 1 } };
      const chunk2 = { result: result2, metadata: { startPage: 2, endPage: 2 } };

      const merged = mergeOcrResults([chunk1, chunk2]);

      const block1 = merged.result.layoutParsingResults[0].prunedResult.parsing_res_list[0];
      const block2 = merged.result.layoutParsingResults[1].prunedResult.parsing_res_list[0];

      expect((block1 as any).nested.page_id).toBe(1);
      expect((block2 as any).nested.page_id).toBe(2);
    });
  });
});

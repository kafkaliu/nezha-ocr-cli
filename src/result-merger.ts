import type { OcrResult, ChunkMetadata, LayoutParsingResult, PrunedResult, ParsingResList } from './types.js';

/**
 * Merge OCR results from multiple PDF chunks into a single result.
 * Adjusts page numbers and other relevant data accordingly.
 */
export function mergeOcrResults(
  results: Array<{ result: OcrResult; metadata: ChunkMetadata }>
): OcrResult {
  if (results.length === 0) {
    throw new Error('No results to merge');
  }

  if (results.length === 1) {
    return results[0].result;
  }

  // Get all properties from the first result
  const firstResult = results[0].result;
  const merged: OcrResult = {
    logId: firstResult.logId,
    errorCode: firstResult.errorCode,
    errorMsg: firstResult.errorMsg,
    result: {
      layoutParsingResults: [],
      dataInfo: {
        type: 'pdf',
        numPages: 0,
        pages: [],
      },
    },
  };

  // Merge layout parsing results from all chunks
  const allPreprocessedImages: string[] = [];
  const allPages: Array<{ width: number; height: number }> = [];

  for (const { result, metadata } of results) {
    const layoutParsingResults = result.result.layoutParsingResults || [];
    const preprocessedImages = (result.result as any).preprocessedImages || [];
    const dataInfo = (result.result as any).dataInfo;

    for (const layoutResult of layoutParsingResults) {
      // Adjust page numbers and other relevant data
      const adjustedResult = adjustLayoutParsingResult(layoutResult, metadata.startPage);
      merged.result.layoutParsingResults.push(adjustedResult);
    }

    // Collect preprocessed images
    allPreprocessedImages.push(...preprocessedImages);

    // Collect page info from dataInfo
    if (dataInfo?.pages) {
      allPages.push(...dataInfo.pages);
    }
  }

  // Merge dataInfo if present
  if (allPages.length > 0) {
    (merged.result as any).dataInfo = {
      type: 'pdf',
      numPages: allPages.length,
      pages: allPages,
    };
  }

  // Merge preprocessedImages if present
  if (allPreprocessedImages.length > 0) {
    (merged.result as any).preprocessedImages = allPreprocessedImages;
  }

  return merged;
}

/**
 * Adjust page numbers in a layout parsing result based on the chunk's start page.
 */
function adjustLayoutParsingResult(
  layoutResult: LayoutParsingResult,
  pageOffset: number
): LayoutParsingResult {
  const adjustedResult: LayoutParsingResult = {
    ...layoutResult,
    prunedResult: adjustPrunedResult(layoutResult.prunedResult, pageOffset),
  };

  return adjustedResult;
}

/**
 * Adjust page numbers in a pruned result based on the chunk's start page.
 */
function adjustPrunedResult(
  prunedResult: PrunedResult,
  pageOffset: number
): PrunedResult {
  const adjustedResult: PrunedResult = {
    ...prunedResult,
    parsing_res_list: prunedResult.parsing_res_list.map((block) =>
      adjustParsingResList(block, pageOffset)
    ),
  };

  return adjustedResult;
}

/**
 * Adjust page numbers in a parsing result list item based on the chunk's start page.
 * This function recursively handles nested structures.
 */
function adjustParsingResList(
  block: ParsingResList,
  pageOffset: number
): ParsingResList {
  const adjustedBlock: ParsingResList = { ...block };

  // Keys that should NOT be recursively processed (primitive arrays or special structures)
  const SKIP_KEYS = new Set([
    'block_bbox',              // number[] - bounding box coordinates
    'block_polygon_points',    // number[][] - polygon point coordinates
    'coordinate',              // number[] - coordinates in layout_det_res
    'polygon_points',          // number[][] - polygon points in layout_det_res
  ]);

  // Adjust any page-related properties if they exist
  const pageKeys = ['page', 'page_num', 'page_num_id', 'page_id'];

  for (const key of pageKeys) {
    if (key in adjustedBlock && typeof adjustedBlock[key] === 'number') {
      adjustedBlock[key] = ((adjustedBlock[key] as number) + pageOffset - 1) as never;
    }
  }

  // Recursively adjust nested objects and arrays
  for (const [key, value] of Object.entries(adjustedBlock)) {
    // Skip page keys, non-object values, and known skip keys
    if (pageKeys.includes(key) || SKIP_KEYS.has(key) || value === null || typeof value !== 'object') {
      continue;
    }

    if (Array.isArray(value)) {
      // This is an array of objects (not a primitive array), recursively process each item
      adjustedBlock[key] = value.map((item) =>
        adjustParsingResList(item as ParsingResList, pageOffset)
      ) as never;
    } else {
      // This is a nested object, recursively process it
      adjustedBlock[key] = adjustParsingResList(value as ParsingResList, pageOffset) as never;
    }
  }

  return adjustedBlock;
}

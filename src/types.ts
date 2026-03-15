// ============================================
// Type definitions for PaddleOCR API
// Based on official API documentation
// ============================================

/**
 * OCR API request options
 */
export interface OcrOptions {
  apiUrl: string;
  token: string;
  fileType: number; // 0 for PDF, 1 for images
  useDocOrientationClassify?: boolean;
  useDocUnwarping?: boolean;
  useChartRecognition?: boolean;
}

/**
 * OCR API response result
 */
export interface OcrResult {
  logId: string;
  errorCode: number;
  errorMsg: string;
  result: OcrResultData;
}

/**
 * OCR result data
 */
export interface OcrResultData {
  /** Layout parsing results array */
  layoutParsingResults: LayoutParsingResult[];
  /** Input data information */
  dataInfo: DataInfo;
  /** Preprocessed images (Base64 encoded JPEG) */
  preprocessedImages?: string[];
}

/**
 * Input data information
 */
export interface DataInfo {
  /** Data type */
  type: 'pdf' | 'image';
  /** Number of pages */
  numPages: number;
  /** Page size information */
  pages: Array<{
    width: number;
    height: number;
  }>;
}

/**
 * Layout parsing result (single page)
 */
export interface LayoutParsingResult {
  /** Simplified version of predict method result */
  prunedResult: PrunedResult;
  /** Markdown result */
  markdown: MarkdownResult;
  /** Output images (Base64 encoded JPEG) */
  outputImages: OutputImages | null;
  /** Input image (Base64 encoded JPEG) */
  inputImage: string | null;
}

/**
 * Markdown result
 */
export interface MarkdownResult {
  /** Markdown text */
  text: string;
  /** Markdown image paths and Base64 encoded images */
  images: Record<string, string>;
}

/**
 * Output images
 */
export interface OutputImages {
  /** Layout detection visualization (Base64 encoded JPEG) */
  layout_det_res?: string;
}

/**
 * PrunedResult - simplified version of predict method result
 */
export interface PrunedResult {
  /** Page count */
  page_count: number;
  /** Page width */
  width: number;
  /** Page height */
  height: number;
  /** Model settings */
  model_settings: ModelSettings;
  /** Parsing result list */
  parsing_res_list: ParsingResList[];
  /** Document preprocessing result */
  doc_preprocessor_res?: DocPreprocessorRes;
  /** Layout detection result */
  layout_det_res?: LayoutDetectionRes;
}

/**
 * Model settings
 */
export interface ModelSettings {
  use_doc_preprocessor: boolean;
  use_layout_detection: boolean;
  use_chart_recognition: boolean;
  use_seal_recognition: boolean;
  use_ocr_for_image_block: boolean;
  format_block_content: boolean;
  merge_layout_blocks: boolean;
  markdown_ignore_labels: string[];
  return_layout_polygon_points: boolean;
}

/**
 * Document preprocessing result
 */
export interface DocPreprocessorRes {
  model_settings: {
    use_doc_orientation_classify: boolean;
    use_doc_unwarping: boolean;
  };
  /** Document angle (0, 90, 180, 270) */
  angle: number;
}

/**
 * Layout detection result
 */
export interface LayoutDetectionRes {
  boxes: LayoutBox[];
}

/**
 * Layout box
 */
export interface LayoutBox {
  /** Class ID */
  cls_id: number;
  /** Class label */
  label: string;
  /** Confidence score */
  score: number;
  /** Coordinates [x1, y1, x2, y2] */
  coordinate: number[];
  /** Order */
  order: number;
  /** Polygon point coordinates [[x1, y1], [x2, y2], ...] */
  polygon_points: number[][];
}

/**
 * Parsing result list item
 */
export interface ParsingResList extends Record<string, unknown> {
  /** Block label */
  block_label: string;
  /** Block content (OCR recognized text) */
  block_content: string;
  /** Bounding box coordinates [x1, y1, x2, y2] */
  block_bbox: number[];
  /** Block ID */
  block_id: number;
  /** Block order */
  block_order: number;
  /** Group ID */
  group_id: number;
  /** Polygon point coordinates [[x1, y1], [x2, y2], ...] */
  block_polygon_points: number[][];
}

/** @deprecated Use LayoutParsingResult instead */
export interface LayoutBlock {
  type: string;
  bbox: number[];
  text?: string;
}

/**
 * Chunk metadata
 */
export interface ChunkMetadata {
  startPage: number;
  endPage: number;
}

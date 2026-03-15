import axios from 'axios';
import type { OcrOptions, OcrResult } from './types.js';

/**
 * Call PaddleOCR API for a single PDF chunk
 */
export async function callOcrApi(
  pdfBytes: Uint8Array,
  options: OcrOptions
): Promise<OcrResult> {
  // Convert PDF bytes to base64
  const base64Data = Buffer.from(pdfBytes).toString('base64');

  const payload = {
    file: base64Data,
    fileType: options.fileType,
    useDocOrientationClassify: options.useDocOrientationClassify ?? false,
    useDocUnwarping: options.useDocUnwarping ?? false,
    useChartRecognition: options.useChartRecognition ?? false,
  };

  try {
    const response = await axios.post(options.apiUrl, payload, {
      headers: {
        Authorization: `token ${options.token}`,
        'Content-Type': 'application/json',
      },
      timeout: 120000, // 2 minutes timeout
    });

    if (response.status !== 200) {
      throw new Error(`API returned status ${response.status}`);
    }

    return response.data as OcrResult;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new Error(
          `API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
        );
      } else if (error.request) {
        throw new Error(`No response from API: ${error.message}`);
      }
    }
    throw error;
  }
}

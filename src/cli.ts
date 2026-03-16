#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import { splitPdf } from './pdf-splitter.js';
import { callOcrApi } from './ocr-client.js';
import { mergeOcrResults } from './result-merger.js';
import type { OcrOptions, OcrResult, ChunkMetadata } from './types.js';

const program = new Command();

program
  .name('nezha-ocr')
  .description('CLI tool to convert PDF to JSON-AST using PaddleOCR API')
  .version('0.1.0')
  .argument('<pdfFile>', 'Path to the PDF file to process')
  .option('-u, --api-url <url>', 'PaddleOCR API URL', process.env.OCR_API_URL)
  .option('-t, --token <token>', 'PaddleOCR API token', process.env.OCR_API_TOKEN)
  .option('-o, --output <file>', 'Output file name (if not specified, prints to stdout)')
  .option('-f, --format <format>', 'Output format (json)', 'json')
  .option('-m, --max-pages <number>', 'Maximum pages per API call', '50')
  .option('--file-type <type>', 'File type (0 for PDF, 1 for images)', '0')
  .option('--use-doc-orientation-classify', 'Use document orientation classification')
  .option('--use-doc-unwarping', 'Use document unwarping')
  .option('--use-chart-recognition', 'Use chart recognition')
  .action(async (pdfFile: string, options) => {
    try {
      // Validate required options
      if (!options.apiUrl) {
        throw new Error('API URL is required. Provide via OCR_API_URL env var or --api-url option');
      }
      if (!options.token) {
        throw new Error('API token is required. Provide via OCR_API_TOKEN env var or --token option');
      }

      // Check if PDF file exists
      if (!fs.existsSync(pdfFile)) {
        throw new Error(`PDF file not found: ${pdfFile}`);
      }

      // Read PDF file
      const pdfBuffer = fs.readFileSync(pdfFile);
      const pdfBytes = new Uint8Array(pdfBuffer);

      const maxPages = parseInt(options.maxPages, 10);
      if (isNaN(maxPages) || maxPages <= 0) {
        throw new Error('Invalid max-pages value. Must be a positive integer.');
      }

      // Prepare OCR options
      const ocrOptions: OcrOptions = {
        apiUrl: options.apiUrl,
        token: options.token,
        fileType: parseInt(options.fileType, 10) as 0 | 1,
        useDocOrientationClassify: options.useDocOrientationClassify,
        useDocUnwarping: options.useDocUnwarping,
        useChartRecognition: options.useChartRecognition,
      };

      // Process the PDF
      // The PaddleOCR API has a page limit (typically 100 pages per request).
      // For PDFs exceeding this limit, we split and process in chunks.
      console.error(`Processing PDF (size: ${(pdfBytes.length / 1024 / 1024).toFixed(2)} MB)...`);

      let mergedResult;
      const splitThreshold = parseInt(options.maxPages, 10);

      // Check if PDF needs to be split
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const totalPages = pdfDoc.getPageCount();
      console.error(`PDF has ${totalPages} pages (split threshold: ${splitThreshold})`);

      if (totalPages > splitThreshold) {
        // Split PDF and process each chunk
        console.error(`Splitting PDF into chunks of max ${splitThreshold} pages...`);
        const chunks = await splitPdf(pdfBytes, splitThreshold);
        console.error(`Processing ${chunks.length} chunk(s)...`);

        const results: Array<{ result: OcrResult; metadata: ChunkMetadata }> = [];

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          console.error(`  Processing chunk ${i + 1}/${chunks.length} (pages ${chunk.startPage}-${chunk.endPage})...`);

          const result = await callOcrApi(chunk.chunk, ocrOptions);
          results.push({
            result,
            metadata: { startPage: chunk.startPage, endPage: chunk.endPage },
          });
        }

        // Merge results from all chunks
        console.error(`Merging results from ${chunks.length} chunk(s)...`);
        mergedResult = mergeOcrResults(results);
      } else {
        // Process entire PDF at once
        const result = await callOcrApi(pdfBytes, ocrOptions);
        mergedResult = result;
      }

      // Output result
      const outputData =
        options.format === 'json'
          ? JSON.stringify(mergedResult, null, 2)
          : mergedResult;

      if (options.output) {
        fs.writeFileSync(options.output, typeof outputData === 'string' ? outputData : JSON.stringify(outputData));
        console.error(`Result written to ${options.output}`);
      } else {
        console.log(outputData);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.stack) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program.parseAsync();

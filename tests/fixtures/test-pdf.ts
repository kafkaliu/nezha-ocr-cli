/**
 * Test PDF generation utilities
 * Used to generate various types of test PDFs with rich content
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

export interface TestPdfOptions {
  pageCount: number;
  title?: string;
  includeTables?: boolean;
  includeLists?: boolean;
  includeCode?: boolean;
  includeImages?: boolean;
  includeFootnotes?: boolean;
  includeCrossPageText?: boolean;
  includeEmbeddedImages?: boolean;
}

interface Footnote {
  number: number;
  text: string;
}

interface ImagePlaceholder {
  x: number;
  y: number;
  width: number;
  height: number;
  caption?: string;
}

/**
 * Draw a placeholder image (rectangle with label)
 */
function drawPlaceholderImage(
  page: any,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  font: any
) {
  // Draw rectangle border
  page.drawRectangle({
    x,
    y: y - height,
    width,
    height,
    borderColor: rgb(0.3, 0.3, 0.3),
    borderWidth: 1,
  });

  // Draw label
  page.drawText(label, {
    x: x + width / 2 - (label.length * 3),
    y: y - height / 2 - 5,
    size: 10,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });
}

/**
 * Generate standard test PDF with rich content
 */
export async function generateStandardTestPdf(options: TestPdfOptions = {}): Promise<Uint8Array> {
  const {
    pageCount = 4,
    title = 'OCR Test Document',
    includeTables = true,
    includeLists = true,
    includeCode = true,
    includeImages = true,
    includeFootnotes = true,
    includeCrossPageText = true,
    includeEmbeddedImages = true,
  } = options;

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontCourier = await pdfDoc.embedFont(StandardFonts.Courier);

  const PAGE_WIDTH = 595;
  const PAGE_HEIGHT = 842;
  const MARGIN = 50;
  const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
  const FOOTNOTE_HEIGHT = 100;

  // Track footnotes
  const footnotes: Footnote[] = [];
  let footnoteNumber = 1;

  // Page 1: Title, introduction with images and footnotes
  {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    // Title
    page.drawText(title, {
      x: MARGIN,
      y,
      size: 24,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    y -= 40;

    page.drawText('A Comprehensive Test for OCR API', {
      x: MARGIN,
      y,
      size: 14,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 50;

    // Chapter title
    page.drawText('Chapter 1: Introduction', {
      x: MARGIN,
      y,
      size: 18,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    y -= 30;

    // Paragraph with footnote reference
    const introText = 'This document is designed to test the OCR capabilities. It contains various types of content including titles, paragraphs, and different font styles. The system should be able to recognize footnotes¹ and other elements.';
    const introLines = wrapText(introText, CONTENT_WIDTH, font, 12);
    for (const line of introLines) {
      page.drawText(line, {
        x: MARGIN,
        y,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
      y -= 18;
    }

    if (includeFootnotes) {
      footnotes.push({ number: 1, text: 'Footnotes are reference notes at the bottom of the page.' });
    }

    y -= 20;

    // Add image placeholder
    if (includeImages) {
      drawPlaceholderImage(page, MARGIN, y, 200, 100, '[Image: Logo]', font);
      y -= 120;

      const imageCaption = 'Figure 1: Example logo image²';
      const captionLines = wrapText(imageCaption, CONTENT_WIDTH, font, 10);
      for (const line of captionLines) {
        page.drawText(line, {
          x: MARGIN,
          y,
          size: 10,
          font,
          color: rgb(0.4, 0.4, 0.4),
        });
        y -= 14;
      }

      if (includeFootnotes) {
        footnotes.push({ number: 2, text: 'Images can have captions with additional footnote references.' });
      }
    }

    // Draw footnotes
    if (includeFootnotes) {
      y = FOOTNOTE_HEIGHT;
      page.drawLine({
        start: { x: MARGIN, y: y + 20 },
        end: { x: PAGE_WIDTH - MARGIN, y: y + 20 },
        thickness: 1,
        color: rgb(0, 0, 0),
      });

      for (const footnote of footnotes) {
        const footnoteText = `${footnote.number}. ${footnote.text}`;
        page.drawText(footnoteText, {
          x: MARGIN,
          y,
          size: 9,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });
        y -= 14;
      }
    }

    page.drawText('Page 1', {
      x: PAGE_WIDTH / 2 - 20,
      y: 30,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  // Page 2: Lists and Code
  if (pageCount >= 2) {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    page.drawText('Chapter 2: Features and Code', {
      x: MARGIN,
      y,
      size: 18,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    y -= 40;

    // Feature list
    page.drawText('Key Features:', {
      x: MARGIN,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    y -= 25;

    const listItems = [
      '• Multi-language support for English, Chinese, Japanese',
      '• High accuracy recognition with 98.5% precision',
      '• Fast processing speed at 120ms per page',
      '• Advanced layout detection and analysis',
      '• Table recognition with structure preservation',
    ];

    for (const item of listItems) {
      page.drawText(item, {
        x: MARGIN + 10,
        y,
        size: 11,
        font,
        color: rgb(0, 0, 0),
      });
      y -= 18;
    }

    y -= 20;

    // Code block
    if (includeCode) {
      page.drawText('Example Code:', {
        x: MARGIN,
        y,
        size: 14,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
      y -= 25;

      // Code background
      const codeBlockHeight = 120;
      page.drawRectangle({
        x: MARGIN,
        y: y - codeBlockHeight,
        width: CONTENT_WIDTH,
        height: codeBlockHeight,
        color: rgb(0.95, 0.95, 0.95),
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
      });

      // Code content
      const codeLines = [
        'function processPdf(pdfData) {',
        '  const result = ocrEngine.analyze(pdfData);',
        '  return {',
        '    text: result.text,',
        '    layout: result.layout',
        '  };',
        '}',
      ];

      let codeY = y - 15;
      for (const line of codeLines) {
        page.drawText(line, {
          x: MARGIN + 10,
          y: codeY,
          size: 10,
          font: fontCourier,
          color: rgb(0.2, 0.2, 0.2),
        });
        codeY -= 14;
      }

      y = codeY - 20;
    }

    page.drawText('Page 2', {
      x: PAGE_WIDTH / 2 - 20,
      y: 30,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  // Page 3: Tables
  if (includeTables && pageCount >= 3) {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    page.drawText('Chapter 3: Data Analysis', {
      x: MARGIN,
      y,
      size: 18,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    y -= 40;

    page.drawText('Performance Metrics:', {
      x: MARGIN,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    y -= 30;

    // Table
    const tableX = MARGIN;
    const colWidth = 120;
    const rowHeight = 25;

    // Table header
    const headers = ['Metric', 'Value', 'Unit'];
    for (let col = 0; col < 3; col++) {
      page.drawRectangle({
        x: tableX + col * colWidth,
        y: y - rowHeight,
        width: colWidth,
        height: rowHeight,
        color: rgb(0.7, 0.7, 0.7),
      });
      page.drawText(headers[col], {
        x: tableX + col * colWidth + 10,
        y: y - rowHeight + 8,
        size: 11,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
    }

    // Table data
    const data = [
      ['Accuracy', '98.5', '%'],
      ['Speed', '120', 'ms/page'],
      ['Pages', '10,000', '/day'],
      ['Memory', '256', 'MB'],
    ];

    for (let row = 0; row < data.length; row++) {
      for (let col = 0; col < data[row].length; col++) {
        const cellY = y - (row + 2) * rowHeight;

        page.drawRectangle({
          x: tableX + col * colWidth,
          y: cellY,
          width: colWidth,
          height: rowHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 0.5,
        });

        page.drawText(data[row][col], {
          x: tableX + col * colWidth + 10,
          y: cellY + 8,
          size: 11,
          font,
          color: rgb(0, 0, 0),
        });
      }
    }

    // Add small image beside table
    if (includeImages) {
      drawPlaceholderImage(page, 400, 200, 150, 80, '[Chart]', font);
    }

    page.drawText('Page 3', {
      x: PAGE_WIDTH / 2 - 20,
      y: 30,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  // Page 4: Cross-page text and embedded images
  if (pageCount >= 4 && includeCrossPageText) {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    page.drawText('Chapter 4: Advanced Features', {
      x: MARGIN,
      y,
      size: 18,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    y -= 30;

    // Long text that will span across pages
    const longText = `This chapter demonstrates the OCR system's ability to handle continuous text that spans multiple pages. The system should correctly identify the text flow and maintain the logical structure across page boundaries.

Paragraph two continues the discussion about advanced OCR features. Modern OCR systems can handle complex layouts, multiple languages, and various document types. The technology has evolved significantly over the years.

Paragraph three discusses specific challenges in OCR processing. These include handling low-quality scans, recognizing handwritten text, and dealing with complex page layouts. The system uses advanced machine learning algorithms to address these challenges.`;

    const textLines = wrapText(longText, CONTENT_WIDTH, font, 11);

    // Draw text until near bottom of page
    for (const line of textLines) {
      if (y < MARGIN + 50) {
        break; // Stop near bottom of page
      }
      page.drawText(line, {
        x: MARGIN,
        y,
        size: 11,
        font,
        color: rgb(0, 0, 0),
      });
      y -= 16;
    }

    // Add embedded image in middle of text
    if (includeEmbeddedImages) {
      y -= 20;
      drawPlaceholderImage(page, MARGIN, y, 300, 120, '[Diagram: Process Flow]', font);
      y -= 130;

      const imageCaption = 'Figure 2: The above diagram shows the OCR processing workflow³';
      const captionLines = wrapText(imageCaption, CONTENT_WIDTH, font, 10);
      for (const line of captionLines) {
        page.drawText(line, {
          x: MARGIN,
          y,
          size: 10,
          font,
          color: rgb(0.4, 0.4, 0.4),
        });
        y -= 14;
      }
    }

    page.drawText('Page 4', {
      x: PAGE_WIDTH / 2 - 20,
      y: 30,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  // Page 5: Continuation of cross-page text
  if (pageCount >= 5 && includeCrossPageText) {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    // Continuation text
    const continuationText = `Chapter 4 (Continued): The previous page introduced the concept of advanced OCR features. This page continues with more detailed information.

Paragraph five discusses real-world applications. OCR technology is widely used in document digitization, automated data entry, and accessibility tools for visually impaired users. Each application has specific requirements and challenges.

Paragraph six concludes our discussion. The future of OCR technology looks promising, with ongoing research improving accuracy and expanding capabilities. Integration with artificial intelligence and machine learning continues to enhance performance.`;

    const continuationLines = wrapText(continuationText, CONTENT_WIDTH, font, 11);

    for (const line of continuationLines) {
      page.drawText(line, {
        x: MARGIN,
        y,
        size: 11,
        font,
        color: rgb(0, 0, 0),
      });
      y -= 16;
    }

    page.drawText('Page 5', {
      x: PAGE_WIDTH / 2 - 20,
      y: 30,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  return await pdfDoc.save();
}

/**
 * Generate simple test PDF (for quick testing)
 */
export async function generateSimpleTestPdf(pageCount: number): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (let i = 1; i <= pageCount; i++) {
    const page = pdfDoc.addPage([500, 700]);
    const { width, height } = page.getSize();

    page.drawText(`Page ${i}`, {
      x: 50,
      y: height - 50,
      size: 24,
      font: fontBold,
      color: rgb(0, 0, 0),
    });

    const content = `This is the content of page ${i}.\nIt contains multiple lines of text.`;
    const lines = wrapText(content, width - 100, font, 14);
    let y = height - 120;
    for (const line of lines) {
      page.drawText(line, {
        x: 50,
        y,
        size: 14,
        font,
        color: rgb(0, 0, 0),
      });
      y -= 20;
    }

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

/**
 * Text wrapping helper function
 */
function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  // First split by newlines to preserve paragraphs
  const paragraphs = text.split('\n');
  const allLines: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph === '') {
      allLines.push('');
      continue;
    }

    const words = paragraph.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);

      if (width < maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    allLines.push(...lines);
  }

  return allLines;
}

/**
 * Generate and save test PDF to file
 */
export async function saveTestPdf(
  filename: string,
  options: TestPdfOptions = {}
): Promise<void> {
  const pdfBytes = await generateStandardTestPdf(options);

  const outputPath = path.resolve(process.cwd(), 'test-data', filename);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, pdfBytes);

  console.log(`✓ Test PDF generated: ${filename}`);
  console.log(`  Size: ${(pdfBytes.length / 1024).toFixed(2)} KB`);
  console.log(`  Pages: ${options.pageCount || 4}`);
  console.log(`  Features: ${Object.entries(options)
    .filter(([k, v]) => v === true && k !== 'pageCount' && k !== 'title')
    .map(([k]) => k)
    .join(', ') || 'all'}`);
}

/**
 * CLI entry point
 */
export async function main() {
  const args = process.argv.slice(2);
  const filename = args[0] || 'test-document-4pages.pdf';
  const pageCount = parseInt(args[1]) || 4;

  await saveTestPdf(filename, {
    pageCount,
    includeTables: true,
    includeLists: true,
    includeCode: true,
    includeImages: true,
    includeFootnotes: true,
    includeCrossPageText: true,
    includeEmbeddedImages: true,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

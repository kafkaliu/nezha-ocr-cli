# nezha-ocr-cli

[中文版](README_zh.md)

A CLI tool to convert PDF documents to JSON-AST format using PaddleOCR API.

## Features

- 📄 **PDF Processing**: Support for multi-page PDF document OCR recognition
- 🔄 **Split and Merge**: Automatic splitting for large files, with automatic result merging
- 📊 **Structured Output**: Returns structured data including text, layout, tables, and more
- 🎯 **High Accuracy**: Support for document orientation classification, table recognition, and other advanced features

## Installation

```bash
npm install -g @kafkaliu/nezha-ocr-cli
```

After installation, use the `nezha-ocr` command to run.

Or use npx directly (no installation required):

```bash
npx @kafkaliu/nezha-ocr-cli input.pdf
```

## Usage

### Basic Usage

```bash
nezha-ocr input.pdf
```

### Output to File

```bash
nezha-ocr input.pdf -o output.json
```

### Using Environment Variables

```bash
OCR_API_URL="https://your-api-url.com" \
OCR_API_TOKEN="your-token" \
nezha-ocr input.pdf -o output.json
```

### Command Line Options

| Option | Short | Description | Default |
|--------|-------|-------------|----------|
| `--api-url <url>` | `-u` | PaddleOCR API URL | `OCR_API_URL` env var |
| `--token <token>` | `-t` | PaddleOCR API token | `OCR_API_TOKEN` env var |
| `--output <file>` | `-o` | Output file name | stdout |
| `--format <format>` | `-f` | Output format | json |
| `--max-pages <number>` | `-m` | Maximum pages per API call | 100 |
| `--file-type <type>` | | File type (0=PDF, 1=images) | 0 |
| `--use-doc-orientation-classify` | | Use document orientation classification | false |
| `--use-doc-unwarping` | | Use document unwarping | false |
| `--use-chart-recognition` | | Use chart recognition | false |

## Output Format

The OCR API returns data in the following structure:

```typescript
{
  logId: string;
  errorCode: number;
  errorMsg: string;
  result: {
    layoutParsingResults: [
      {
        prunedResult: {
          page_count: number;
          width: number;
          height: number;
          model_settings: ModelSettings;
          parsing_res_list: [
            {
              block_label: string;      // Block type (text, title, table, etc.)
              block_content: string;     // OCR recognized text
              block_bbox: number[];      // Bounding box [x1, y1, x2, y2]
              block_id: number;
              block_order: number;
              group_id: number;
              block_polygon_points: number[][];  // Polygon coordinates
            }
          ];
        };
        markdown: {
          text: string;
          images: Record<string, string>;
        };
      }
    ];
    dataInfo: {
      type: 'pdf' | 'image';
      numPages: number;
      pages: Array<{ width: number; height: number }>;
    };
  };
}
```

## Development

### Install Dependencies

```bash
npm install
```

### Build

```bash
npm run build
```

### Run Tests

```bash
# Run all tests (unit tests only, no API required)
npm test

# Run only unit tests
npm run test:unit

# Run integration tests (requires OCR environment variables)
npm run test:integration

# Watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Environment Variables

Integration tests require the following environment variables:

```bash
export OCR_API_URL="https://your-api-url.com/layout-parsing"
export OCR_API_TOKEN="your-api-token"
```

If these are not set, integration tests will be skipped.

### Generate Test PDF

```bash
npm run test:fixtures
```

This generates a test PDF file in the `test-data/` directory.

## Project Structure

```
nezha-ocr-cli/
├── src/                    # Source code
│   ├── cli.ts             # CLI entry point
│   ├── ocr-client.ts      # OCR API client
│   ├── pdf-splitter.ts    # PDF splitting
│   ├── result-merger.ts   # Result merging
│   └── types.ts           # Type definitions
├── tests/                  # Test code
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   ├── fixtures/          # Test utilities
│   └── setup.ts           # Test configuration
├── test-data/             # Test data
├── dist/                  # Build output
└── package.json
```

## License

MIT

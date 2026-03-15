# nezha-ocr-cli

[English Version](README.md)

使用 PaddleOCR API 将 PDF 文档转换为 JSON-AST 格式的 CLI 工具。

## 功能特性

- 📄 **PDF 文档处理**：支持多页 PDF 文档的 OCR 识别
- 🔄 **分拆合并**：大文件自动分拆处理，结果自动合并
- 📊 **结构化输出**：返回包含文本、布局、表格等信息的结构化数据
- 🎯 **高精度识别**：支持文档方向分类、表格识别等高级功能

## 安装

```bash
npm install -g @kafkaliu/nezha-ocr-cli
```

安装后使用 `nezha-ocr` 命令运行。

或直接使用 npx（无需安装）：

```bash
npx @kafkaliu/nezha-ocr-cli input.pdf
```

## 使用方法

### 基本用法

```bash
nezha-ocr input.pdf
```

### 输出到文件

```bash
nezha-ocr input.pdf -o output.json
```

### 使用环境变量

```bash
OCR_API_URL="https://your-api-url.com" \
OCR_API_TOKEN="your-token" \
nezha-ocr input.pdf -o output.json
```

### 命令行选项

| 选项 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--api-url <url>` | `-u` | PaddleOCR API URL | `OCR_API_URL` 环境变量 |
| `--token <token>` | `-t` | PaddleOCR API token | `OCR_API_TOKEN` 环境变量 |
| `--output <file>` | `-o` | 输出文件名 | 标准输出 |
| `--format <format>` | `-f` | 输出格式 | json |
| `--max-pages <number>` | `-m` | 每个 API 调用的最大页数 | 100 |
| `--file-type <type>` | | 文件类型 (0=PDF, 1=图片) | 0 |
| `--use-doc-orientation-classify` | | 使用文档方向分类 | false |
| `--use-doc-unwarping` | | 使用文档校准 | false |
| `--use-chart-recognition` | | 使用图表识别 | false |

## 输出格式

OCR API 返回的数据结构：

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
              block_label: string;      // 块类型（text, title, table 等）
              block_content: string;     // OCR 识别的文本
              block_bbox: number[];      // 边界框 [x1, y1, x2, y2]
              block_id: number;
              block_order: number;
              group_id: number;
              block_polygon_points: number[][];  // 多边形坐标
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

## 开发

### 安装依赖

```bash
npm install
```

### 构建

```bash
npm run build
```

### 运行测试

```bash
# 运行所有测试（只需单元测试，不需要 API）
npm test

# 只运行单元测试
npm run test:unit

# 运行集成测试（需要设置 OCR 环境变量）
npm run test:integration

# 监视模式
npm run test:watch

# 生成测试覆盖率报告
npm run test:coverage
```

### 测试环境变量

集成测试需要设置以下环境变量：

```bash
export OCR_API_URL="https://your-api-url.com/layout-parsing"
export OCR_API_TOKEN="your-api-token"
```

如果不设置环境变量，集成测试将被跳过。

### 生成测试 PDF

```bash
npm run test:fixtures
```

这会在 `test-data/` 目录下生成测试 PDF 文件。

### 发布新版本

```bash
# 更新版本号并创建 tag（自动更新 package.json）
npm version patch   # 0.1.0 → 0.1.1（修复 bug）
npm version minor   # 0.1.0 → 0.2.0（新功能）
npm version major   # 0.1.0 → 1.0.0（破坏性变更）

# 推送代码和 tag
git push
git push origin v0.1.1
```

推送 tag 后，GitHub Actions 会自动运行测试、构建并发布到 npm。

## 项目结构

```
nezha-ocr-cli/
├── src/                    # 源代码
│   ├── cli.ts             # CLI 入口
│   ├── ocr-client.ts      # OCR API 客户端
│   ├── pdf-splitter.ts    # PDF 分割
│   ├── result-merger.ts   # 结果合并
│   └── types.ts           # 类型定义
├── tests/                  # 测试代码
│   ├── unit/              # 单元测试
│   ├── integration/       # 集成测试
│   ├── fixtures/          # 测试工具
│   └── setup.ts           # 测试配置
├── test-data/             # 测试数据
├── dist/                  # 编译输出
└── package.json
```

## 许可证

MIT

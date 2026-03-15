/**
 * Test environment configuration
 */

// Check if OCR environment variables are set
export const hasOcrEnv = () => {
  return !!process.env.OCR_API_URL && !!process.env.OCR_API_TOKEN;
};

// OCR configuration from environment variables
export const OCR_CONFIG = {
  apiUrl: process.env.OCR_API_URL || '',
  token: process.env.OCR_API_TOKEN || '',
  fileType: 0,
  useDocOrientationClassify: true,
  useDocUnwarping: false,
  useChartRecognition: false,
};

// Skip integration tests if no OCR credentials provided
export const SKIP_INTEGRATION = !hasOcrEnv() && !process.env.CI;

// Print test environment info
export function printTestEnvInfo() {
  console.log('='.repeat(60));
  console.log('Test Environment Configuration');
  console.log('='.repeat(60));
  console.log(`OCR_API_URL: ${OCR_CONFIG.apiUrl || 'Not set'}`);
  console.log(`OCR_API_TOKEN: ${OCR_CONFIG.token ? '*** Set ***' : 'Not set'}`);
  console.log(`Run integration tests: ${SKIP_INTEGRATION ? 'No (requires OCR environment variables)' : 'Yes'}`);
  console.log('='.repeat(60));
  console.log();
}

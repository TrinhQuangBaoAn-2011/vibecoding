import { WebCheck } from './src/lib/webcheckClient.js';

const html = `<html><head><title>Test Website</title></head><body><h1>Heading</h1></body></html>`;

const meta = {
  inputUrl: 'https://example.com',
  finalUrl: 'https://example.com',
  statusCode: 200,
  elapsedMs: 1000,
  robots: { statusCode: 200, text: 'User-agent: *\nAllow: /' },
  sitemap: { statusCode: 200, text: '' }
};

const result = WebCheck.runChecks(html, meta, (h) => new DOMParser().parseFromString(h, 'text/html'));

console.log('Checks count:', result.checks.length);
console.log('Version:', result.version);
console.log('All IDs:', result.checks.map(c => c.id));
console.log('Test PASSED: 22 checks?', result.checks.length === 22);

// Check each check has required fields
const allOk = result.checks.every(c => c.id && c.label && c.detail && c.suggestion && c.group && c.level);
console.log('All checks have required fields:', allOk);

// Check groups
const groups = [...new Set(result.checks.map(c => c.group))];
console.log('Groups:', groups);

// Check levels
const levels = [...new Set(result.checks.map(c => c.level))];
console.log('Levels:', levels);
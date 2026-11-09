import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { reportFileName } from '../../client/src/lib/report.js';

// Mục 4 của phiếu phân công: tên tệp tải về phải đúng dạng webcheck-<host>.txt
describe('reportFileName', () => {
  it('dùng hostname trần', () => {
    assert.equal(reportFileName('example.com'), 'webcheck-example.com.txt');
  });

  it('cắt hostname từ URL đầy đủ', () => {
    assert.equal(reportFileName('https://www.example.vn/path?a=1'), 'webcheck-www.example.vn.txt');
  });

  it('không có hostname hợp lệ -> fallback "website"', () => {
    assert.equal(reportFileName(''), 'webcheck-website.txt');
    assert.equal(reportFileName(null), 'webcheck-website.txt');
    assert.equal(reportFileName('   '), 'webcheck-website.txt');
  });
});

/* Kiểm hàng (smoke check) trước giờ demo/đi thi — phát hiện lỗi "trang trắng"
 * 1 giây thay vì nỗi sợ. Kiểm trên URL bất kỳ: local hoặc prod.
 *
 *  Cách chạy:
 *    npm run smoke                                  (kiểm local: http://localhost:5000)
 *    npm run smoke -- https://webcheck-eta.vercel.app   (kiểm prod)
 *
 *  Kiểm 3 tầng:
 *    1) /api/health  → 200 + status ok + in chế độ AI (ai hay rules-fallback)
 *    2) GET /        → 200, HTML có chữ WEBCHECK, và có link tới file JS bundle
 *    3) GET file JS đó → 200 + MIME javascript (cánh cửa gây "trang trắng" chính là chỗ này)
 */

const base = (process.argv[2] || 'http://localhost:5000').replace(/\/$/, '');
let failed = false;

function line(ok, label, detail) {
  console.log(`${ok ? '  OK ' : '  LỖI'} ${label}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed = true;
}

async function main() {
  console.log(`Smoke check: ${base}\n`);

  // 1) Health
  try {
    const res = await fetch(`${base}/api/health`);
    const json = await res.json();
    const ai = json.ai || {};
    line(res.ok && json.status === 'ok', '/api/health', `service ${json.service || '?'}, AI mode: ${ai.mode || '?'} (model ${ai.model || '?'}), configured: ${ai.configured}`);
  } catch (error) {
    line(false, '/api/health', error.message);
  }

  // 2) Trang chủ trả HTML có nội dung + link bundle JS
  let homeHtml = '';
  try {
    const res = await fetch(base);
    homeHtml = await res.text();
    line(res.ok, 'GET /', `status ${res.status}`);
    line(homeHtml.includes('WEBCHECK'), 'HTML có nội dung app', 'chứa chữ "WEBCHECK"');
    const jsMatch = homeHtml.match(/assets\/index-[\w-]+\.js/);
    if (!jsMatch) {
      line(false, 'HTML trỏ tới bundle JS', 'không tìm thấy assets/index-*.js');
    } else {
      // 3) Tải bundle JS — tầng từng gây trang trắng
      try {
        const jsRes = await fetch(`${base}/${jsMatch[0]}`);
        const mime = (jsRes.headers.get('content-type') || '');
        const okType = jsRes.ok && mime.startsWith('application/javascript');
        line(okType, `GET /${jsMatch[0]} (${jsMatch[0].length} ký tự tên)`, `status ${jsRes.status}, MIME: ${mime.split(';')[0]}`);
      } catch (error) {
        line(false, `GET /${jsMatch[0]}`, error.message);
      }
    }
  } catch (error) {
    line(false, 'GET /', error.message);
  }

  console.log('');
  if (failed) {
    console.log('KẾT QUẢ: CÓ LỖI — đừng demo với URL này, báo nhóm (copy toàn bộ nội dung trên).');
    process.exitCode = 1;
  } else {
    console.log('KẾT QUẢ: ĐẠT — có thể đi demo với URL này an toàn.');
  }
}

await main();

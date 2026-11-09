import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { config } from './config.js';
import analyzeRoutes from './routes/analyze.js';
import aiReviewRoutes from './routes/aiReview.js';
import healthRoutes from './routes/health.js';
import { webcheckToolRouter } from './routes/webcheckTool.js';
import { errorPayload } from './lib/errors.js';

const app = express();
app.disable('x-powered-by');
app.set('etag', false);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

app.use(express.json({ limit: '128kb', strict: true }));

app.use('/api', healthRoutes);
app.use('/api', analyzeRoutes);
app.use('/api', aiReviewRoutes);

// WebCheck 60 tiêu chí (công cụ tĩnh của mốc 1 được nhúng): hợp đồng
// GET /api/fetch từ webcheck/api/fetch.mjs — gắn cả hai đường vì tool
// dùng đường tuyệt đối '/api/fetch' (js/main.js của mốc 1, không sửa) và
// cùng thứ này phục vụ khi tool mở tại /webcheck/ làm /webcheck/api/fetch.
app.use('/webcheck/api', webcheckToolRouter);
app.use('/api', webcheckToolRouter);

app.get('/api', (req, res) => {
  res.json({
    service: 'WEBCHECK AI API',
    version: '1.0.0',
    endpoints: [
      'GET /api/health',
      'POST /api/analyze',
      'POST /api/analyze/stream',
      'POST /api/ai-review',
    ],
  });
});

app.use('/api', (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Không tìm thấy endpoint API này.',
    },
  });
});

const indexPath = path.join(config.clientDist, 'index.html');
const hasClientBuild = fs.existsSync(indexPath);

if (hasClientBuild) {
  // Tool 60 tiêu chí nhúng: tệp tĩnh đi cùng dist qua vite (client/public/webcheck).
  // Mount đứng trước static gốc + trước SPA fallback để /webcheck/… không bị
  // SPA nuốt mất. index mặc định ('index.html') để /webcheck/ mở đúng trang.
  app.use('/webcheck', express.static(path.join(config.clientDist, 'webcheck'), { maxAge: '1h' }));
  app.use(express.static(config.clientDist, { index: false, maxAge: '1h' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    // Chống "trang trắng sau deploy": HTML luôn bảo trình duyệt xác thực lại
    // (ETag) thay vì cache phỏng đoán — mỗi lần mở tab sẽ nhận index.html mới,
    // làm việc đè tới asset hash đúng bản deploy hiện tại.
    res.set('Cache-Control', 'no-cache');
    res.sendFile(indexPath);
  });
} else {
  app.get('/', (req, res) => {
    res.type('html').send(`<!doctype html>
<html lang="vi">
<head><meta charset="utf-8"><title>WEBCHECK AI API</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:60px auto;padding:0 20px;line-height:1.6;color:#0f172a}code{background:#f1f5f9;padding:2px 6px;border-radius:4px}</style>
</head>
<body>
  <h1>WEBCHECK AI API đang chạy</h1>
  <p>Backend đã sẵn sàng. Giao diện chưa được build.</p>
  <p>Chạy <code>npm run dev</code> tại thư mục gốc để mở frontend, hoặc <code>npm run build</code> để tạo bản production.</p>
  <p>Kiểm tra trạng thái tại <a href="/api/health">/api/health</a>.</p>
</body>
</html>`);
  });
}

app.use((err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({
      error: { code: 'INVALID_JSON', message: 'Nội dung yêu cầu không phải JSON hợp lệ.' },
    });
    return;
  }

  if (err?.type === 'entity.too.large') {
    res.status(413).json({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Nội dung yêu cầu quá lớn.' },
    });
    return;
  }

  const status = Number(err?.status) >= 400 && Number(err?.status) < 600 ? Number(err.status) : 500;
  if (status >= 500) {
    console.error('[server:error]', err);
  }
  res.status(status).json(errorPayload(err));
});

if (process.env.VERCEL) {
  // Trên Vercel (runtime @vercel/node): express app được xuất qua `export
  // default app` ở dưới và requestListener của bản chạy serverless — mở
  // `listen` ở đây vô nghĩa (socket không nhận traffic) nên bỏ qua để tránh
  // giữ event loop sống thêm vô ích.
  console.log('  WEBCHECK AI chạy serverless trên Vercel — bỏ qua app.listen');
} else {
  const server = app.listen(config.port, () => {
    console.log(`\n  WEBCHECK AI API đang chạy tại http://localhost:${config.port}`);
    console.log(`  Môi trường: ${config.env}`);
    console.log(`  AI: ${config.ai.apiKey ? `${config.ai.provider} / ${config.ai.model}` : 'chưa cấu hình (dùng bộ quy tắc dự phòng)'}`);
    console.log(`  Frontend build: ${hasClientBuild ? 'đã tìm thấy' : 'chưa có (dùng Vite dev server)'}\n`);
  });

  server.requestTimeout = 60_000;
  server.headersTimeout = 65_000;

  function shutdown(signal) {
    console.log(`\nNhận tín hiệu ${signal}, đang dừng server...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5_000).unref();
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

export default app;

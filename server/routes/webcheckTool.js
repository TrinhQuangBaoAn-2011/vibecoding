'use strict';
/*
 * WebCheck 60 tiêu chí — cầu nối HTML cho bản ghép (app WEBCHECK AI).
 * KHÔNG tự viết logic mới: xuất đúng handler theo hợp đồng của mốc 1
 * tại webcheck/api/fetch.mjs (tệp độc quyền của mốc 1) qua Express Router,
 * để tool tĩnh nhúng trong /webcheck/ hết mọi tuyến ":url / soft" hoạt động.
 * Hợp đồng giữ nguyên: GET ?url=<encoded> [&soft=1]
 *   → 200 { html, statusCode, finalUrl, elapsedMs } | lỗi { error, detail }
 */
import toolFetchHandler from '../../webcheck/api/fetch.mjs';
import { Router } from 'express';

export const webcheckToolRouter = Router();
webcheckToolRouter.get('/fetch', (req, res) => toolFetchHandler(req, res));

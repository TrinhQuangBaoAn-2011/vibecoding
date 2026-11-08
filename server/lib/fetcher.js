import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import zlib from 'node:zlib';
import { config } from '../config.js';
import { AppError } from './errors.js';
import { normalizeInputUrl, resolveAndValidate, validateResolvedUrl } from './urlSecurity.js';
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const HTML_CONTENT_TYPES = /^(text\/html|application\/xhtml\+xml)\b/i;

const NETWORK_MESSAGES = {
  ENOTFOUND: 'Không tìm thấy website. Tên miền có thể không tồn tại hoặc chưa được cấu hình DNS.',
  EAI_AGAIN: 'Không thể phân giải tên miền lúc này. Vui lòng thử lại sau.',
  ECONNREFUSED: 'Website từ chối kết nối. Máy chủ có thể đang tắt hoặc chặn yêu cầu.',
  ECONNRESET: 'Kết nối tới website bị ngắt đột ngột. Vui lòng thử lại.',
  ETIMEDOUT: 'Hết thời gian chờ khi kết nối tới website.',
  EHOSTUNREACH: 'Không thể kết nối tới máy chủ của website.',
  ENETUNREACH: 'Không có kết nối mạng tới máy chủ của website.',
  EPIPE: 'Kết nối tới website bị đóng trước khi hoàn tất.',
  CERT_HAS_EXPIRED: 'Chứng chỉ SSL của website đã hết hạn nên không thể thiết lập kết nối an toàn.',
  DEPTH_ZERO_SELF_SIGNED_CERT: 'Website sử dụng chứng chỉ SSL tự ký, không thể xác minh an toàn.',
  SELF_SIGNED_CERT_IN_CHAIN: 'Website sử dụng chứng chỉ SSL không tin cậy.',
  ERR_TLS_CERT_ALTNAME_INVALID: 'Tên miền không khớp với chứng chỉ SSL của website.',
  ERR_SSL_WRONG_VERSION_NUMBER: 'Website gặp lỗi giao thức SSL/TLS.',
  ERR_SSL_PROTOCOL_ERROR: 'Website gặp lỗi giao thức SSL/TLS.',
};

function friendlyNetworkError(error) {
  if (error instanceof AppError) return error;
  const message =
    NETWORK_MESSAGES[error?.code] ||
    (error?.message?.includes('timeout')
      ? 'Hết thời gian chờ khi truy xuất website. Website có thể đang phản hồi chậm.'
      : 'Không thể kết nối tới website. Vui lòng kiểm tra lại địa chỉ và thử lại.');
  return new AppError(message, {
    status: 502,
    code: error?.code || 'NETWORK_ERROR',
    cause: error,
  });
}

function safeLookup(hostname, options, callback) {
  resolveAndValidate(hostname)
    .then((records) => {
      if (options?.all) {
        callback(null, records.map((record) => ({ address: record.address, family: record.family })));
        return;
      }
      callback(null, records[0].address, records[0].family);
    })
    .catch((error) => callback(friendlyNetworkError(error)));
}

function requestOnce(url, options = {}) {
  const isHttps = url.protocol === 'https:';
  const transport = isHttps ? https : http;
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const timeoutMs = options.timeoutMs || config.fetch.timeoutMs;
  const maxBytes = options.maxBytes || config.fetch.maxBytes;

  return new Promise((resolve, reject) => {
    let settled = false;
    let timer;

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };

    const fail = (error) => finish(reject, friendlyNetworkError(error));

    const req = transport.request(
      {
        protocol: url.protocol,
        hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: `${url.pathname || '/'}${url.search || ''}`,
        method: options.method || 'GET',
        lookup: safeLookup,
        servername: net.isIP(hostname) ? undefined : hostname,
        headers: {
          Host: url.host,
          'User-Agent': config.fetch.userAgent,
          Accept:
            options.accept ||
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
          'Accept-Encoding': 'identity',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
          Connection: 'close',
        },
      },
      (res) => {
        const statusCode = res.statusCode || 0;
        const headers = res.headers;

        if (REDIRECT_STATUSES.has(statusCode) && headers.location) {
          res.resume();
          finish(resolve, { statusCode, headers, body: Buffer.alloc(0), redirect: true });
          return;
        }

        if (statusCode < 200 || statusCode >= 300) {
          res.resume();
          finish(
            reject,
            new AppError(`Website trả về mã lỗi HTTP ${statusCode}.`, {
              status: 502,
              code: 'HTTP_ERROR',
              details: { httpStatus: statusCode },
            }),
          );
          return;
        }

        if (options.expectHtml) {
          const contentType = String(headers['content-type'] || '');
          if (!HTML_CONTENT_TYPES.test(contentType)) {
            res.resume();
            finish(
              reject,
              new AppError(
                'Địa chỉ này không trả về nội dung HTML. WEBCHECK AI chỉ phân tích trang web HTML.',
                {
                  status: 415,
                  code: 'UNSUPPORTED_CONTENT_TYPE',
                  details: { contentType: contentType || 'không xác định' },
                },
              ),
            );
            return;
          }
        }

        const length = Number(headers['content-length']);
        if (Number.isFinite(length) && length > maxBytes) {
          res.resume();
          finish(
            reject,
            new AppError('Nội dung trang quá lớn để phân tích an toàn.', {
              status: 413,
              code: 'RESPONSE_TOO_LARGE',
              details: { limitBytes: maxBytes },
            }),
          );
          return;
        }

        let stream = res;
        const encoding = String(headers['content-encoding'] || '').toLowerCase();
        try {
          if (encoding === 'gzip' || encoding === 'x-gzip') stream = res.pipe(zlib.createGunzip());
          else if (encoding === 'deflate') stream = res.pipe(zlib.createInflate());
          else if (encoding === 'br') stream = res.pipe(zlib.createBrotliDecompress());
        } catch (error) {
          finish(
            reject,
            new AppError('Không thể giải nén nội dung website.', {
              status: 502,
              code: 'INVALID_ENCODING',
              cause: error,
            }),
          );
          return;
        }

        if (stream !== res) {
          res.on('error', fail);
          stream.on('error', (error) =>
            fail(
              new AppError('Không thể giải nén nội dung website.', {
                status: 502,
                code: 'INVALID_ENCODING',
                cause: error,
              }),
            ),
          );
        }

        const chunks = [];
        let received = 0;

        stream.on('data', (chunk) => {
          received += chunk.length;
          if (received > maxBytes) {
            req.destroy();
            finish(
              reject,
              new AppError('Nội dung trang vượt quá giới hạn dung lượng cho phép.', {
                status: 413,
                code: 'RESPONSE_TOO_LARGE',
                details: { limitBytes: maxBytes },
              }),
            );
            return;
          }
          chunks.push(chunk);
        });

        stream.on('end', () => {
          finish(resolve, {
            statusCode,
            headers,
            body: Buffer.concat(chunks),
            redirect: false,
          });
        });

        stream.on('error', fail);
        res.on('aborted', () =>
          fail(new AppError('Website đóng kết nối trước khi gửi đầy đủ nội dung.', { status: 502, code: 'ABORTED' })),
        );
      },
    );

    timer = setTimeout(() => {
      req.destroy();
      finish(
        reject,
        new AppError('Hết thời gian chờ khi truy xuất website. Website có thể đang phản hồi chậm.', {
          status: 504,
          code: 'FETCH_TIMEOUT',
          details: { timeoutMs },
        }),
      );
    }, timeoutMs);
    timer.unref?.();

    req.on('error', fail);
    req.end();
  });
}

function decodeBuffer(buffer, contentType) {
  let charset = '';
  const headerMatch = /charset\s*=\s*["']?([^;"'\s]+)/i.exec(contentType || '');
  if (headerMatch) charset = headerMatch[1].toLowerCase();

  if (!charset) {
    const head = buffer.subarray(0, 4096).toString('latin1');
    const metaMatch =
      /<meta[^>]+charset\s*=\s*["']?([^"'\s/>]+)/i.exec(head) ||
      /<meta[^>]+content\s*=\s*["'][^"']*charset\s*=\s*([^"'\s;]+)/i.exec(head);
    if (metaMatch) charset = metaMatch[1].toLowerCase();
  }

  const aliases = {
    'utf8': 'utf-8',
    'utf-8': 'utf-8',
    'iso-8859-1': 'windows-1252',
    'latin1': 'windows-1252',
  };
  charset = aliases[charset] || charset || 'utf-8';

  try {
    return new TextDecoder(charset, { fatal: false }).decode(buffer);
  } catch {
    return buffer.toString('utf8');
  }
}

export async function safeFetchHtml(inputUrl, { onProgress } = {}) {
  let current = inputUrl instanceof URL ? new URL(inputUrl.href) : normalizeInputUrl(inputUrl);
  const startedAt = Date.now();
  let redirects = 0;

  for (let hop = 0; hop <= config.fetch.maxRedirects; hop += 1) {
    validateResolvedUrl(current);

    // Re-resolve for every hop so DNS rebinding and redirect-based SSRF are blocked.
    await resolveAndValidate(current.hostname);

    if (hop === 0) onProgress?.('connect', 'Đã xác minh địa chỉ. Đang kết nối tới website...');

    const response = await requestOnce(current, {
      expectHtml: true,
      maxBytes: config.fetch.maxBytes,
      timeoutMs: config.fetch.timeoutMs,
    });

    if (response.redirect) {
      redirects += 1;
      if (redirects > config.fetch.maxRedirects) {
        throw new AppError('Website chuyển hướng quá nhiều lần.', {
          status: 502,
          code: 'TOO_MANY_REDIRECTS',
        });
      }

      let next;
      try {
        next = new URL(String(response.headers.location), current);
      } catch {
        throw new AppError('Website trả về địa chỉ chuyển hướng không hợp lệ.', {
          status: 502,
          code: 'INVALID_REDIRECT',
        });
      }

      next.hash = '';
      validateResolvedUrl(next);
      onProgress?.('redirect', `Website chuyển hướng tới ${next.href}`);
      current = next;
      continue;
    }

    const contentType = String(response.headers['content-type'] || '');
    const html = decodeBuffer(response.body, contentType);

    if (!html.trim()) {
      throw new AppError('Website trả về trang HTML rỗng nên không thể phân tích.', {
        status: 502,
        code: 'EMPTY_HTML',
      });
    }

    return {
      html,
      finalUrl: current.href,
      requestedUrl: inputUrl instanceof URL ? inputUrl.href : current.href,
      statusCode: response.statusCode,
      contentType,
      htmlBytes: response.body.length,
      redirects,
      fetchTimeMs: Date.now() - startedAt,
    };
  }

  throw new AppError('Website chuyển hướng quá nhiều lần.', {
    status: 502,
    code: 'TOO_MANY_REDIRECTS',
  });
}

function looksLikeImage(body, contentType) {
  if (/^image\//i.test(contentType || '')) return true;
  if (!body || body.length < 4) return false;
  const head = body.subarray(0, 16);
  if (head[0] === 0x00 && head[1] === 0x00 && head[2] === 0x01 && head[3] === 0x00) return true; // ICO
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) return true; // PNG
  if (head[0] === 0x47 && head[1] === 0x49 && head[2] === 0x46) return true; // GIF
  if (head[0] === 0xff && head[1] === 0xd8) return true; // JPEG
  if (head.subarray(0, 4).toString('ascii') === 'RIFF' && head.subarray(8, 12).toString('ascii') === 'WEBP') {
    return true;
  }
  const text = body.subarray(0, 512).toString('utf8').trim().toLowerCase();
  return text.includes('<svg');
}

export async function probeRootFavicon(finalUrl) {
  let faviconUrl = new URL('/favicon.ico', finalUrl);
  faviconUrl.hash = '';
  const originalUrl = faviconUrl.href;

  try {
    for (let hop = 0; hop <= 2; hop += 1) {
      const response = await requestOnce(faviconUrl, {
        expectHtml: false,
        accept: 'image/avif,image/webp,image/png,image/svg+xml,image/*,*/*;q=0.8',
        maxBytes: 512 * 1024,
        timeoutMs: Math.min(config.fetch.timeoutMs, 6_000),
      });

      if (response.redirect) {
        const next = new URL(String(response.headers.location), faviconUrl);
        next.hash = '';
        validateResolvedUrl(next);
        faviconUrl = next;
        continue;
      }

      const contentType = String(response.headers['content-type'] || '');
      return {
        checked: true,
        exists: looksLikeImage(response.body, contentType),
        url: faviconUrl.href,
        contentType,
      };
    }

    return { checked: false, exists: false, url: originalUrl, reason: 'too-many-redirects' };
  } catch (error) {
    if (error instanceof AppError && error.code === 'HTTP_ERROR') {
      const status = error.details?.httpStatus;
      if (status === 404 || status === 410) {
        return { checked: true, exists: false, url: faviconUrl.href, reason: 'not-found' };
      }
      return { checked: false, exists: false, url: faviconUrl.href, reason: `http-${status}` };
    }
    return { checked: false, exists: false, url: faviconUrl.href, reason: error?.code || 'network' };
  }
}

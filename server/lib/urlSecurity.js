import dns from 'node:dns/promises';
import net from 'node:net';
import { AppError, badRequest } from './errors.js';

const BLOCKED_EXACT_HOSTS = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'metadata',
  'metadata.google.internal',
  'metadata.google',
  'instance-data',
  'instance-data.ec2.internal',
  'kubernetes.default',
  'kubernetes.default.svc',
]);

const BLOCKED_SUFFIXES = ['.localhost', '.local', '.localdomain', '.internal', '.home.arpa'];

const IPV4_BLOCKS = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

function ipv4ToInt(address) {
  return address.split('.').reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function ipv4InBlock(address, network, prefix) {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipv4ToInt(address) & mask) === (ipv4ToInt(network) & mask);
}

function isBlockedIpv4(address) {
  return IPV4_BLOCKS.some(([network, prefix]) => ipv4InBlock(address, network, prefix));
}

function mappedIpv4FromIpv6(address) {
  const dotted = address.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (dotted) return dotted[1];

  const hex = address.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (hex) {
    const high = parseInt(hex[1], 16);
    const low = parseInt(hex[2], 16);
    return [high >> 8, high & 0xff, low >> 8, low & 0xff].join('.');
  }
  return null;
}

export function isBlockedIp(address) {
  const family = net.isIP(address);
  if (family === 4) return isBlockedIpv4(address);
  if (family !== 6) return true;

  const normalized = address.toLowerCase().split('%')[0];
  if (normalized === '::' || normalized === '::1') return true;

  const mapped = mappedIpv4FromIpv6(normalized);
  if (mapped) return isBlockedIpv4(mapped);

  const groups = normalized.split(':');
  const first = parseInt(groups[0] || '0', 16);
  const second = parseInt(groups[1] || '0', 16);

  // fc00::/7 (unique local), fe80::/10 (link local), ff00::/8 (multicast)
  if ((first & 0xfe00) === 0xfc00) return true;
  if ((first & 0xffc0) === 0xfe80) return true;
  if ((first & 0xff00) === 0xff00) return true;

  // Documentation, Teredo, 6to4, discard-only, ORCHID and benchmarking ranges.
  if (first === 0x2001 && second === 0x0db8) return true;
  if (first === 0x2001 && second === 0x0000) return true;
  if (first === 0x2002) return true;
  if (first === 0x0100 && second === 0) return true;
  if (first === 0x2001 && second === 0x0002) return true;
  if (first === 0x2001 && second === 0x0010) return true;

  // 64:ff9b::/96 NAT64
  if (first === 0x0064 && second === 0xff9b) {
    const last = groups[groups.length - 1];
    const beforeLast = groups[groups.length - 2];
    if (last && beforeLast && !last.includes('.')) {
      const high = parseInt(beforeLast, 16);
      const low = parseInt(last, 16);
      const embedded = [high >> 8, high & 0xff, low >> 8, low & 0xff].join('.');
      if (isBlockedIpv4(embedded)) return true;
    }
  }

  return false;
}

function cleanHostname(hostname) {
  return hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
}

export function isBlockedHostname(hostname) {
  const host = cleanHostname(hostname);
  if (!host) return true;
  if (BLOCKED_EXACT_HOSTS.has(host)) return true;
  if (BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) return true;
  if (!net.isIP(host) && !host.includes('.')) return true;
  // Numeric/hex host tricks. WHATWG URL normally canonicalizes these, but keep a guard.
  if (/^(0x[0-9a-f]+|\d+)$/i.test(host)) return true;
  return false;
}

function withTimeout(promise, timeoutMs, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new AppError(message, { status: 504, code: 'DNS_TIMEOUT' })), timeoutMs);
    timer.unref?.();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function resolveAndValidate(hostname, { timeoutMs = 8_000 } = {}) {
  const host = cleanHostname(hostname);
  if (isBlockedHostname(host)) {
    throw new AppError(
      'Tên miền này không được phép truy cập vì lý do bảo mật. WEBCHECK AI chỉ phân tích website công khai trên Internet.',
      { status: 400, code: 'BLOCKED_HOST' },
    );
  }

  if (net.isIP(host)) {
    if (isBlockedIp(host)) {
      throw new AppError(
        'Địa chỉ IP này thuộc mạng nội bộ hoặc không được phép truy cập vì lý do bảo mật.',
        { status: 400, code: 'BLOCKED_ADDRESS' },
      );
    }
    return [{ address: host, family: net.isIP(host) }];
  }

  let records;
  try {
    records = await withTimeout(
      dns.lookup(host, { all: true, verbatim: true }),
      timeoutMs,
      'Phân giải tên miền quá thời gian chờ.',
    );
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      'Không thể phân giải tên miền. Vui lòng kiểm tra lại địa chỉ website.',
      { status: 502, code: 'DNS_ERROR', cause: error },
    );
  }

  if (!Array.isArray(records) || records.length === 0) {
    throw new AppError('Tên miền không trỏ tới địa chỉ mạng nào.', {
      status: 502,
      code: 'DNS_ERROR',
    });
  }

  if (records.some((record) => isBlockedIp(record.address))) {
    throw new AppError(
      'Tên miền này trỏ tới địa chỉ mạng nội bộ hoặc không được phép truy cập vì lý do bảo mật.',
      { status: 400, code: 'BLOCKED_ADDRESS' },
    );
  }

  return records;
}

export function normalizeInputUrl(rawUrl) {
  if (typeof rawUrl !== 'string') {
    throw badRequest('Vui lòng nhập URL website cần phân tích.', 'URL_REQUIRED');
  }

  let value = rawUrl.trim();
  if (!value) throw badRequest('Vui lòng nhập URL website cần phân tích.', 'URL_REQUIRED');
  if (value.length > 2048) throw badRequest('URL quá dài. Vui lòng nhập URL ngắn hơn.', 'URL_TOO_LONG');

  if (value.startsWith('//')) value = `https:${value}`;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) value = `https://${value}`;

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw badRequest('URL không hợp lệ. Ví dụ đúng: https://example.com', 'INVALID_URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw badRequest('Chỉ hỗ trợ website sử dụng giao thức HTTP hoặc HTTPS.', 'UNSUPPORTED_PROTOCOL');
  }

  if (parsed.username || parsed.password) {
    throw badRequest('URL không được chứa thông tin đăng nhập.', 'URL_HAS_CREDENTIALS');
  }

  if (parsed.port && !['80', '443'].includes(parsed.port)) {
    throw badRequest(
      'Chỉ hỗ trợ website trên cổng mặc định (80 hoặc 443) để đảm bảo an toàn.',
      'UNSUPPORTED_PORT',
    );
  }

  if (!parsed.hostname || isBlockedHostname(parsed.hostname)) {
    throw badRequest(
      'Tên miền này không được phép truy cập vì lý do bảo mật. Vui lòng nhập tên miền công khai.',
      'BLOCKED_HOST',
    );
  }

  parsed.hash = '';
  return parsed;
}

export function validateResolvedUrl(url) {
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new AppError('Website chuyển hướng tới một giao thức không được hỗ trợ.', {
      status: 400,
      code: 'UNSUPPORTED_REDIRECT',
    });
  }
  if (url.username || url.password) {
    throw new AppError('Website chuyển hướng tới URL có chứa thông tin đăng nhập.', {
      status: 400,
      code: 'UNSAFE_REDIRECT',
    });
  }
  if (url.port && !['80', '443'].includes(url.port)) {
    throw new AppError('Website chuyển hướng tới một cổng không được hỗ trợ.', {
      status: 400,
      code: 'UNSAFE_REDIRECT',
    });
  }
  if (!url.hostname || isBlockedHostname(url.hostname)) {
    throw new AppError('Website chuyển hướng tới một địa chỉ không được phép truy cập.', {
      status: 400,
      code: 'BLOCKED_REDIRECT',
    });
  }
  return url;
}

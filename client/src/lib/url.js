export function normalizeUrlInput(rawValue) {
  let value = String(rawValue || '').trim();
  if (!value) {
    throw new Error('Vui lòng nhập URL website cần phân tích.');
  }
  if (value.length > 2048) {
    throw new Error('URL quá dài. Vui lòng nhập URL ngắn hơn 2.048 ký tự.');
  }
  if (value.startsWith('//')) value = `https:${value}`;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) value = `https://${value}`;

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('URL không hợp lệ. Ví dụ đúng: https://example.com');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Chỉ hỗ trợ website sử dụng HTTP hoặc HTTPS.');
  }
  if (!parsed.hostname || !parsed.hostname.includes('.')) {
    throw new Error('Tên miền chưa hợp lệ. Vui lòng nhập tên miền công khai, ví dụ example.com.');
  }
  if (parsed.username || parsed.password) {
    throw new Error('URL không được chứa thông tin đăng nhập.');
  }

  parsed.hash = '';
  return parsed.href;
}

export function validateUrlInput(rawValue) {
  try {
    return { ok: true, url: normalizeUrlInput(rawValue), error: null };
  } catch (error) {
    return { ok: false, url: null, error: error.message };
  }
}

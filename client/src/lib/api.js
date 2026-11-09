const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, { code = 'API_ERROR', status = 0, details = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function connectionError(error) {
  if (error?.name === 'AbortError') {
    return new ApiError('Yêu cầu đã bị hủy.', { code: 'ABORTED' });
  }
  return new ApiError(
    'Không thể kết nối tới backend WEBCHECK AI. Hãy kiểm tra server đang chạy và thử lại.',
    { code: 'NETWORK_ERROR', details: error?.message },
  );
}

async function errorFromResponse(response) {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    try {
      await response.text();
    } catch {
      // Ignore body parsing errors.
    }
  }

  const apiError = payload?.error;
  if (apiError?.message) {
    return new ApiError(apiError.message, {
      code: apiError.code || 'API_ERROR',
      status: response.status,
      details: apiError.details || null,
    });
  }

  return new ApiError(
    response.status === 429
      ? 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.'
      : `Backend trả về lỗi HTTP ${response.status}.`,
    { code: 'HTTP_ERROR', status: response.status },
  );
}

export async function checkHealth({ signal } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
      cache: 'no-store',
    });
  } catch (error) {
    throw connectionError(error);
  }
  if (!response.ok) throw await errorFromResponse(response);
  return response.json();
}

export async function analyzeUrlStream(url, { onProgress, signal } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/analyze/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson, application/json' },
      body: JSON.stringify({ url }),
      signal,
      cache: 'no-store',
    });
  } catch (error) {
    throw connectionError(error);
  }

  if (!response.ok) throw await errorFromResponse(response);
  if (!response.body) {
    throw new ApiError('Trình duyệt không hỗ trợ đọc dữ liệu phân tích theo luồng.', {
      code: 'STREAM_UNSUPPORTED',
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result = null;

  const handleLine = (line) => {
    const text = line.trim();
    if (!text) return;
    let event;
    try {
      event = JSON.parse(text);
    } catch {
      throw new ApiError('Dữ liệu tiến trình từ backend không hợp lệ.', {
        code: 'INVALID_STREAM_DATA',
      });
    }

    if (event.type === 'progress') {
      onProgress?.({ stage: event.stage, message: event.message });
      return;
    }
    if (event.type === 'result') {
      result = event.analysis;
      return;
    }
    if (event.type === 'error') {
      throw new ApiError(event.error?.message || 'Phân tích website thất bại.', {
        code: event.error?.code || 'ANALYZE_FAILED',
        status: 502,
        details: event.error?.details || null,
      });
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex >= 0) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        handleLine(line);
        newlineIndex = buffer.indexOf('\n');
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) handleLine(buffer);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw connectionError(error);
  } finally {
    reader.releaseLock();
  }

  if (!result) {
    throw new ApiError(
      'Kết nối tới backend kết thúc trước khi có kết quả phân tích. Vui lòng thử lại.',
      { code: 'INCOMPLETE_STREAM' },
    );
  }

  return result;
}

export async function requestAiReview({ analysisId, analysis, signal } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/ai-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ analysisId: analysisId || undefined, analysis }),
      signal,
      cache: 'no-store',
    });
  } catch (error) {
    throw connectionError(error);
  }

  if (!response.ok) throw await errorFromResponse(response);
  const payload = await response.json();
  if (!payload?.review) {
    throw new ApiError('Backend không trả về nhận xét AI hợp lệ.', { code: 'INVALID_AI_RESPONSE' });
  }
  return payload.review;
}

export async function requestNinoChat({ analysisId, analysis, question, history, signal } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/ai-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        analysisId: analysisId || undefined,
        analysis,
        question,
        history,
      }),
      signal,
      cache: 'no-store',
    });
  } catch (error) {
    throw connectionError(error);
  }

  if (!response.ok) throw await errorFromResponse(response);
  const payload = await response.json();
  if (!payload?.chat?.reply) {
    throw new ApiError('Backend không trả về câu trả lời của Nino hợp lệ.', {
      code: 'INVALID_AI_CHAT_RESPONSE',
    });
  }
  return payload.chat;
}

export function getApiBase() {
  if (API_BASE) return API_BASE;
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

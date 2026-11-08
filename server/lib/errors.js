export class AppError extends Error {
  constructor(message, { status = 500, code = 'INTERNAL_ERROR', details = undefined, cause } = {}) {
    super(message, { cause });
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isAppError(error) {
  return error instanceof AppError;
}

export function errorPayload(error) {
  if (error instanceof AppError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    };
  }

  return {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.',
    },
  };
}

export function badRequest(message, code = 'INVALID_INPUT') {
  return new AppError(message, { status: 400, code });
}

export function unavailable(message, code = 'FETCH_FAILED') {
  return new AppError(message, { status: 502, code });
}

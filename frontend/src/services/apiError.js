export const parseApiErrorBody = async (response, fallbackMessage = 'Request failed') => {
  const defaultPayload = {
    status: response.status,
    code: null,
    message: fallbackMessage,
    quota: null,
  };

  let body = null;
  try {
    body = await response.json();
  } catch {
    return defaultPayload;
  }

  const detail = body?.detail;
  if (typeof detail === 'string') {
    return {
      ...defaultPayload,
      message: detail,
    };
  }

  if (detail && typeof detail === 'object') {
    const quotaData = detail.error === 'quota_exceeded'
      ? {
          remaining: detail.remaining,
          required: detail.required,
          quota: detail.quota,
          used: detail.used,
          reset_at: detail.reset_at,
        }
      : null;

    return {
      ...defaultPayload,
      code: detail.error || null,
      message: detail.message || fallbackMessage,
      quota: quotaData,
    };
  }

  return {
    ...defaultPayload,
    message: body?.message || fallbackMessage,
  };
};

export const throwApiError = async (response, fallbackMessage) => {
  const parsed = await parseApiErrorBody(response, fallbackMessage);
  const error = new Error(parsed.message);
  error.status = parsed.status;
  error.code = parsed.code;
  error.quota = parsed.quota;
  throw error;
};

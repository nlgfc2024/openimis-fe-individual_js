const IGNORED_ERROR_KEYS = new Set(['timestamp', 'upload_id', 'data_upload_id']);

export function formatErrorValue(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(formatErrorValue).filter(Boolean).join(', ');
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .filter(([key]) => !IGNORED_ERROR_KEYS.has(key))
      .map(([key, item]) => `${key.replace(/_/g, ' ')}: ${formatErrorValue(item)}`)
      .filter((entry) => !entry.endsWith(': '))
      .join('\n');
  }
  return value == null ? '' : String(value);
}

export async function readUploadResponse(response) {
  const body = await response.text();
  if (!body) return {};

  try {
    return JSON.parse(body);
  } catch {
    return { error: body };
  }
}

export function getUploadErrorMessage(payload, fallback) {
  const error = payload?.error ?? payload?.detail ?? payload?.message;
  return formatErrorValue(error) || fallback;
}

export function getUploadErrorDetails(payload) {
  if (!payload || typeof payload === 'string') return formatErrorValue(payload);
  const { errors, ...topLevel } = payload;
  return formatErrorValue({
    ...topLevel,
    ...(errors && typeof errors === 'object' ? errors : {}),
  });
}

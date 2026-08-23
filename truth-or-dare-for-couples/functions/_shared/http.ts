export const jsonResponse = (value: unknown, init: ResponseInit = {}): Response => {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(JSON.stringify(value), { ...init, headers });
};

export const errorResponse = (
  status: number,
  code: string,
  message: string,
  details?: unknown,
): Response => jsonResponse({ error: { code, message, details } }, { status });

export const readJson = async (request: Request, maxBytes = 2_000_000): Promise<unknown> => {
  const length = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(length) && length > maxBytes) throw new Error('PAYLOAD_TOO_LARGE');
  const text = await request.text();
  if (text.length > maxBytes) throw new Error('PAYLOAD_TOO_LARGE');
  return JSON.parse(text);
};

export const createId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${crypto.randomUUID()}`;

export const toHex = (bytes: ArrayBuffer): string =>
  Array.from(new Uint8Array(bytes), (value) => value.toString(16).padStart(2, '0')).join('');

export const sha256Hex = async (value: ArrayBuffer): Promise<string> =>
  toHex(await crypto.subtle.digest('SHA-256', value));


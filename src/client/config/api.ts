export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:5000").replace(/\/+$/, "");

export function buildApiUrl(path: string): string {
  const normalizedBase = API_BASE_URL.endsWith("/api") ? API_BASE_URL : `${API_BASE_URL}/api`;
  const rawPath = String(path ?? "").trim();
  const normalizedPath = rawPath
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/+/g, "")
    .replace(/^((?:api\/)+)/i, "")
    .replace(/^\/+/g, "");

  return normalizedPath ? `${normalizedBase}/${normalizedPath}` : normalizedBase;
}

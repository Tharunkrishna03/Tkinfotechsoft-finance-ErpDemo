const DEFAULT_BACKEND_URL = "https://fianance-management-system-erp.onrender.com";
const LOCAL_BACKEND_PORT = "8000";
const CSRF_STORAGE_KEY = "jewel_finance_csrf_token";

function normalizeBackendUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

export function getBrowserBackendUrl() {
  const configuredBackendUrl =
    process.env.NEXT_PUBLIC_DJANGO_API_URL ??
    process.env.DJANGO_API_URL;

  if (configuredBackendUrl) {
    return normalizeBackendUrl(configuredBackendUrl);
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//${hostname}:${LOCAL_BACKEND_PORT}`;
    }
  }

  return DEFAULT_BACKEND_URL;
}

export const BACKEND_URL = getBrowserBackendUrl();

export function isUnsafeMethod(method) {
  return !["GET", "HEAD", "OPTIONS"].includes(String(method || "GET").toUpperCase());
}

export function getStoredCsrfToken() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return window.localStorage.getItem(CSRF_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function storeCsrfToken(token) {
  if (!token || typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(CSRF_STORAGE_KEY, token);
  } catch {
    // Ignore storage failures in constrained browsers.
  }
}

export function clearStoredCsrfToken() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(CSRF_STORAGE_KEY);
  } catch {
    // Ignore storage failures in constrained browsers.
  }
}

export function buildBackendApiUrl(inputUrl) {
  if (!inputUrl || typeof window === "undefined") {
    return null;
  }

  const url = new URL(String(inputUrl), window.location.origin);
  const backendUrl = getBrowserBackendUrl();

  if (!url.pathname.startsWith("/api/")) {
    return null;
  }

  const pathname = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
  return `${backendUrl}${pathname}${url.search}`;
}

export async function fetchCsrfToken(fetchImpl = fetch) {
  const backendUrl = getBrowserBackendUrl();
  const response = await fetchImpl(`${backendUrl}/api/csrf/`, {
    method: "GET",
    credentials: "include",
    mode: "cors",
    cache: "no-store",
  });

  if (!response.ok) {
    return "";
  }

  const data = await response.json().catch(() => ({}));
  const csrfToken = String(data.csrf_token ?? "").trim();

  if (csrfToken) {
    storeCsrfToken(csrfToken);
  }

  return csrfToken;
}

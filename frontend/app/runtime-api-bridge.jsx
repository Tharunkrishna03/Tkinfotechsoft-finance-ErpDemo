"use client";

import { useEffect } from "react";
import {
  buildBackendApiUrl,
  clearStoredCsrfToken,
  fetchCsrfToken,
  getStoredCsrfToken,
  isUnsafeMethod,
} from "@/lib/browser-backend";

export default function RuntimeApiBridge() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input, init) => {
      const inputUrl =
        typeof input === "string" || input instanceof URL
          ? String(input)
          : input instanceof Request
            ? input.url
            : "";
      const backendUrl = buildBackendApiUrl(inputUrl);

      if (!backendUrl) {
        return originalFetch(input, init);
      }

      const request = input instanceof Request ? input : null;
      const method = String(init?.method ?? request?.method ?? "GET").toUpperCase();
      const headers = new Headers(request?.headers ?? undefined);

      if (init?.headers) {
        new Headers(init.headers).forEach((value, key) => headers.set(key, value));
      }

      if (isUnsafeMethod(method)) {
        let csrfToken = getStoredCsrfToken();

        if (!csrfToken) {
          csrfToken = await fetchCsrfToken(originalFetch);
        }

        if (csrfToken) {
          headers.set("X-CSRFToken", csrfToken);
        }
      }

      const response = await originalFetch(backendUrl, {
        ...init,
        method,
        headers,
        credentials: "include",
        mode: "cors",
      });

      if ((backendUrl.endsWith("/api/logout/") || backendUrl.endsWith("/api/login/")) && response.ok) {
        clearStoredCsrfToken();
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}

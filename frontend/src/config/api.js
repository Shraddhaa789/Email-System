const DEFAULT_BACKEND_PORT = "5000";

const getFallbackBaseUrl = () => {
  if (typeof window === "undefined") {
    return `http://127.0.0.1:${DEFAULT_BACKEND_PORT}`;
  }

  const protocol = window.location.protocol === "https:" ? "https:" : "http:";
  const hostname = window.location.hostname || "127.0.0.1";

  return `${protocol}//${hostname}:${DEFAULT_BACKEND_PORT}`;
};

const getBaseUrl = () => {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (!envBaseUrl) {
    return getFallbackBaseUrl();
  }

  if (typeof window === "undefined") {
    return envBaseUrl;
  }

  try {
    const envUrl = new URL(envBaseUrl);
    const currentHost = window.location.hostname;

    if (
      envUrl.hostname === currentHost ||
      ["localhost", "127.0.0.1"].includes(envUrl.hostname)
    ) {
      return envBaseUrl;
    }

    if (currentHost && currentHost !== envUrl.hostname) {
      return getFallbackBaseUrl();
    }
  } catch {
    return getFallbackBaseUrl();
  }

  return envBaseUrl;
};

const rawBaseUrl = getBaseUrl();

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");
export const API_URL = `${API_BASE_URL}/api`;
export const SOCKET_URL = API_BASE_URL;

export const buildApiUrl = (path = "") =>
  `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;

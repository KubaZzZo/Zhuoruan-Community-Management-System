const DEFAULT_TIMEOUT = 10000;

export class RequestError extends Error {
  constructor(message, response) {
    super(message);
    this.name = "RequestError";
    this.status = response?.status || 0;
    this.response = response || null;
  }
}

export function createRequestClient(options = {}) {
  const baseURL = options.baseURL || import.meta.env.VITE_API_BASE_URL || "";
  const timeout = options.timeout || DEFAULT_TIMEOUT;
  const getToken = options.getToken || (() => localStorage.getItem("zhuoruan_admin_token") || "");
  const onUnauthorized = options.onUnauthorized || (() => {});
  const onForbidden = options.onForbidden || (() => {});

  async function request(path, requestOptions = {}) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeout);
    const token = getToken();
    const headers = new Headers(requestOptions.headers || {});

    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (requestOptions.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    try {
      const response = await fetch(`${baseURL}${path}`, {
        ...requestOptions,
        headers,
        signal: requestOptions.signal || controller.signal,
      });

      if (response.status === 401) onUnauthorized(response);
      if (response.status === 403) onForbidden(response);
      if (!response.ok) throw new RequestError(`Request failed with ${response.status}`, response);

      const contentType = response.headers.get("content-type") || "";
      return contentType.includes("application/json") ? response.json() : response.text();
    } finally {
      window.clearTimeout(timer);
    }
  }

  return {
    get(path, options = {}) {
      return request(path, { ...options, method: "GET" });
    },
    post(path, body, options = {}) {
      return request(path, { ...options, method: "POST", body: JSON.stringify(body) });
    },
    put(path, body, options = {}) {
      return request(path, { ...options, method: "PUT", body: JSON.stringify(body) });
    },
    delete(path, options = {}) {
      return request(path, { ...options, method: "DELETE" });
    },
  };
}

export const apiClient = createRequestClient();

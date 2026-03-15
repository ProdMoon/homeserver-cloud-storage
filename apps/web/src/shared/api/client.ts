interface RequestOptions {
  method?: string;
  body?: unknown;
  csrfToken?: string;
}

const inflightGetRequests = new Map<string, Promise<unknown>>();

export async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = {};

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.csrfToken) {
    headers['X-CSRF-Token'] = options.csrfToken;
  }

  const sendRequest = async () => {
    const response = await fetch(url, {
      method,
      credentials: 'include',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(payload?.error ?? `Request failed with ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  };

  if (method !== 'GET') {
    return sendRequest();
  }

  const existingRequest = inflightGetRequests.get(url) as Promise<T> | undefined;

  if (existingRequest) {
    return existingRequest;
  }

  const requestPromise = sendRequest().finally(() => {
    inflightGetRequests.delete(url);
  });

  inflightGetRequests.set(url, requestPromise);
  return requestPromise;
}

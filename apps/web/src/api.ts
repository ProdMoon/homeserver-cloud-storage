import type { DirectoryListing, FileItem, SessionState, TrashListing } from "./types";

interface RequestOptions {
  method?: string;
  body?: unknown;
  csrfToken?: string;
}

const inflightGetRequests = new Map<string, Promise<unknown>>();

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = {};

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  if (options.csrfToken) {
    headers["X-CSRF-Token"] = options.csrfToken;
  }

  const sendRequest = async () => {
    const response = await fetch(url, {
      method,
      credentials: "include",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? `Request failed with ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  };

  if (method !== "GET") {
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

export function getSession(): Promise<SessionState> {
  return request<SessionState>("/api/me");
}

export function login(username: string, password: string): Promise<SessionState> {
  return request<SessionState>("/api/auth/login", {
    method: "POST",
    body: { username, password }
  });
}

export function logout(csrfToken: string): Promise<void> {
  return request<void>("/api/auth/logout", {
    method: "POST",
    csrfToken
  });
}

export function listFiles(path = ""): Promise<DirectoryListing> {
  const query = new URLSearchParams();

  if (path) {
    query.set("path", path);
  }

  return request<DirectoryListing>(`/api/files${query.size ? `?${query.toString()}` : ""}`);
}

export function createFolder(path: string, name: string, csrfToken: string): Promise<FileItem> {
  return request<{ item: FileItem }>("/api/files/folder", {
    method: "POST",
    csrfToken,
    body: { path, name }
  }).then((payload) => payload.item);
}

export function renameFile(path: string, name: string, csrfToken: string): Promise<FileItem> {
  return request<{ item: FileItem }>("/api/files/rename", {
    method: "PATCH",
    csrfToken,
    body: { path, name }
  }).then((payload) => payload.item);
}

export function moveFile(sourcePath: string, destinationPath: string, csrfToken: string): Promise<FileItem> {
  return request<{ item: FileItem }>("/api/files/move", {
    method: "PATCH",
    csrfToken,
    body: { sourcePath, destinationPath }
  }).then((payload) => payload.item);
}

export function deleteFile(path: string, csrfToken: string): Promise<void> {
  return request<void>("/api/files", {
    method: "DELETE",
    csrfToken,
    body: { path }
  });
}

export function listTrash(): Promise<TrashListing> {
  return request<TrashListing>("/api/trash");
}

export function restoreTrash(id: string, csrfToken: string): Promise<FileItem> {
  return request<{ item: FileItem }>("/api/trash/restore", {
    method: "POST",
    csrfToken,
    body: { id }
  }).then((payload) => payload.item);
}

export function deleteTrash(id: string, csrfToken: string): Promise<void> {
  return request<void>(`/api/trash/${encodeURIComponent(id)}`, {
    method: "DELETE",
    csrfToken
  });
}

export function uploadFiles(
  path: string,
  files: File[],
  csrfToken: string,
  onProgress: (ratio: number) => void
): Promise<FileItem[]> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();

    for (const file of files) {
      formData.append("file", file, file.name);
    }

    const query = new URLSearchParams();

    if (path) {
      query.set("path", path);
    }

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/files/upload${query.size ? `?${query.toString()}` : ""}`);
    xhr.withCredentials = true;
    xhr.setRequestHeader("X-CSRF-Token", csrfToken);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(event.loaded / event.total);
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed."));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const payload = JSON.parse(xhr.responseText) as { uploaded: FileItem[] };
        resolve(payload.uploaded);
        return;
      }

      try {
        const payload = JSON.parse(xhr.responseText) as { error?: string };
        reject(new Error(payload.error ?? "Upload failed."));
      } catch {
        reject(new Error("Upload failed."));
      }
    };
    xhr.send(formData);
  });
}

export function downloadUrl(path: string): string {
  const query = new URLSearchParams({ path });
  return `/api/files/download?${query.toString()}`;
}

export function previewUrl(path: string, kind: "inline" | "thumb"): string {
  const query = new URLSearchParams({ path, kind });
  return `/api/previews?${query.toString()}`;
}

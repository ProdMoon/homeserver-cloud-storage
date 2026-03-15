import { request } from "./client";
import type { DirectoryListing, FileItem } from "../types";

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

export async function fetchTextPreview(path: string): Promise<string> {
  const response = await fetch(previewUrl(path, "inline"), {
    credentials: "include"
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Text preview failed.");
  }

  return response.text();
}


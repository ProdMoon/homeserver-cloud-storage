export type PreviewKind = "image" | "video" | "pdf" | "text" | "audio" | null;

export type ViewMode = "files" | "trash";
export type SortField = "name" | "size" | "modifiedAt";
export type SortDirection = "asc" | "desc";

export interface SessionState {
  authenticated: boolean;
  username?: string;
  csrfToken?: string;
  pollIntervalMs: number;
}

export interface FileItem {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modifiedAt: string;
  mimeType: string | null;
  previewKind: PreviewKind;
  thumbnailAvailable: boolean;
}

export interface DirectoryListing {
  path: string;
  parentPath: string | null;
  items: FileItem[];
}

export interface TrashItem {
  id: string;
  originalPath: string;
  storageName: string;
  itemName: string;
  itemKind: "file" | "directory";
  deletedAt: string;
  sizeBytes: number;
  mimeType: string | null;
}

export interface TrashListing {
  items: TrashItem[];
}

export interface UploadItem {
  id: string;
  names: string[];
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

export interface RefreshOptions {
  preserveScroll?: boolean;
  quiet?: boolean;
}


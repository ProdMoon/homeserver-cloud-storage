import type { StateCreator } from 'zustand/vanilla';
import type {
  DirectoryListing,
  FileItem,
  RefreshOptions,
  SessionState,
  SortDirection,
  SortField,
  TrashItem,
  UploadItem,
  ViewMode,
} from '../../shared/types';

export interface ShellSlice {
  activeView: ViewMode;
  error: string | null;
  setActiveView: (view: ViewMode) => void;
  setError: (error: string | null) => void;
}

export interface SessionSlice {
  session: SessionState | null;
  authBusy: boolean;
  bootstrapSession: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export interface ExplorerSlice {
  currentPath: string;
  listing: DirectoryListing | null;
  selectedPath: string | null;
  selectedPaths: Set<string>;
  filesLoading: boolean;
  sortField: SortField;
  sortDirection: SortDirection;
  setCurrentPath: (path: string) => void;
  setSelectedPath: (path: string | null) => void;
  setSortField: (field: SortField) => void;
  toggleSortDirection: () => void;
  toggleSelectedPath: (path: string) => void;
  setSelectedPaths: (paths: Set<string>) => void;
  selectAll: () => void;
  clearSelection: () => void;
  refreshFiles: (path?: string, options?: RefreshOptions) => Promise<void>;
  createFolder: (name: string) => Promise<void>;
  renameItem: (item: FileItem, nextName: string) => Promise<void>;
  moveItem: (item: FileItem, destinationPath: string) => Promise<void>;
  deleteItem: (item: FileItem) => Promise<void>;
  batchDelete: (paths: string[]) => Promise<void>;
  batchMove: (paths: string[], destinationPath: string) => Promise<void>;
}

export interface TrashSlice {
  trashItems: TrashItem[];
  trashLoading: boolean;
  refreshTrash: (options?: RefreshOptions) => Promise<void>;
  restoreItem: (item: TrashItem) => Promise<void>;
  purgeItem: (item: TrashItem) => Promise<void>;
}

export interface PreviewSlice {
  previewing: FileItem | null;
  textPreviewContent: string;
  textPreviewError: string | null;
  textPreviewLoading: boolean;
  previewRequestId: number;
  openPreview: (item: FileItem) => void;
  closePreview: () => void;
  loadTextPreview: (path: string) => Promise<void>;
}

export interface UploadsSlice {
  uploads: UploadItem[];
  enqueueUpload: (files: File[] | FileList) => Promise<void>;
}

export type AppStore = ShellSlice &
  SessionSlice &
  ExplorerSlice &
  TrashSlice &
  PreviewSlice &
  UploadsSlice;
export type StoreSlice<T> = StateCreator<AppStore, [], [], T>;

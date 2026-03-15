import { createFolder as createFolderRequest, deleteFile, listFiles, moveFile, renameFile } from "../../shared/api/files";
import { captureWindowScroll, restoreWindowScroll } from "../../shared/lib/scroll";
import type { ExplorerSlice, StoreSlice } from "./types";

function requireCsrfToken(token: string | undefined): string {
  if (!token) {
    throw new Error("You need to sign in again.");
  }

  return token;
}

export const createExplorerSlice: StoreSlice<ExplorerSlice> = (set, get) => ({
  currentPath: "",
  listing: null,
  selectedPath: null,
  filesLoading: false,
  sortField: "name",
  sortDirection: "asc",
  setCurrentPath: (currentPath) => set({ currentPath }),
  setSelectedPath: (selectedPath) => set({ selectedPath }),
  setSortField: (sortField) => set({ sortField }),
  toggleSortDirection: () =>
    set((state) => ({
      sortDirection: state.sortDirection === "asc" ? "desc" : "asc"
    })),
  refreshFiles: async (path = get().currentPath, options = {}) => {
    const scrollPosition = captureWindowScroll(options.preserveScroll);

    if (!options.quiet) {
      set({ filesLoading: true });
    }

    try {
      const nextListing = await listFiles(path);
      set((state) => ({
        listing: nextListing,
        currentPath: nextListing.path,
        selectedPath:
          state.selectedPath && nextListing.items.some((item) => item.path === state.selectedPath)
            ? state.selectedPath
            : null,
        error: null
      }));
      restoreWindowScroll(scrollPosition);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to load files."
      });
    } finally {
      if (!options.quiet) {
        set({ filesLoading: false });
      }
    }
  },
  createFolder: async (name) => {
    const { currentPath, refreshFiles, session } = get();

    try {
      await createFolderRequest(currentPath, name, requireCsrfToken(session?.csrfToken));
      await refreshFiles(currentPath, { preserveScroll: true });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to create folder."
      });
    }
  },
  renameItem: async (item, nextName) => {
    const { currentPath, refreshFiles, session } = get();

    try {
      await renameFile(item.path, nextName, requireCsrfToken(session?.csrfToken));
      await refreshFiles(currentPath, { preserveScroll: true });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to rename item."
      });
    }
  },
  moveItem: async (item, destinationPath) => {
    const { currentPath, refreshFiles, session } = get();

    try {
      await moveFile(item.path, destinationPath, requireCsrfToken(session?.csrfToken));
      await refreshFiles(currentPath, { preserveScroll: true });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to move item."
      });
    }
  },
  deleteItem: async (item) => {
    const { currentPath, previewing, refreshFiles, session } = get();

    try {
      await deleteFile(item.path, requireCsrfToken(session?.csrfToken));
      set(
        previewing?.path === item.path
          ? {
              previewing: null,
              textPreviewContent: "",
              textPreviewError: null,
              textPreviewLoading: false
            }
          : {}
      );
      await refreshFiles(currentPath, { preserveScroll: true });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to move item to trash."
      });
    }
  }
});


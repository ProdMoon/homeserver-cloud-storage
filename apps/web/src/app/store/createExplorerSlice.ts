import {
  createFolder as createFolderRequest,
  deleteFile,
  listFiles,
  moveFile,
  renameFile,
} from '../../shared/api/files';
import { captureWindowScroll, restoreWindowScroll } from '../../shared/lib/scroll';
import type { ExplorerSlice, StoreSlice } from './types';

function requireCsrfToken(token: string | undefined): string {
  if (!token) {
    throw new Error('You need to sign in again.');
  }

  return token;
}

export const createExplorerSlice: StoreSlice<ExplorerSlice> = (set, get) => ({
  currentPath: '',
  listing: null,
  selectedPath: null,
  selectedPaths: new Set<string>(),
  filesLoading: false,
  sortField: 'name',
  sortDirection: 'asc',
  setCurrentPath: (currentPath) => set({ currentPath, selectedPaths: new Set() }),
  setSelectedPath: (selectedPath) => set({ selectedPath }),
  setSortField: (sortField) => set({ sortField }),
  toggleSortDirection: () =>
    set((state) => ({
      sortDirection: state.sortDirection === 'asc' ? 'desc' : 'asc',
    })),
  toggleSelectedPath: (path) =>
    set((state) => {
      const next = new Set(state.selectedPaths);

      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }

      return { selectedPaths: next };
    }),
  setSelectedPaths: (selectedPaths) => set({ selectedPaths }),
  selectAll: () => {
    const { listing } = get();

    if (!listing) {
      return;
    }

    set({ selectedPaths: new Set(listing.items.map((item) => item.path)) });
  },
  clearSelection: () => set({ selectedPaths: new Set() }),
  refreshFiles: async (path = get().currentPath, options = {}) => {
    const scrollPosition = captureWindowScroll(options.preserveScroll);

    if (!options.quiet) {
      set({ filesLoading: true });
    }

    try {
      const nextListing = await listFiles(path);
      set((state) => {
        const remainingPaths = new Set(nextListing.items.map((item) => item.path));
        const prunedSelection = new Set(
          [...state.selectedPaths].filter((p) => remainingPaths.has(p))
        );

        return {
          listing: nextListing,
          currentPath: nextListing.path,
          selectedPath:
            state.selectedPath && nextListing.items.some((item) => item.path === state.selectedPath)
              ? state.selectedPath
              : null,
          selectedPaths: prunedSelection,
          error: null,
        };
      });
      restoreWindowScroll(scrollPosition);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load files.',
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
        error: error instanceof Error ? error.message : 'Failed to create folder.',
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
        error: error instanceof Error ? error.message : 'Failed to rename item.',
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
        error: error instanceof Error ? error.message : 'Failed to move item.',
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
              textPreviewContent: '',
              textPreviewError: null,
              textPreviewLoading: false,
            }
          : {}
      );
      await refreshFiles(currentPath, { preserveScroll: true });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to move item to trash.',
      });
    }
  },
  batchDelete: async (paths) => {
    const { currentPath, previewing, refreshFiles, session } = get();
    const csrfToken = requireCsrfToken(session?.csrfToken);

    const results = await Promise.allSettled(paths.map((p) => deleteFile(p, csrfToken)));

    if (previewing && paths.includes(previewing.path)) {
      set({
        previewing: null,
        textPreviewContent: '',
        textPreviewError: null,
        textPreviewLoading: false,
      });
    }

    set({ selectedPaths: new Set() });

    const failures = results.filter((r) => r.status === 'rejected');

    if (failures.length > 0) {
      set({
        error: `Failed to trash ${failures.length} of ${paths.length} items.`,
      });
    }

    await refreshFiles(currentPath, { preserveScroll: true });
  },
  batchMove: async (paths, destinationPath) => {
    const { currentPath, refreshFiles, session } = get();
    const csrfToken = requireCsrfToken(session?.csrfToken);

    const results = await Promise.allSettled(
      paths.map((p) => moveFile(p, destinationPath, csrfToken))
    );

    set({ selectedPaths: new Set() });

    const failures = results.filter((r) => r.status === 'rejected');

    if (failures.length > 0) {
      set({
        error: `Failed to move ${failures.length} of ${paths.length} items.`,
      });
    }

    await refreshFiles(currentPath, { preserveScroll: true });
  },
});

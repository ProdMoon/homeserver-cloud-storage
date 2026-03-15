import { deleteTrash, listTrash, restoreTrash } from '../../shared/api/trash';
import { captureWindowScroll, restoreWindowScroll } from '../../shared/lib/scroll';
import type { StoreSlice, TrashSlice } from './types';

function requireCsrfToken(token: string | undefined): string {
  if (!token) {
    throw new Error('You need to sign in again.');
  }

  return token;
}

export const createTrashSlice: StoreSlice<TrashSlice> = (set, get) => ({
  trashItems: [],
  trashLoading: false,
  refreshTrash: async (options = {}) => {
    const scrollPosition = captureWindowScroll(options.preserveScroll);

    if (!options.quiet) {
      set({ trashLoading: true });
    }

    try {
      const nextTrash = await listTrash();
      set({
        trashItems: nextTrash.items,
        error: null,
      });
      restoreWindowScroll(scrollPosition);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load trash.',
      });
    } finally {
      if (!options.quiet) {
        set({ trashLoading: false });
      }
    }
  },
  restoreItem: async (item) => {
    const { refreshTrash, session } = get();

    try {
      await restoreTrash(item.id, requireCsrfToken(session?.csrfToken));
      await refreshTrash({ preserveScroll: true });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to restore item.',
      });
    }
  },
  purgeItem: async (item) => {
    const { refreshTrash, session } = get();

    try {
      await deleteTrash(item.id, requireCsrfToken(session?.csrfToken));
      await refreshTrash({ preserveScroll: true });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete item.',
      });
    }
  },
});

import { useCallback, useEffect, useRef, useState } from 'react';
import { listFiles } from '../../../shared/api/files';
import type { DirectoryListing } from '../../../shared/types';
import { Button } from '../../../shared/ui/Button';

interface FolderPickerDialogProps {
  initialPath: string;
  onClose: () => void;
  onSelect: (path: string) => void;
}

export function FolderPickerDialog({ initialPath, onClose, onSelect }: FolderPickerDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [listing, setListing] = useState<DirectoryListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchListing = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await listFiles(path);
      setListing(data);
      setCurrentPath(data.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load folders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchListing(initialPath);
  }, [fetchListing, initialPath]);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  const folders = listing?.items.filter((item) => item.type === 'directory') ?? [];

  const breadcrumbs = currentPath
    ? currentPath.split('/').reduce<{ label: string; path: string }[]>((acc, segment) => {
        const parentPath = acc.length > 0 ? acc[acc.length - 1].path : '';
        acc.push({
          label: segment,
          path: parentPath ? `${parentPath}/${segment}` : segment,
        });
        return acc;
      }, [])
    : [];

  return (
    <dialog
      className="fixed inset-0 m-auto h-fit w-full max-w-md rounded-3xl border border-line bg-surface-panel p-0 shadow-xl backdrop:bg-black/40"
      onClose={onClose}
      ref={dialogRef}
    >
      <div className="flex flex-col gap-4 p-5">
        <h2 className="text-lg font-semibold">Move to folder</h2>

        <nav className="flex flex-wrap items-center gap-1 text-sm">
          <button
            className="cursor-pointer rounded-lg px-2 py-1 text-accent hover:bg-accent-wash"
            onClick={() => void fetchListing('')}
            type="button"
          >
            Root
          </button>
          {breadcrumbs.map((crumb) => (
            <span className="flex items-center gap-1" key={crumb.path}>
              <span className="text-ink-muted">/</span>
              <button
                className="cursor-pointer rounded-lg px-2 py-1 text-accent hover:bg-accent-wash"
                onClick={() => void fetchListing(crumb.path)}
                type="button"
              >
                {crumb.label}
              </button>
            </span>
          ))}
        </nav>

        <div className="max-h-64 overflow-y-auto rounded-2xl border border-line">
          {loading ? (
            <div className="px-4 py-6 text-center text-sm text-ink-muted">Loading...</div>
          ) : error ? (
            <div className="px-4 py-6 text-center text-sm text-danger">{error}</div>
          ) : folders.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-ink-muted">No subfolders</div>
          ) : (
            folders.map((folder) => (
              <button
                className="flex w-full cursor-pointer items-center gap-3 border-b border-line px-4 py-3 text-left text-sm transition-colors last:border-b-0 hover:bg-accent-wash"
                key={folder.path}
                onClick={() => void fetchListing(folder.path)}
                type="button"
              >
                <span className="font-mono text-xs text-ink-muted">DIR</span>
                <span className="truncate">{folder.name}</span>
              </button>
            ))
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={() => onSelect(currentPath)} type="button" variant="primary">
            Select this folder
          </Button>
        </div>
      </div>
    </dialog>
  );
}

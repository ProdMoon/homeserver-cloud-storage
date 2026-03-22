import { useState } from 'react';
import {
  selectBatchDelete,
  selectBatchMove,
  selectClearSelection,
  selectListing,
  selectSelectedPaths,
} from '../../../app/store/selectors';
import { useAppStore } from '../../../app/store/useAppStore';
import { downloadUrl } from '../../../shared/api/files';
import type { FileItem } from '../../../shared/types';
import { Button } from '../../../shared/ui/Button';
import { FolderPickerDialog } from './FolderPickerDialog';

export function BatchToolbar({ items }: { items: FileItem[] }) {
  const selectedPaths = useAppStore(selectSelectedPaths);
  const clearSelection = useAppStore(selectClearSelection);
  const batchDelete = useAppStore(selectBatchDelete);
  const batchMove = useAppStore(selectBatchMove);
  const listing = useAppStore(selectListing);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);

  if (selectedPaths.size === 0) {
    return null;
  }

  const selectedFiles = items.filter(
    (item) => selectedPaths.has(item.path) && item.type === 'file'
  );

  function handleDownload() {
    for (const file of selectedFiles) {
      const link = document.createElement('a');
      link.href = downloadUrl(file.path);
      link.download = file.name;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  async function handleTrash() {
    const paths = [...selectedPaths];

    if (!window.confirm(`Move ${paths.length} item(s) to trash?`)) {
      return;
    }

    await batchDelete(paths);
  }

  async function handleMove(destinationPath: string) {
    const paths = [...selectedPaths];
    if (destinationPath === '') {
      destinationPath = '/';
    }
    await batchMove(paths, destinationPath);
    setFolderPickerOpen(false);
  }

  return (
    <>
      <div className="fixed top-4 left-1/2 z-50 flex -translate-x-1/2 flex-wrap items-center gap-3 rounded-2xl border border-accent/20 bg-surface-panel px-4 py-3 shadow-cloud backdrop-blur-sm">
        <span className="text-sm font-medium">
          {selectedPaths.size} item{selectedPaths.size !== 1 ? 's' : ''} selected
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={selectedFiles.length === 0} onClick={handleDownload} type="button">
            Download
          </Button>
          <Button onClick={() => setFolderPickerOpen(true)} type="button">
            Move
          </Button>
          <Button onClick={() => void handleTrash()} type="button" variant="danger">
            Trash
          </Button>
          <Button onClick={clearSelection} type="button">
            Clear
          </Button>
        </div>
      </div>
      {folderPickerOpen ? (
        <FolderPickerDialog
          initialPath={listing?.path ?? ''}
          onClose={() => setFolderPickerOpen(false)}
          onSelect={(path) => void handleMove(path)}
        />
      ) : null}
    </>
  );
}

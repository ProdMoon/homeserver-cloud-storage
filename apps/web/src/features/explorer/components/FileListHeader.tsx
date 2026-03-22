import { useCallback } from 'react';
import {
  selectClearSelection,
  selectListing,
  selectSelectAll,
  selectSelectedPaths,
} from '../../../app/store/selectors';
import { useAppStore } from '../../../app/store/useAppStore';
import type { FileItem } from '../../../shared/types';
import { Button } from '../../../shared/ui/Button';
import { Checkbox } from '../../../shared/ui/Checkbox';
import { FolderPickerDialog } from './FolderPickerDialog';
import { useBatchActions } from '../hooks/useBatchActions';

export function FileListHeader({ items }: { items: FileItem[] }) {
  const selectedPaths = useAppStore(selectSelectedPaths);
  const selectAll = useAppStore(selectSelectAll);
  const clearSelection = useAppStore(selectClearSelection);
  const listing = useAppStore(selectListing);

  const {
    selectedFiles,
    handleDownload,
    handleTrash,
    handleMove,
    folderPickerOpen,
    setFolderPickerOpen,
  } = useBatchActions(items);

  const allSelected = items.length > 0 && selectedPaths.size === items.length;
  const someSelected = selectedPaths.size > 0 && !allSelected;
  const hasSelection = selectedPaths.size > 0;

  const handleSelectAllChange = useCallback(() => {
    if (allSelected) {
      clearSelection();
    } else {
      selectAll();
    }
  }, [allSelected, clearSelection, selectAll]);

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center gap-4 bg-surface-panel-strong px-4.5 py-3.5 font-mono text-[0.78rem] tracking-[0.06em] text-ink-muted uppercase">
        <Checkbox
          aria-label="Select all"
          checked={allSelected}
          indeterminate={someSelected}
          onChange={handleSelectAllChange}
        />
        {hasSelection ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-ink">
              {selectedPaths.size} item{selectedPaths.size !== 1 ? 's' : ''} selected
            </span>
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
        ) : null}
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

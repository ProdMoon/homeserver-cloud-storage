import { useCallback } from 'react';
import {
  selectClearSelection,
  selectListing,
  selectSelectAll,
  selectSelectedPaths,
} from '../../../app/store/selectors';
import { useAppStore } from '../../../app/store/useAppStore';
import { Download, FolderInput, Trash2, X } from 'lucide-react';
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
      <div className="sticky top-0 z-10 flex h-14 items-center gap-4 bg-surface-panel-strong px-4.5 text-[0.78rem] tracking-[0.06em] text-ink-muted">
        <Checkbox
          aria-label="Select all"
          checked={allSelected}
          indeterminate={someSelected}
          onChange={handleSelectAllChange}
        />
        {hasSelection ? (
          <div className="flex w-full items-center justify-between gap-3">
            <span className="text-sm font-medium text-ink">
              {selectedPaths.size} item{selectedPaths.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button
                aria-label="Download"
                disabled={selectedFiles.length === 0}
                onClick={handleDownload}
                size="sm"
                type="button"
              >
                <Download className="size-4" />
              </Button>
              <Button
                aria-label="Move"
                onClick={() => setFolderPickerOpen(true)}
                size="sm"
                type="button"
              >
                <FolderInput className="size-4" />
              </Button>
              <Button
                aria-label="Trash"
                onClick={() => void handleTrash()}
                size="sm"
                type="button"
                variant="danger"
              >
                <Trash2 className="size-4" />
              </Button>
              <Button aria-label="Clear selection" onClick={clearSelection} size="sm" type="button">
                <X className="size-4" />
              </Button>
            </div>
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

import { useCallback } from 'react';
import {
  selectClearSelection,
  selectListing,
  selectSelectAll,
  selectSelectedPaths,
  selectSetSortField,
  selectSortDirection,
  selectSortField,
  selectToggleSortDirection,
} from '../../../app/store/selectors';
import { useAppStore } from '../../../app/store/useAppStore';
import { ArrowDownAZ, ArrowUpAZ, Download, FolderInput, Trash2, X } from 'lucide-react';
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
  const sortField = useAppStore(selectSortField);
  const sortDirection = useAppStore(selectSortDirection);
  const setSortField = useAppStore(selectSetSortField);
  const toggleSortDirection = useAppStore(selectToggleSortDirection);

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
        ) : (
          <div className="flex w-full items-center justify-end gap-2">
            <select
              aria-label="Sort field"
              className="cursor-pointer rounded-lg border border-line bg-white/40 px-2.5 py-1.5 text-xs transition outline-none focus:border-accent/50 focus:bg-white/80"
              onChange={(event) => setSortField(event.target.value as typeof sortField)}
              value={sortField}
            >
              <option value="name">Name</option>
              <option value="size">Size</option>
              <option value="modifiedAt">Modified</option>
            </select>
            <Button
              aria-label="Toggle sort direction"
              onClick={() => toggleSortDirection()}
              size="sm"
              type="button"
            >
              {sortDirection === 'asc' ? (
                <ArrowDownAZ className="size-4" />
              ) : (
                <ArrowUpAZ className="size-4" />
              )}
            </Button>
          </div>
        )}
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

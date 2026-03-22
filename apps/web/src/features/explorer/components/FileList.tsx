import { useCallback, useRef } from 'react';
import {
  selectClearSelection,
  selectFilesLoading,
  selectListing,
  selectSelectAll,
  selectSelectedPaths,
} from '../../../app/store/selectors';
import { useAppStore } from '../../../app/store/useAppStore';
import { cn } from '../../../shared/lib/cn';
import { EmptyState } from '../../../shared/ui/EmptyState';
import type { FileItem } from '../../../shared/types';
import { Checkbox } from '../../../shared/ui/Checkbox';
import { FileRow } from './FileRow';
import { explorerListColumns } from './layout';
import { useDragSelect } from '../hooks/useDragSelect';

export function FileList({ items }: { items: FileItem[] }) {
  const filesLoading = useAppStore(selectFilesLoading);
  const listing = useAppStore(selectListing);
  const selectedPaths = useAppStore(selectSelectedPaths);
  const selectAll = useAppStore(selectSelectAll);
  const clearSelection = useAppStore(selectClearSelection);
  const containerRef = useRef<HTMLDivElement>(null);

  useDragSelect(containerRef);

  const allSelected = items.length > 0 && selectedPaths.size === items.length;
  const someSelected = selectedPaths.size > 0 && !allSelected;

  const handleSelectAllChange = useCallback(() => {
    if (allSelected) {
      clearSelection();
    } else {
      selectAll();
    }
  }, [allSelected, clearSelection, selectAll]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        clearSelection();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === 'a') {
        event.preventDefault();
        selectAll();
      }
    },
    [clearSelection, selectAll]
  );

  return (
    <div
      className="overflow-auto rounded-3xl border border-line bg-surface-panel"
      onKeyDown={handleKeyDown}
      ref={containerRef}
    >
      <div className="w-max min-w-full">
        <div
          className={cn(
            'hidden items-center gap-4 bg-surface-panel-strong px-4.5 py-3.5 font-mono text-[0.78rem] tracking-[0.06em] text-ink-muted uppercase xl:grid',
            explorerListColumns
          )}
        >
          <Checkbox
            aria-label="Select all"
            checked={allSelected}
            indeterminate={someSelected}
            onChange={handleSelectAllChange}
          />
          <span>Name</span>
          <span>Modified</span>
          <span>Size</span>
          <span>Actions</span>
        </div>
        {filesLoading && !listing ? <EmptyState description="Loading files..." /> : null}
        {!filesLoading && listing && items.length === 0 ? (
          <EmptyState
            description="Upload files or create a new folder to start using the drive."
            title="This folder is empty."
          />
        ) : null}
        {items.map((item) => (
          <FileRow item={item} key={item.path} />
        ))}
      </div>
    </div>
  );
}

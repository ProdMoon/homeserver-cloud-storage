import { useCallback, useRef } from 'react';
import {
  selectClearSelection,
  selectFilesLoading,
  selectListing,
  selectSelectAll,
  selectSelectedPaths,
} from '../../../app/store/selectors';
import { useAppStore } from '../../../app/store/useAppStore';
import { useEscapeStack } from '../../../shared/hooks/useEscapeStack';
import type { FileItem } from '../../../shared/types';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { FileListHeader } from './FileListHeader';
import { FileRow } from './FileRow';
import { useDragSelect } from '../hooks/useDragSelect';

export function FileList({ items }: { items: FileItem[] }) {
  const filesLoading = useAppStore(selectFilesLoading);
  const listing = useAppStore(selectListing);
  const selectAll = useAppStore(selectSelectAll);
  const clearSelection = useAppStore(selectClearSelection);
  const selectedPaths = useAppStore(selectSelectedPaths);
  const containerRef = useRef<HTMLDivElement>(null);

  useDragSelect(containerRef);
  useEscapeStack(() => clearSelection(), selectedPaths.size > 0);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'a') {
        event.preventDefault();
        selectAll();
      }
    },
    [selectAll]
  );

  return (
    <div
      className="overflow-clip rounded-3xl border border-line bg-surface-panel"
      onKeyDown={handleKeyDown}
      ref={containerRef}
    >
      <FileListHeader items={items} />
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
  );
}

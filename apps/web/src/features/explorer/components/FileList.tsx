import { selectFilesLoading, selectListing } from '../../../app/store/selectors';
import { useAppStore } from '../../../app/store/useAppStore';
import { cn } from '../../../shared/lib/cn';
import { EmptyState } from '../../../shared/ui/EmptyState';
import type { FileItem } from '../../../shared/types';
import { FileRow } from './FileRow';
import { explorerListColumns } from './layout';

export function FileList({ items }: { items: FileItem[] }) {
  const filesLoading = useAppStore(selectFilesLoading);
  const listing = useAppStore(selectListing);

  return (
    <div className="overflow-auto rounded-[24px] border border-line bg-surface-panel">
      <div className="min-w-full w-max">
        <div
          className={cn(
            'hidden items-center gap-4 bg-surface-panel-strong px-[18px] py-3.5 font-mono text-[0.78rem] uppercase tracking-[0.06em] text-ink-muted xl:grid',
            explorerListColumns
          )}
        >
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

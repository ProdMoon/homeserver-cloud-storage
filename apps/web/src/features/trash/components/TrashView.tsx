import {
  selectPurgeItem,
  selectRestoreItem,
  selectTrashItems,
  selectTrashLoading,
} from '../../../app/store/selectors';
import { useAppStore } from '../../../app/store/useAppStore';
import { cn } from '../../../shared/lib/cn';
import { formatBytes, formatDate } from '../../../shared/lib/formatters';
import { Button } from '../../../shared/ui/Button';
import { EmptyState } from '../../../shared/ui/EmptyState';

const trashColumns = 'xl:grid-cols-[minmax(220px,1.2fr)_minmax(180px,1fr)_10rem_minmax(0,1fr)]';

export function TrashView() {
  const trashItems = useAppStore(selectTrashItems);
  const trashLoading = useAppStore(selectTrashLoading);
  const restoreItem = useAppStore(selectRestoreItem);
  const purgeItem = useAppStore(selectPurgeItem);

  async function handlePurge(itemId: string, itemName: string) {
    const item = trashItems.find((trashItem) => trashItem.id === itemId);

    if (!item) {
      return;
    }

    if (!window.confirm(`Delete "${itemName}" permanently?`)) {
      return;
    }

    await purgeItem(item);
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <div className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-accent">
          Trash
        </div>
        <h1 className="mt-3 text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.04em]">
          Deleted items
        </h1>
      </header>
      <div className="overflow-auto rounded-[24px] border border-line bg-surface-panel">
        <div className="min-w-full w-max">
          <div
            className={cn(
              'hidden items-center gap-4 bg-surface-panel-strong px-[18px] py-3.5 font-mono text-[0.78rem] uppercase tracking-[0.06em] text-ink-muted xl:grid',
              trashColumns
            )}
          >
            <span>Name</span>
            <span>Original path</span>
            <span>Deleted</span>
            <span>Actions</span>
          </div>
          {trashLoading && trashItems.length === 0 ? (
            <EmptyState description="Loading trash..." />
          ) : null}
          {!trashLoading && trashItems.length === 0 ? (
            <EmptyState
              description="Deleted items will stay here until you restore or permanently remove them."
              title="Trash is clear."
            />
          ) : null}
          {trashItems.map((item) => (
            <div
              className={cn(
                'grid grid-cols-1 gap-2.5 border-t border-line px-[18px] py-3.5 xl:items-center xl:gap-4',
                trashColumns
              )}
              key={item.id}
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-[18px] bg-[linear-gradient(135deg,rgba(219,109,48,0.24),rgba(19,35,55,0.14))] font-mono text-xs">
                  <span>{item.itemKind === 'directory' ? 'DIR' : 'TR'}</span>
                </div>
                <div className="min-w-0">
                  <strong className="block truncate">{item.itemName}</strong>
                  <div className="text-sm text-ink-muted">{formatBytes(item.sizeBytes)}</div>
                </div>
              </div>
              <span className="break-words font-mono text-[0.82rem] text-ink-muted">
                {item.originalPath}
              </span>
              <span className="text-sm text-ink-muted">{formatDate(item.deletedAt)}</span>
              <div className="flex min-w-0 flex-wrap items-center gap-3 xl:flex-nowrap xl:justify-between">
                <Button onClick={() => void restoreItem(item)} type="button">
                  Restore
                </Button>
                <Button
                  onClick={() => void handlePurge(item.id, item.itemName)}
                  type="button"
                  variant="danger"
                >
                  Delete forever
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

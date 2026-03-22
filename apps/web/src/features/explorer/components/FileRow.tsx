import type { KeyboardEvent } from 'react';
import { previewUrl, downloadUrl } from '../../../shared/api/files';
import { cn } from '../../../shared/lib/cn';
import { formatBytes, formatDate, previewLabel } from '../../../shared/lib/formatters';
import type { FileItem } from '../../../shared/types';
import { Download, FolderInput, Pencil, Trash2 } from 'lucide-react';
import { Button, LinkButton } from '../../../shared/ui/Button';
import { Checkbox } from '../../../shared/ui/Checkbox';
import {
  selectDeleteItem,
  selectMoveItem,
  selectOpenPreview,
  selectRenameItem,
  selectSelectedPaths,
  selectSetCurrentPath,
  selectToggleSelectedPath,
} from '../../../app/store/selectors';
import { useAppStore } from '../../../app/store/useAppStore';

export function FileRow({ item }: { item: FileItem }) {
  const selectedPaths = useAppStore(selectSelectedPaths);
  const setCurrentPath = useAppStore(selectSetCurrentPath);
  const toggleSelectedPath = useAppStore(selectToggleSelectedPath);
  const openPreview = useAppStore(selectOpenPreview);
  const renameItem = useAppStore(selectRenameItem);
  const moveItem = useAppStore(selectMoveItem);
  const deleteItem = useAppStore(selectDeleteItem);

  async function handleRename() {
    const name = window.prompt('Rename item', item.name);

    if (!name || name === item.name) {
      return;
    }

    await renameItem(item, name);
  }

  async function handleMove() {
    const destinationPath = window.prompt('Move to folder path', '');

    if (destinationPath == null) {
      return;
    }

    await moveItem(item, destinationPath);
  }

  async function handleDelete() {
    if (!window.confirm(`Move "${item.name}" to trash?`)) {
      return;
    }

    await deleteItem(item);
  }

  function activateItem() {
    if (item.type === 'directory') {
      setCurrentPath(item.path);
      return;
    }

    openPreview(item);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activateItem();
    }
  }

  return (
    <div
      className={cn(
        'grid cursor-pointer grid-cols-1 gap-2.5 border-t border-line px-4.5 py-3.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-inset xl:items-center xl:gap-4',
        selectedPaths.has(item.path) ? 'bg-accent-wash hover:bg-accent/12' : 'hover:bg-black/3'
      )}
      data-path={item.path}
      onClick={activateItem}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center gap-3.5">
        <Checkbox
          aria-label={`Select ${item.name}`}
          checked={selectedPaths.has(item.path)}
          onChange={() => toggleSelectedPath(item.path)}
        />
        <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-md bg-[linear-gradient(135deg,rgba(219,109,48,0.24),rgba(19,35,55,0.14))] font-mono text-xs xl:h-14 xl:w-14 xl:rounded-2xl">
          {item.thumbnailAvailable ? (
            <img
              alt=""
              className="h-full w-full object-cover"
              src={previewUrl(item.path, 'thumb')}
            />
          ) : (
            <span>{item.type === 'directory' ? 'DIR' : previewLabel(item.previewKind)}</span>
          )}
        </div>
        <div className="min-w-0">
          <strong className="block truncate text-sm xl:text-base">{item.name}</strong>
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <span>{item.type === 'directory' ? 'Folder' : (item.mimeType ?? 'Binary file')}</span>
            {item.type !== 'directory' && <span>{formatBytes(item.size)}</span>}
          </div>
          <div className="text-xs text-ink-muted">{formatDate(item.modifiedAt)}</div>
        </div>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 xl:flex-nowrap xl:justify-end">
        {item.type === 'file' ? (
          <LinkButton aria-label="Download" href={downloadUrl(item.path)} size="sm">
            <Download className="size-4" />
          </LinkButton>
        ) : null}
        <Button aria-label="Rename" onClick={() => void handleRename()} size="sm" type="button">
          <Pencil className="size-4" />
        </Button>
        <Button aria-label="Move" onClick={() => void handleMove()} size="sm" type="button">
          <FolderInput className="size-4" />
        </Button>
        <Button
          aria-label="Trash"
          onClick={() => void handleDelete()}
          size="sm"
          type="button"
          variant="danger"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

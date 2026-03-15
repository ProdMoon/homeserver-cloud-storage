import type { KeyboardEvent } from "react";
import { previewUrl, downloadUrl } from "../../../shared/api/files";
import { formatBytes, formatDate, previewLabel } from "../../../shared/lib/formatters";
import type { FileItem } from "../../../shared/types";
import { Button, LinkButton } from "../../../shared/ui/Button";
import {
  selectDeleteItem,
  selectMoveItem,
  selectOpenPreview,
  selectRenameItem,
  selectSelectedPath,
  selectSetCurrentPath,
  selectSetSelectedPath
} from "../../../app/store/selectors";
import { useAppStore } from "../../../app/store/useAppStore";
import styles from "./FileRow.module.css";

export function FileRow({ item }: { item: FileItem }) {
  const selectedPath = useAppStore(selectSelectedPath);
  const setCurrentPath = useAppStore(selectSetCurrentPath);
  const setSelectedPath = useAppStore(selectSetSelectedPath);
  const openPreview = useAppStore(selectOpenPreview);
  const renameItem = useAppStore(selectRenameItem);
  const moveItem = useAppStore(selectMoveItem);
  const deleteItem = useAppStore(selectDeleteItem);

  async function handleRename() {
    const name = window.prompt("Rename item", item.name);

    if (!name || name === item.name) {
      return;
    }

    await renameItem(item, name);
  }

  async function handleMove() {
    const destinationPath = window.prompt("Move to folder path", "");

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
    if (item.type === "directory") {
      setCurrentPath(item.path);
      return;
    }

    openPreview(item);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activateItem();
    }
  }

  return (
    <div
      className={selectedPath === item.path ? `${styles.row} ${styles.selected}` : styles.row}
      onClick={() => setSelectedPath(item.path)}
      onDoubleClick={activateItem}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className={styles.main}>
        <div className={styles.thumb}>
          {item.thumbnailAvailable ? (
            <img alt="" src={previewUrl(item.path, "thumb")} />
          ) : (
            <span>{item.type === "directory" ? "DIR" : previewLabel(item.previewKind)}</span>
          )}
        </div>
        <div>
          <strong>{item.name}</strong>
          <div className={styles.hint}>{item.type === "directory" ? "Folder" : item.mimeType ?? "Binary file"}</div>
        </div>
      </div>
      <span>{formatDate(item.modifiedAt)}</span>
      <span>{item.type === "directory" ? "—" : formatBytes(item.size)}</span>
      <div className={styles.actions}>
        {item.type === "directory" ? (
          <Button onClick={() => setCurrentPath(item.path)} type="button">
            Open
          </Button>
        ) : (
          <Button onClick={() => openPreview(item)} type="button">
            Preview
          </Button>
        )}
        {item.type === "file" ? (
          <LinkButton href={downloadUrl(item.path)}>Download</LinkButton>
        ) : null}
        <Button onClick={() => void handleRename()} type="button">
          Rename
        </Button>
        <Button onClick={() => void handleMove()} type="button">
          Move
        </Button>
        <Button onClick={() => void handleDelete()} type="button" variant="danger">
          Trash
        </Button>
      </div>
    </div>
  );
}


import { selectPurgeItem, selectRestoreItem, selectTrashItems, selectTrashLoading } from "../../../app/store/selectors";
import { useAppStore } from "../../../app/store/useAppStore";
import { formatBytes, formatDate } from "../../../shared/lib/formatters";
import { Button } from "../../../shared/ui/Button";
import { EmptyState } from "../../../shared/ui/EmptyState";
import styles from "./TrashView.module.css";

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
    <div className={styles.view}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>Trash</div>
        <h1>Deleted items</h1>
      </header>
      <div className={styles.panel}>
        <div className={styles.headerRow}>
          <span>Name</span>
          <span>Original path</span>
          <span>Deleted</span>
          <span>Actions</span>
        </div>
        {trashLoading && trashItems.length === 0 ? <EmptyState description="Loading trash..." /> : null}
        {!trashLoading && trashItems.length === 0 ? (
          <EmptyState
            description="Deleted items will stay here until you restore or permanently remove them."
            title="Trash is clear."
          />
        ) : null}
        {trashItems.map((item) => (
          <div className={styles.row} key={item.id}>
            <div className={styles.main}>
              <div className={styles.thumb}>
                <span>{item.itemKind === "directory" ? "DIR" : "TR"}</span>
              </div>
              <div>
                <strong>{item.itemName}</strong>
                <div className={styles.hint}>{formatBytes(item.sizeBytes)}</div>
              </div>
            </div>
            <span className={styles.pathChip}>{item.originalPath}</span>
            <span>{formatDate(item.deletedAt)}</span>
            <div className={styles.actions}>
              <Button onClick={() => void restoreItem(item)} type="button">
                Restore
              </Button>
              <Button onClick={() => void handlePurge(item.id, item.itemName)} type="button" variant="danger">
                Delete forever
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


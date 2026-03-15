import { selectFilesLoading, selectListing } from "../../../app/store/selectors";
import { useAppStore } from "../../../app/store/useAppStore";
import { EmptyState } from "../../../shared/ui/EmptyState";
import type { FileItem } from "../../../shared/types";
import { FileRow } from "./FileRow";
import styles from "./FileList.module.css";

export function FileList({ items }: { items: FileItem[] }) {
  const filesLoading = useAppStore(selectFilesLoading);
  const listing = useAppStore(selectListing);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span>Name</span>
        <span>Modified</span>
        <span>Size</span>
        <span>Actions</span>
      </div>
      {filesLoading && !listing ? <EmptyState description="Loading files..." /> : null}
      {!filesLoading && listing && items.length === 0 ? (
        <EmptyState description="Upload files or create a new folder to start using the drive." title="This folder is empty." />
      ) : null}
      {items.map((item) => (
        <FileRow item={item} key={item.path} />
      ))}
    </div>
  );
}


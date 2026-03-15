import {
  selectCurrentPath,
  selectListing,
  selectSetSortField,
  selectSortDirection,
  selectSortField,
  selectToggleSortDirection
} from "../../../app/store/selectors";
import { useAppStore } from "../../../app/store/useAppStore";
import { Button } from "../../../shared/ui/Button";
import { sortItems } from "../lib/sort";
import { BreadcrumbNav } from "./BreadcrumbNav";
import { ExplorerToolbar } from "./ExplorerToolbar";
import { FileList } from "./FileList";
import styles from "./FileExplorerView.module.css";

export function FileExplorerView() {
  const currentPath = useAppStore(selectCurrentPath);
  const listing = useAppStore(selectListing);
  const sortField = useAppStore(selectSortField);
  const sortDirection = useAppStore(selectSortDirection);
  const setSortField = useAppStore(selectSetSortField);
  const toggleSortDirection = useAppStore(selectToggleSortDirection);
  const items = listing ? sortItems(listing.items, sortField, sortDirection) : [];

  return (
    <div className={styles.view}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Explorer</div>
          <h1>File browser</h1>
        </div>
        <ExplorerToolbar />
      </header>
      <div className={styles.breadcrumbRow}>
        <BreadcrumbNav pathValue={listing?.path ?? currentPath} />
        <div className={styles.sortControls}>
          <select aria-label="Sort field" onChange={(event) => setSortField(event.target.value as typeof sortField)} value={sortField}>
            <option value="name">Name</option>
            <option value="size">Size</option>
            <option value="modifiedAt">Modified</option>
          </select>
          <Button onClick={() => toggleSortDirection()} type="button">
            {sortDirection === "asc" ? "Ascending" : "Descending"}
          </Button>
        </div>
      </div>
      <FileList items={items} />
    </div>
  );
}


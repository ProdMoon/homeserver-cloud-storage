import {
  selectCurrentPath,
  selectListing,
  selectSelectedPaths,
  selectSetSortField,
  selectSortDirection,
  selectSortField,
  selectToggleSortDirection,
} from '../../../app/store/selectors';
import { useAppStore } from '../../../app/store/useAppStore';
import { Button } from '../../../shared/ui/Button';
import { sortItems } from '../lib/sort';
import { BatchToolbar } from './BatchToolbar';
import { BreadcrumbNav } from './BreadcrumbNav';
import { ExplorerToolbar } from './ExplorerToolbar';
import { FileList } from './FileList';

export function FileExplorerView() {
  const currentPath = useAppStore(selectCurrentPath);
  const listing = useAppStore(selectListing);
  const selectedPaths = useAppStore(selectSelectedPaths);
  const sortField = useAppStore(selectSortField);
  const sortDirection = useAppStore(selectSortDirection);
  const setSortField = useAppStore(selectSetSortField);
  const toggleSortDirection = useAppStore(selectToggleSortDirection);
  const items = listing ? sortItems(listing.items, sortField, sortDirection) : [];

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-accent">
            Explorer
          </div>
          <h1 className="mt-3 text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.04em]">
            File browser
          </h1>
        </div>
        <ExplorerToolbar />
      </header>
      {selectedPaths.size > 0 ? <BatchToolbar items={items} /> : null}
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
        <BreadcrumbNav pathValue={listing?.path ?? currentPath} />
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Sort field"
            className="cursor-pointer rounded-[14px] border border-line bg-white/40 px-4 py-3 text-sm outline-none transition focus:border-accent/50 focus:bg-white/80"
            onChange={(event) => setSortField(event.target.value as typeof sortField)}
            value={sortField}
          >
            <option value="name">Name</option>
            <option value="size">Size</option>
            <option value="modifiedAt">Modified</option>
          </select>
          <Button onClick={() => toggleSortDirection()} type="button">
            {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
          </Button>
        </div>
      </div>
      <FileList items={items} />
    </div>
  );
}

import {
  selectCurrentPath,
  selectListing,
  selectSetCurrentPath,
  selectSortDirection,
  selectSortField,
} from '../../../app/store/selectors';
import { useAppStore } from '../../../app/store/useAppStore';
import { sortItems } from '../lib/sort';
import { BreadcrumbNav } from './BreadcrumbNav';
import { ExplorerToolbar } from './ExplorerToolbar';
import { FileList } from './FileList';

export function FileExplorerView() {
  const currentPath = useAppStore(selectCurrentPath);
  const listing = useAppStore(selectListing);
  const sortField = useAppStore(selectSortField);
  const sortDirection = useAppStore(selectSortDirection);
  const setCurrentPath = useAppStore(selectSetCurrentPath);
  const items = listing ? sortItems(listing.items, sortField, sortDirection) : [];

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-mono text-[0.72rem] tracking-[0.16em] text-accent uppercase">
            Explorer
          </div>
          <h1 className="mt-3 text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.04em]">
            File browser
          </h1>
        </div>
        <ExplorerToolbar />
      </header>
      <BreadcrumbNav pathValue={listing?.path ?? currentPath} onNavigate={setCurrentPath} />
      <FileList items={items} />
    </div>
  );
}

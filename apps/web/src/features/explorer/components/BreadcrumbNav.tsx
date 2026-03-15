import { selectSetCurrentPath } from '../../../app/store/selectors';
import { useAppStore } from '../../../app/store/useAppStore';
import { breadcrumbs } from '../lib/breadcrumbs';

export function BreadcrumbNav({ pathValue }: { pathValue: string }) {
  const setCurrentPath = useAppStore(selectSetCurrentPath);

  return (
    <div className="flex flex-wrap gap-2">
      {breadcrumbs(pathValue).map((crumb) => (
        <button
          className="cursor-pointer rounded-full bg-black/5 px-3 py-2 text-sm transition duration-150 ease-out hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          key={crumb.path || 'root'}
          onClick={() => setCurrentPath(crumb.path)}
          type="button"
        >
          {crumb.label}
        </button>
      ))}
    </div>
  );
}

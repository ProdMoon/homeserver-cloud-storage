import { breadcrumbs } from '../lib/breadcrumbs';

interface BreadcrumbNavProps {
  pathValue: string;
  onNavigate: (path: string) => void;
}

export function BreadcrumbNav({ pathValue, onNavigate }: BreadcrumbNavProps) {
  const crumbs = breadcrumbs(pathValue);

  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm">
      {crumbs.map((crumb, index) => (
        <span className="flex items-center gap-1" key={crumb.path || 'root'}>
          {index > 0 ? <span className="text-ink-muted">/</span> : null}
          <button
            className="cursor-pointer rounded-lg px-2 py-1 text-accent hover:bg-accent-wash"
            onClick={() => onNavigate(crumb.path)}
            type="button"
          >
            {crumb.label}
          </button>
        </span>
      ))}
    </nav>
  );
}

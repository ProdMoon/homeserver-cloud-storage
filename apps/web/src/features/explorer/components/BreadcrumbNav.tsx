import { selectSetCurrentPath } from "../../../app/store/selectors";
import { useAppStore } from "../../../app/store/useAppStore";
import { breadcrumbs } from "../lib/breadcrumbs";
import styles from "./BreadcrumbNav.module.css";

export function BreadcrumbNav({ pathValue }: { pathValue: string }) {
  const setCurrentPath = useAppStore(selectSetCurrentPath);

  return (
    <div className={styles.breadcrumbs}>
      {breadcrumbs(pathValue).map((crumb) => (
        <button key={crumb.path || "root"} onClick={() => setCurrentPath(crumb.path)} type="button">
          {crumb.label}
        </button>
      ))}
    </div>
  );
}


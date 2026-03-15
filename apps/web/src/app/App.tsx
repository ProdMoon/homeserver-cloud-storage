import { useEffect } from "react";
import {
  selectActiveView,
  selectBootstrapSession,
  selectCurrentPath,
  selectError,
  selectRefreshFiles,
  selectRefreshTrash,
  selectSession,
  selectSetActiveView,
  selectLogout
} from "./store/selectors";
import { useAppStore } from "./store/useAppStore";
import { LoginScreen } from "../features/auth/components/LoginScreen";
import { FileExplorerView } from "../features/explorer/components/FileExplorerView";
import { PreviewModal } from "../features/preview/components/PreviewModal";
import { TrashView } from "../features/trash/components/TrashView";
import { UploadQueue } from "../features/uploads/components/UploadQueue";
import { Button } from "../shared/ui/Button";
import { ErrorBanner } from "../shared/ui/ErrorBanner";
import styles from "./App.module.css";

export function App() {
  const activeView = useAppStore(selectActiveView);
  const bootstrapSession = useAppStore(selectBootstrapSession);
  const currentPath = useAppStore(selectCurrentPath);
  const error = useAppStore(selectError);
  const logout = useAppStore(selectLogout);
  const refreshFiles = useAppStore(selectRefreshFiles);
  const refreshTrash = useAppStore(selectRefreshTrash);
  const session = useAppStore(selectSession);
  const setActiveView = useAppStore(selectSetActiveView);

  useEffect(() => {
    void bootstrapSession();
  }, [bootstrapSession]);

  useEffect(() => {
    if (!session?.authenticated) {
      return;
    }

    if (activeView === "files") {
      void refreshFiles(currentPath);
      return;
    }

    void refreshTrash();
  }, [activeView, currentPath, refreshFiles, refreshTrash, session?.authenticated]);

  useEffect(() => {
    if (!session?.authenticated) {
      return;
    }

    const interval = window.setInterval(() => {
      if (activeView === "files") {
        void refreshFiles(currentPath, { preserveScroll: true, quiet: true });
      } else {
        void refreshTrash({ preserveScroll: true, quiet: true });
      }
    }, session.pollIntervalMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [activeView, currentPath, refreshFiles, refreshTrash, session?.authenticated, session?.pollIntervalMs]);

  if (!session?.authenticated) {
    return <LoginScreen />;
  }

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <div>
          <div className={styles.sidebarHeader}>
            <div className={styles.eyebrow}>Signed in as</div>
            <h2>{session.username}</h2>
          </div>
          <p className={styles.sidebarCopy}>
            One private admin account, browser-native previews, and a safety net trash layer.
          </p>
          <div className={styles.sidebarActions}>
            <Button active={activeView === "files"} onClick={() => setActiveView("files")} type="button" variant="nav">
              Files
            </Button>
            <Button active={activeView === "trash"} onClick={() => setActiveView("trash")} type="button" variant="nav">
              Trash
            </Button>
            <Button
              onClick={() =>
                activeView === "files"
                  ? void refreshFiles(currentPath, { preserveScroll: true })
                  : void refreshTrash({ preserveScroll: true })
              }
              type="button"
              variant="nav"
            >
              Refresh
            </Button>
            <Button onClick={() => void logout()} type="button" variant="nav">
              Log out
            </Button>
          </div>
        </div>
        <UploadQueue />
      </aside>
      <section className={styles.workspace}>
        {error ? <ErrorBanner message={error} /> : null}
        {activeView === "files" ? <FileExplorerView /> : <TrashView />}
      </section>
      <PreviewModal />
    </main>
  );
}


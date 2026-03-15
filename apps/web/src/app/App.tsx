import { useEffect } from 'react';
import {
  selectActiveView,
  selectBootstrapSession,
  selectCurrentPath,
  selectError,
  selectRefreshFiles,
  selectRefreshTrash,
  selectSession,
  selectSetActiveView,
  selectLogout,
} from './store/selectors';
import { useAppStore } from './store/useAppStore';
import { LoginScreen } from '../features/auth/components/LoginScreen';
import { FileExplorerView } from '../features/explorer/components/FileExplorerView';
import { PreviewModal } from '../features/preview/components/PreviewModal';
import { TrashView } from '../features/trash/components/TrashView';
import { UploadQueue } from '../features/uploads/components/UploadQueue';
import { Button } from '../shared/ui/Button';
import { ErrorBanner } from '../shared/ui/ErrorBanner';

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

    if (activeView === 'files') {
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
      if (activeView === 'files') {
        void refreshFiles(currentPath, { preserveScroll: true, quiet: true });
      } else {
        void refreshTrash({ preserveScroll: true, quiet: true });
      }
    }, session.pollIntervalMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [
    activeView,
    currentPath,
    refreshFiles,
    refreshTrash,
    session?.authenticated,
    session?.pollIntervalMs,
  ]);

  if (!session?.authenticated) {
    return <LoginScreen />;
  }

  return (
    <main className="grid min-h-screen gap-6 p-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="flex flex-col justify-between gap-5 rounded-[22px] bg-surface-sidebar p-6 text-sidebar-text shadow-cloud backdrop-blur-xl sm:rounded-[28px]">
        <div>
          <div>
            <div className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-accent">
              Signed in as
            </div>
            <h2 className="mt-3 text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.04em]">
              {session.username}
            </h2>
          </div>
          <p className="mt-4 max-w-[34ch] text-sidebar-copy">
            One private admin account, browser-native previews, and a safety net trash layer.
          </p>
          <div className="grid gap-2.5">
            <Button
              active={activeView === 'files'}
              onClick={() => setActiveView('files')}
              type="button"
              variant="nav"
            >
              Files
            </Button>
            <Button
              active={activeView === 'trash'}
              onClick={() => setActiveView('trash')}
              type="button"
              variant="nav"
            >
              Trash
            </Button>
            <Button
              onClick={() =>
                activeView === 'files'
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
      <section className="flex flex-col gap-4 rounded-[22px] bg-surface-card p-6 shadow-cloud backdrop-blur-xl sm:rounded-[28px]">
        {error ? <ErrorBanner message={error} /> : null}
        {activeView === 'files' ? <FileExplorerView /> : <TrashView />}
      </section>
      <PreviewModal />
    </main>
  );
}

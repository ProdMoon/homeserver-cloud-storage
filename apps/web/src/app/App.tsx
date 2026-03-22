import { useEffect } from 'react';
import {
  selectActiveView,
  selectBootstrapSession,
  selectCurrentPath,
  selectError,
  selectLogout,
  selectRefreshFiles,
  selectRefreshTrash,
  selectSession,
  selectSetActiveView,
  selectUploads,
} from './store/selectors';
import { useAppStore } from './store/useAppStore';
import { LoginScreen } from '../features/auth/components/LoginScreen';
import { FileExplorerView } from '../features/explorer/components/FileExplorerView';
import { PreviewModal } from '../features/preview/components/PreviewModal';
import { TrashView } from '../features/trash/components/TrashView';
import { UploadQueue } from '../features/uploads/components/UploadQueue';
import { Button } from '../shared/ui/Button';
import { ErrorBanner } from '../shared/ui/ErrorBanner';
import { FilesIcon, LogoutIcon, RefreshIcon, TrashIcon } from '../shared/ui/Icons';

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
  const uploads = useAppStore(selectUploads);

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

  const navActions = [
    {
      active: activeView === 'files',
      icon: <FilesIcon className="size-5" />,
      label: 'Files',
      onClick: () => setActiveView('files'),
    },
    {
      active: activeView === 'trash',
      icon: <TrashIcon className="size-5" />,
      label: 'Trash',
      onClick: () => setActiveView('trash'),
    },
    {
      active: false,
      icon: <RefreshIcon className="size-5" />,
      label: 'Refresh',
      onClick: () =>
        activeView === 'files'
          ? void refreshFiles(currentPath, { preserveScroll: true })
          : void refreshTrash({ preserveScroll: true }),
    },
    {
      active: false,
      icon: <LogoutIcon className="size-5" />,
      label: 'Log out',
      onClick: () => void logout(),
    },
  ];

  return (
    <main className="flex min-h-screen flex-col gap-6 p-6 xl:grid xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-5 rounded-[22px] bg-surface-sidebar px-3 py-2 text-sidebar-text shadow-cloud backdrop-blur-xl sm:rounded-[28px] xl:justify-between xl:p-6">
        <div className="flex flex-col gap-4">
          <div className="hidden xl:block">
            <div className="font-mono text-[0.72rem] tracking-[0.16em] text-accent uppercase">
              Signed in as
            </div>
            <h2 className="mt-3 text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.04em]">
              {session.username}
            </h2>
          </div>
          <div className="flex items-center gap-2.5 xl:grid">
            {navActions.map((action) => (
              <Button
                active={action.active}
                aria-label={action.label}
                className="h-8 w-12 justify-center px-0 py-0 xl:aspect-auto xl:h-auto xl:w-auto xl:justify-start xl:px-4 xl:py-3"
                key={action.label}
                onClick={action.onClick}
                type="button"
                variant="nav"
              >
                <span aria-hidden="true" className="xl:hidden">
                  {action.icon}
                </span>
                <span className="hidden xl:inline">{action.label}</span>
              </Button>
            ))}
          </div>
        </div>
        {uploads.length > 0 ? <UploadQueue /> : null}
      </aside>
      <section className="flex flex-col gap-4 rounded-[22px] bg-surface-card p-6 shadow-cloud backdrop-blur-xl sm:rounded-[28px]">
        {error ? <ErrorBanner message={error} /> : null}
        {activeView === 'files' ? <FileExplorerView /> : <TrashView />}
      </section>
      <PreviewModal />
    </main>
  );
}

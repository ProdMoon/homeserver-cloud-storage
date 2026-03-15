import {
  startTransition,
  useEffect,
  useEffectEvent,
  useId,
  useState,
  type FormEvent
} from "react";
import {
  createFolder,
  deleteFile,
  deleteTrash,
  downloadUrl,
  getSession,
  listFiles,
  listTrash,
  login,
  logout,
  moveFile,
  previewUrl,
  renameFile,
  restoreTrash,
  uploadFiles
} from "./api";
import type { DirectoryListing, FileItem, PreviewKind, SessionState, TrashItem } from "./types";

type ViewMode = "files" | "trash";
type SortField = "name" | "size" | "modifiedAt";
type SortDirection = "asc" | "desc";

interface UploadItem {
  id: string;
  names: string[];
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

interface RefreshOptions {
  preserveScroll?: boolean;
  quiet?: boolean;
}

function formatBytes(bytes: number): string {
  if (!bytes) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function compareItems(left: FileItem, right: FileItem, sortField: SortField, direction: SortDirection) {
  const factor = direction === "asc" ? 1 : -1;

  if (left.type !== right.type) {
    return left.type === "directory" ? -1 : 1;
  }

  if (sortField === "size") {
    return (left.size - right.size) * factor || left.name.localeCompare(right.name);
  }

  if (sortField === "modifiedAt") {
    return (new Date(left.modifiedAt).getTime() - new Date(right.modifiedAt).getTime()) * factor || left.name.localeCompare(right.name);
  }

  return left.name.localeCompare(right.name) * factor;
}

function sortItems(items: FileItem[], sortField: SortField, direction: SortDirection): FileItem[] {
  return [...items].sort((left, right) => compareItems(left, right, sortField, direction));
}

function joinPath(parentPath: string, name: string): string {
  return parentPath ? `${parentPath}/${name}` : name;
}

function breadcrumbs(pathValue: string): Array<{ label: string; path: string }> {
  if (!pathValue) {
    return [{ label: "Home", path: "" }];
  }

  const segments = pathValue.split("/");
  return [{ label: "Home", path: "" }].concat(
    segments.map((segment, index) => ({
      label: segment,
      path: segments.slice(0, index + 1).join("/")
    }))
  );
}

function previewLabel(kind: PreviewKind) {
  switch (kind) {
    case "image":
      return "Image";
    case "video":
      return "Video";
    case "pdf":
      return "PDF";
    case "text":
      return "Text";
    case "audio":
      return "Audio";
    default:
      return "File";
  }
}

function captureWindowScroll(enabled: boolean | undefined) {
  if (!enabled) {
    return null;
  }

  return {
    left: window.scrollX,
    top: window.scrollY
  };
}

function restoreWindowScroll(position: { left: number; top: number } | null) {
  if (!position) {
    return;
  }

  window.requestAnimationFrame(() => {
    window.scrollTo(position.left, position.top);
  });
}

function LoginScreen({
  busy,
  error,
  onSubmit
}: {
  busy: boolean;
  error: string | null;
  onSubmit: (username: string, password: string) => Promise<void>;
}) {
  const usernameId = useId();
  const passwordId = useId();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(username, password);
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="eyebrow">Pi Home Drive</div>
        <h1>Private storage without the cloud rent.</h1>
        <p className="login-copy">
          Browse, preview, upload, and recover files from your Raspberry Pi with one admin account and a
          clean remote explorer.
        </p>
        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor={usernameId}>Username</label>
          <input id={usernameId} value={username} onChange={(event) => setUsername(event.target.value)} />
          <label htmlFor={passwordId}>Password</label>
          <input
            id={passwordId}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error ? <div className="error-banner">{error}</div> : null}
          <button className="primary-button" disabled={busy} type="submit">
            {busy ? "Signing in..." : "Enter Drive"}
          </button>
        </form>
      </section>
    </main>
  );
}

function PreviewModal({
  file,
  onClose
}: {
  file: FileItem | null;
  onClose: () => void;
}) {
  const [textContent, setTextContent] = useState<string>("");
  const [textError, setTextError] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);

  useEffect(() => {
    if (!file || file.previewKind !== "text") {
      setTextContent("");
      setTextError(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setTextLoading(true);
    setTextError(null);
    fetch(previewUrl(file.path, "inline"), { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Text preview failed.");
        }

        return response.text();
      })
      .then((nextText) => {
        if (!cancelled) {
          setTextContent(nextText);
        }
      })
      .catch((error: Error) => {
        if (!cancelled && error.name !== "AbortError") {
          setTextError(error.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setTextLoading(false);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [file]);

  if (!file) {
    return null;
  }

  return (
    <div className="modal-scrim" role="dialog" aria-modal="true">
      <div className="modal-panel">
        <div className="modal-header">
          <div>
            <div className="eyebrow">{previewLabel(file.previewKind)}</div>
            <h2>{file.name}</h2>
          </div>
          <button className="ghost-button" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div className="modal-body">
          {file.previewKind === "image" ? <img alt={file.name} className="preview-image" src={previewUrl(file.path, "inline")} /> : null}
          {file.previewKind === "video" ? <video className="preview-media" controls src={previewUrl(file.path, "inline")} /> : null}
          {file.previewKind === "audio" ? <audio className="preview-audio" controls src={previewUrl(file.path, "inline")} /> : null}
          {file.previewKind === "pdf" ? <iframe className="preview-frame" src={previewUrl(file.path, "inline")} title={file.name} /> : null}
          {file.previewKind === "text" ? (
            <div className="preview-text">
              {textLoading ? <p>Loading text preview...</p> : null}
              {textError ? <div className="error-banner">{textError}</div> : null}
              {!textLoading && !textError ? <pre>{textContent}</pre> : null}
            </div>
          ) : null}
          {!file.previewKind ? (
            <div className="empty-state">
              <h3>No inline preview</h3>
              <p>This file type is not previewable in the browser. Download it instead.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function App() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("files");
  const [listing, setListing] = useState<DirectoryListing | null>(null);
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [selected, setSelected] = useState<FileItem | null>(null);
  const [previewing, setPreviewing] = useState<FileItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [uploads, setUploads] = useState<UploadItem[]>([]);

  const csrfToken = session?.csrfToken ?? "";
  const sortedItems = listing ? sortItems(listing.items, sortField, sortDirection) : [];

  const refreshFiles = useEffectEvent(async (pathValue: string, options: RefreshOptions = {}) => {
    const scrollPosition = captureWindowScroll(options.preserveScroll);

    if (!options.quiet) {
      setLoading(true);
    }

    try {
      const nextListing = await listFiles(pathValue);
      startTransition(() => {
        setListing(nextListing);
        setCurrentPath(nextListing.path);
        setSelected((currentSelected) =>
          currentSelected ? nextListing.items.find((item) => item.path === currentSelected.path) ?? null : null
        );
      });
      restoreWindowScroll(scrollPosition);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load files.");
    } finally {
      if (!options.quiet) {
        setLoading(false);
      }
    }
  });

  const refreshTrash = useEffectEvent(async (options: RefreshOptions = {}) => {
    const scrollPosition = captureWindowScroll(options.preserveScroll);

    if (!options.quiet) {
      setLoading(true);
    }

    try {
      const nextTrash = await listTrash();
      startTransition(() => {
        setTrashItems(nextTrash.items);
      });
      restoreWindowScroll(scrollPosition);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load trash.");
    } finally {
      if (!options.quiet) {
        setLoading(false);
      }
    }
  });

  useEffect(() => {
    let cancelled = false;
    setAuthBusy(true);
    getSession()
      .then((nextSession) => {
        if (!cancelled) {
          setSession(nextSession);
          setError(null);
        }
      })
      .catch((nextError: Error) => {
        if (!cancelled) {
          setError(nextError.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAuthBusy(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!session?.authenticated) {
      return;
    }

    if (view === "files") {
      void refreshFiles(currentPath);
      return;
    }

    void refreshTrash();
  }, [currentPath, session?.authenticated, view]);

  useEffect(() => {
    if (!session?.authenticated) {
      return;
    }

    const interval = window.setInterval(() => {
      if (view === "files") {
        void refreshFiles(currentPath, { preserveScroll: true, quiet: true });
      } else {
        void refreshTrash({ preserveScroll: true, quiet: true });
      }
    }, session.pollIntervalMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [currentPath, session?.authenticated, session?.pollIntervalMs, view]);

  async function handleLogin(username: string, password: string) {
    setAuthBusy(true);

    try {
      const nextSession = await login(username, password);
      setSession(nextSession);
      setView("files");
      setCurrentPath("");
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Login failed.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    if (!csrfToken) {
      return;
    }

    try {
      await logout(csrfToken);
    } finally {
      setSession({ authenticated: false, pollIntervalMs: session?.pollIntervalMs ?? 10000 });
      setListing(null);
      setTrashItems([]);
      setSelected(null);
      setPreviewing(null);
    }
  }

  async function runMutation(operation: () => Promise<void>) {
    try {
      setLoading(true);
      await operation();
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Action failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateFolder() {
    if (!csrfToken) {
      return;
    }

    const name = window.prompt("New folder name");

    if (!name) {
      return;
    }

    await runMutation(async () => {
      await createFolder(currentPath, name, csrfToken);
      await refreshFiles(currentPath, { preserveScroll: true });
    });
  }

  async function handleRename(item: FileItem) {
    if (!csrfToken) {
      return;
    }

    const name = window.prompt("Rename item", item.name);

    if (!name || name === item.name) {
      return;
    }

    await runMutation(async () => {
      await renameFile(item.path, name, csrfToken);
      await refreshFiles(currentPath, { preserveScroll: true });
    });
  }

  async function handleMove(item: FileItem) {
    if (!csrfToken) {
      return;
    }

    const destinationPath = window.prompt("Move to folder path", listing?.path ?? "");

    if (destinationPath == null) {
      return;
    }

    await runMutation(async () => {
      await moveFile(item.path, destinationPath, csrfToken);
      await refreshFiles(currentPath, { preserveScroll: true });
    });
  }

  async function handleDelete(item: FileItem) {
    if (!csrfToken) {
      return;
    }

    if (!window.confirm(`Move "${item.name}" to trash?`)) {
      return;
    }

    await runMutation(async () => {
      await deleteFile(item.path, csrfToken);
      setPreviewing((currentPreview) => (currentPreview?.path === item.path ? null : currentPreview));
      await refreshFiles(currentPath, { preserveScroll: true });
    });
  }

  async function handleUpload(fileList: FileList | null) {
    if (!fileList || !csrfToken) {
      return;
    }

    const files = Array.from(fileList);
    const uploadId = crypto.randomUUID();
    setUploads((current) => current.concat({ id: uploadId, names: files.map((file) => file.name), progress: 0, status: "uploading" }));

    try {
      await uploadFiles(currentPath, files, csrfToken, (ratio) => {
        setUploads((current) =>
          current.map((item) => (item.id === uploadId ? { ...item, progress: ratio, status: "uploading" } : item))
        );
      });
      setUploads((current) =>
        current.map((item) => (item.id === uploadId ? { ...item, progress: 1, status: "done" } : item))
      );
      await refreshFiles(currentPath, { preserveScroll: true });
    } catch (nextError) {
      setUploads((current) =>
        current.map((item) =>
          item.id === uploadId
            ? {
                ...item,
                status: "error",
                error: nextError instanceof Error ? nextError.message : "Upload failed."
              }
            : item
        )
      );
      setError(nextError instanceof Error ? nextError.message : "Upload failed.");
    }
  }

  async function handleRestore(item: TrashItem) {
    if (!csrfToken) {
      return;
    }

    await runMutation(async () => {
      await restoreTrash(item.id, csrfToken);
      await refreshTrash({ preserveScroll: true });
    });
  }

  async function handlePurge(item: TrashItem) {
    if (!csrfToken) {
      return;
    }

    if (!window.confirm(`Delete "${item.itemName}" permanently?`)) {
      return;
    }

    await runMutation(async () => {
      await deleteTrash(item.id, csrfToken);
      await refreshTrash({ preserveScroll: true });
    });
  }

  if (!session?.authenticated) {
    return <LoginScreen busy={authBusy} error={error} onSubmit={handleLogin} />;
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="eyebrow">Signed in as</div>
          <h2>{session.username}</h2>
          <p className="sidebar-copy">One private admin account, browser-native previews, and a safety net trash layer.</p>
        </div>
        <div className="sidebar-actions">
          <button className={view === "files" ? "nav-button active" : "nav-button"} onClick={() => setView("files")} type="button">
            Files
          </button>
          <button className={view === "trash" ? "nav-button active" : "nav-button"} onClick={() => setView("trash")} type="button">
            Trash
          </button>
          <button
            className="nav-button"
            onClick={() => (view === "files" ? refreshFiles(currentPath, { preserveScroll: true }) : refreshTrash({ preserveScroll: true }))}
            type="button"
          >
            Refresh
          </button>
          <button className="nav-button" onClick={handleLogout} type="button">
            Log out
          </button>
        </div>
        <div className="upload-stack">
          {uploads.map((upload) => (
            <div className="upload-card" key={upload.id}>
              <div className="upload-title">{upload.names.join(", ")}</div>
              <div className="progress-track">
                <span style={{ width: `${Math.round(upload.progress * 100)}%` }} />
              </div>
              <div className="upload-meta">
                <span>{Math.round(upload.progress * 100)}%</span>
                <span>{upload.status}</span>
              </div>
              {upload.error ? <div className="error-inline">{upload.error}</div> : null}
            </div>
          ))}
        </div>
      </aside>
      <section className="workspace">
        <header className="workspace-header">
          <div>
            <div className="eyebrow">{view === "files" ? "Explorer" : "Trash"}</div>
            <h1>{view === "files" ? "File browser" : "Deleted items"}</h1>
          </div>
          {view === "files" ? (
            <div className="toolbar">
              <button className="ghost-button" onClick={handleCreateFolder} type="button">
                New folder
              </button>
              <label className="primary-button" htmlFor="upload-input">
                Upload files
              </label>
              <input
                id="upload-input"
                multiple
                onChange={(event) => {
                  void handleUpload(event.target.files);
                  event.currentTarget.value = "";
                }}
                type="file"
              />
            </div>
          ) : null}
        </header>

        {error ? <div className="error-banner">{error}</div> : null}

        {view === "files" ? (
          <>
            <div className="breadcrumb-row">
              <div className="breadcrumbs">
                {breadcrumbs(listing?.path ?? currentPath).map((crumb) => (
                  <button key={crumb.path || "root"} onClick={() => setCurrentPath(crumb.path)} type="button">
                    {crumb.label}
                  </button>
                ))}
              </div>
              <div className="sort-controls">
                <select aria-label="Sort field" onChange={(event) => setSortField(event.target.value as SortField)} value={sortField}>
                  <option value="name">Name</option>
                  <option value="size">Size</option>
                  <option value="modifiedAt">Modified</option>
                </select>
                <button
                  className="ghost-button"
                  onClick={() => setSortDirection((current) => (current === "asc" ? "desc" : "asc"))}
                  type="button"
                >
                  {sortDirection === "asc" ? "Ascending" : "Descending"}
                </button>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <span>Name</span>
                <span>Modified</span>
                <span>Size</span>
                <span>Actions</span>
              </div>
              {loading && !listing ? <div className="empty-state">Loading files...</div> : null}
              {!loading && listing && sortedItems.length === 0 ? (
                <div className="empty-state">
                  <h3>This folder is empty.</h3>
                  <p>Upload files or create a new folder to start using the drive.</p>
                </div>
              ) : null}
              {sortedItems.map((item) => (
                <div
                  className={selected?.path === item.path ? "file-row selected" : "file-row"}
                  key={item.path}
                  onClick={() => setSelected(item)}
                  onDoubleClick={() => {
                    if (item.type === "directory") {
                      setCurrentPath(item.path);
                      return;
                    }

                    setPreviewing(item);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="file-main">
                    <div className="file-thumb">
                      {item.thumbnailAvailable ? <img alt="" src={previewUrl(item.path, "thumb")} /> : <span>{item.type === "directory" ? "DIR" : previewLabel(item.previewKind)}</span>}
                    </div>
                    <div>
                      <strong>{item.name}</strong>
                      <div className="file-hint">{item.type === "directory" ? "Folder" : item.mimeType ?? "Binary file"}</div>
                    </div>
                  </div>
                  <span>{formatDate(item.modifiedAt)}</span>
                  <span>{item.type === "directory" ? "—" : formatBytes(item.size)}</span>
                  <div className="row-actions">
                    {item.type === "directory" ? (
                      <button className="ghost-button" onClick={() => setCurrentPath(item.path)} type="button">
                        Open
                      </button>
                    ) : (
                      <button className="ghost-button" onClick={() => setPreviewing(item)} type="button">
                        Preview
                      </button>
                    )}
                    {item.type === "file" ? (
                      <a className="ghost-button" href={downloadUrl(item.path)}>
                        Download
                      </a>
                    ) : null}
                    <button className="ghost-button" onClick={() => void handleRename(item)} type="button">
                      Rename
                    </button>
                    <button className="ghost-button" onClick={() => void handleMove(item)} type="button">
                      Move
                    </button>
                    <button className="danger-button" onClick={() => void handleDelete(item)} type="button">
                      Trash
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="panel">
            <div className="panel-header trash">
              <span>Name</span>
              <span>Original path</span>
              <span>Deleted</span>
              <span>Actions</span>
            </div>
            {loading && trashItems.length === 0 ? <div className="empty-state">Loading trash...</div> : null}
            {!loading && trashItems.length === 0 ? (
              <div className="empty-state">
                <h3>Trash is clear.</h3>
                <p>Deleted items will stay here until you restore or permanently remove them.</p>
              </div>
            ) : null}
            {trashItems.map((item) => (
              <div className="file-row" key={item.id}>
                <div className="file-main">
                  <div className="file-thumb">
                    <span>{item.itemKind === "directory" ? "DIR" : "TR"}</span>
                  </div>
                  <div>
                    <strong>{item.itemName}</strong>
                    <div className="file-hint">{formatBytes(item.sizeBytes)}</div>
                  </div>
                </div>
                <span className="path-chip">{item.originalPath}</span>
                <span>{formatDate(item.deletedAt)}</span>
                <div className="row-actions">
                  <button className="ghost-button" onClick={() => void handleRestore(item)} type="button">
                    Restore
                  </button>
                  <button className="danger-button" onClick={() => void handlePurge(item)} type="button">
                    Delete forever
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <PreviewModal file={previewing} onClose={() => setPreviewing(null)} />
    </main>
  );
}

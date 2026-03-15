import { selectUploads } from '../../../app/store/selectors';
import { useAppStore } from '../../../app/store/useAppStore';

export function UploadQueue() {
  const uploads = useAppStore(selectUploads);

  return (
    <div className="grid gap-2.5">
      {uploads.map((upload) => (
        <div className="rounded-[18px] bg-white/8 p-3.5" key={upload.id}>
          <div className="text-[0.96rem] text-sidebar-text">{upload.names.join(', ')}</div>
          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-track">
            <span
              className="block h-full rounded-full bg-[linear-gradient(90deg,var(--color-accent-soft),#ffd7a6)]"
              style={{ width: `${Math.round(upload.progress * 100)}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 font-mono text-xs text-sidebar-copy">
            <span>{Math.round(upload.progress * 100)}%</span>
            <span>{upload.status}</span>
          </div>
          {upload.error ? (
            <div className="mt-2 rounded-[14px] bg-danger-wash px-3.5 py-3 text-[0.92rem] text-danger-soft">
              {upload.error}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

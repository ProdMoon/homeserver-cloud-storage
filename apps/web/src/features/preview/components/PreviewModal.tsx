import { previewUrl } from '../../../shared/api/files';
import { previewLabel } from '../../../shared/lib/formatters';
import { Button } from '../../../shared/ui/Button';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ErrorBanner } from '../../../shared/ui/ErrorBanner';
import {
  selectClosePreview,
  selectPreviewing,
  selectTextPreviewContent,
  selectTextPreviewError,
  selectTextPreviewLoading,
} from '../../../app/store/selectors';
import { useAppStore } from '../../../app/store/useAppStore';

export function PreviewModal() {
  const file = useAppStore(selectPreviewing);
  const closePreview = useAppStore(selectClosePreview);
  const textPreviewContent = useAppStore(selectTextPreviewContent);
  const textPreviewError = useAppStore(selectTextPreviewError);
  const textPreviewLoading = useAppStore(selectTextPreviewLoading);

  if (!file) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-overlay p-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[calc(100vh-48px)] w-full max-w-6xl overflow-hidden rounded-[22px] bg-preview-surface shadow-cloud backdrop-blur-xl sm:rounded-[28px]">
        <div className="flex flex-col gap-3 border-b border-line px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-mono text-[0.72rem] tracking-[0.16em] text-accent uppercase">
              {previewLabel(file.previewKind)}
            </div>
            <h2 className="mt-3 text-[clamp(2rem,4vw,2.2rem)] leading-[1.05] tracking-[-0.04em]">
              {file.name}
            </h2>
          </div>
          <Button onClick={() => closePreview()} type="button">
            Close
          </Button>
        </div>
        <div className="max-h-[calc(100vh-220px)] overflow-auto p-6">
          {file.previewKind === 'image' ? (
            <img
              alt={file.name}
              className="min-h-70 w-full rounded-[22px] bg-black/5 object-contain md:min-h-130"
              src={previewUrl(file.path, 'inline')}
            />
          ) : null}
          {file.previewKind === 'video' ? (
            <video
              className="min-h-70 w-full rounded-[22px] bg-black/5 md:min-h-130"
              controls
              src={previewUrl(file.path, 'inline')}
            />
          ) : null}
          {file.previewKind === 'audio' ? (
            <audio className="w-full" controls src={previewUrl(file.path, 'inline')} />
          ) : null}
          {file.previewKind === 'pdf' ? (
            <iframe
              className="min-h-70 w-full rounded-[22px] border-0 bg-black/5 md:min-h-130"
              src={previewUrl(file.path, 'inline')}
              title={file.name}
            />
          ) : null}
          {file.previewKind === 'text' ? (
            <div className="rounded-[22px] bg-code-surface p-6 text-code-text">
              {textPreviewLoading ? <p>Loading text preview...</p> : null}
              {textPreviewError ? <ErrorBanner message={textPreviewError} /> : null}
              {!textPreviewLoading && !textPreviewError ? (
                <pre className="m-0 font-mono wrap-break-word whitespace-pre-wrap">
                  {textPreviewContent}
                </pre>
              ) : null}
            </div>
          ) : null}
          {!file.previewKind ? (
            <EmptyState
              description="This file type is not previewable in the browser. Download it instead."
              title="No inline preview"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

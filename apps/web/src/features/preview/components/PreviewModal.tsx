import { previewUrl } from "../../../shared/api/files";
import { previewLabel } from "../../../shared/lib/formatters";
import { Button } from "../../../shared/ui/Button";
import { EmptyState } from "../../../shared/ui/EmptyState";
import { ErrorBanner } from "../../../shared/ui/ErrorBanner";
import {
  selectClosePreview,
  selectPreviewing,
  selectTextPreviewContent,
  selectTextPreviewError,
  selectTextPreviewLoading
} from "../../../app/store/selectors";
import { useAppStore } from "../../../app/store/useAppStore";
import styles from "./PreviewModal.module.css";

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
    <div className={styles.scrim} role="dialog" aria-modal="true">
      <div className={styles.panel}>
        <div className={styles.header}>
          <div>
            <div className={styles.eyebrow}>{previewLabel(file.previewKind)}</div>
            <h2>{file.name}</h2>
          </div>
          <Button onClick={() => closePreview()} type="button">
            Close
          </Button>
        </div>
        <div className={styles.body}>
          {file.previewKind === "image" ? <img alt={file.name} className={styles.image} src={previewUrl(file.path, "inline")} /> : null}
          {file.previewKind === "video" ? <video className={styles.media} controls src={previewUrl(file.path, "inline")} /> : null}
          {file.previewKind === "audio" ? <audio className={styles.audio} controls src={previewUrl(file.path, "inline")} /> : null}
          {file.previewKind === "pdf" ? <iframe className={styles.frame} src={previewUrl(file.path, "inline")} title={file.name} /> : null}
          {file.previewKind === "text" ? (
            <div className={styles.text}>
              {textPreviewLoading ? <p>Loading text preview...</p> : null}
              {textPreviewError ? <ErrorBanner message={textPreviewError} /> : null}
              {!textPreviewLoading && !textPreviewError ? <pre>{textPreviewContent}</pre> : null}
            </div>
          ) : null}
          {!file.previewKind ? (
            <EmptyState description="This file type is not previewable in the browser. Download it instead." title="No inline preview" />
          ) : null}
        </div>
      </div>
    </div>
  );
}


import { selectUploads } from "../../../app/store/selectors";
import { useAppStore } from "../../../app/store/useAppStore";
import styles from "./UploadQueue.module.css";

export function UploadQueue() {
  const uploads = useAppStore(selectUploads);

  return (
    <div className={styles.stack}>
      {uploads.map((upload) => (
        <div className={styles.card} key={upload.id}>
          <div className={styles.title}>{upload.names.join(", ")}</div>
          <div className={styles.track}>
            <span style={{ width: `${Math.round(upload.progress * 100)}%` }} />
          </div>
          <div className={styles.meta}>
            <span>{Math.round(upload.progress * 100)}%</span>
            <span>{upload.status}</span>
          </div>
          {upload.error ? <div className={styles.error}>{upload.error}</div> : null}
        </div>
      ))}
    </div>
  );
}


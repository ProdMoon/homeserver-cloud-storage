import { selectCreateFolder, selectCurrentPath, selectEnqueueUpload } from "../../../app/store/selectors";
import { useAppStore } from "../../../app/store/useAppStore";
import { Button } from "../../../shared/ui/Button";
import styles from "./ExplorerToolbar.module.css";

export function ExplorerToolbar() {
  const currentPath = useAppStore(selectCurrentPath);
  const createFolder = useAppStore(selectCreateFolder);
  const enqueueUpload = useAppStore(selectEnqueueUpload);

  async function handleCreateFolder() {
    const name = window.prompt("New folder name");

    if (!name) {
      return;
    }

    await createFolder(name);
  }

  return (
    <div className={styles.toolbar}>
      <Button onClick={() => void handleCreateFolder()} type="button">
        New folder
      </Button>
      <label className={styles.uploadLabel} htmlFor="upload-input">
        Upload files
      </label>
      <input
        id="upload-input"
        key={currentPath}
        multiple
        onChange={(event) => {
          void enqueueUpload(event.target.files ?? []);
          event.currentTarget.value = "";
        }}
        type="file"
      />
    </div>
  );
}


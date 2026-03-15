import { selectCreateFolder, selectCurrentPath, selectEnqueueUpload } from "../../../app/store/selectors";
import { useAppStore } from "../../../app/store/useAppStore";
import { Button, buttonVariants } from "../../../shared/ui/Button";

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
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button onClick={() => void handleCreateFolder()} type="button">
        New folder
      </Button>
      <label className={buttonVariants({ variant: "primary" })} htmlFor="upload-input">
        Upload files
      </label>
      <input
        className="hidden"
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

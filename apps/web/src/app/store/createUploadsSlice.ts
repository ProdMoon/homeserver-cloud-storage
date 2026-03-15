import { uploadFiles } from "../../shared/api/files";
import type { StoreSlice, UploadsSlice } from "./types";

function requireCsrfToken(token: string | undefined): string {
  if (!token) {
    throw new Error("You need to sign in again.");
  }

  return token;
}

export const createUploadsSlice: StoreSlice<UploadsSlice> = (set, get) => ({
  uploads: [],
  enqueueUpload: async (files) => {
    const uploadFilesList = Array.from(files);

    if (uploadFilesList.length === 0) {
      return;
    }

    const uploadId = crypto.randomUUID();
    const { currentPath, refreshFiles, session } = get();

    set((state) => ({
      uploads: state.uploads.concat({
        id: uploadId,
        names: uploadFilesList.map((file) => file.name),
        progress: 0,
        status: "uploading"
      })
    }));

    try {
      await uploadFiles(currentPath, uploadFilesList, requireCsrfToken(session?.csrfToken), (progress) => {
        set((state) => ({
          uploads: state.uploads.map((item) =>
            item.id === uploadId
              ? {
                  ...item,
                  progress,
                  status: "uploading"
                }
              : item
          )
        }));
      });

      set((state) => ({
        uploads: state.uploads.map((item) =>
          item.id === uploadId
            ? {
                ...item,
                progress: 1,
                status: "done"
              }
            : item
        ),
        error: null
      }));
      await refreshFiles(currentPath, { preserveScroll: true });
    } catch (error) {
      set((state) => ({
        uploads: state.uploads.map((item) =>
          item.id === uploadId
            ? {
                ...item,
                status: "error",
                error: error instanceof Error ? error.message : "Upload failed."
              }
            : item
        ),
        error: error instanceof Error ? error.message : "Upload failed."
      }));
    }
  }
});


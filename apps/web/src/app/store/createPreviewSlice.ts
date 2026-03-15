import { fetchTextPreview } from "../../shared/api/files";
import type { PreviewSlice, StoreSlice } from "./types";

export const createPreviewSlice: StoreSlice<PreviewSlice> = (set, get) => ({
  previewing: null,
  textPreviewContent: "",
  textPreviewError: null,
  textPreviewLoading: false,
  previewRequestId: 0,
  openPreview: (previewing) => {
    const nextRequestId = get().previewRequestId + 1;

    set({
      previewing,
      textPreviewContent: "",
      textPreviewError: null,
      textPreviewLoading: previewing.previewKind === "text",
      previewRequestId: nextRequestId
    });

    if (previewing.previewKind === "text") {
      void get().loadTextPreview(previewing.path);
    }
  },
  closePreview: () =>
    set((state) => ({
      previewing: null,
      textPreviewContent: "",
      textPreviewError: null,
      textPreviewLoading: false,
      previewRequestId: state.previewRequestId + 1
    })),
  loadTextPreview: async (path) => {
    const requestId = get().previewRequestId;

    try {
      const textPreviewContent = await fetchTextPreview(path);

      if (get().previewRequestId !== requestId || get().previewing?.path !== path) {
        return;
      }

      set({
        textPreviewContent,
        textPreviewError: null,
        textPreviewLoading: false
      });
    } catch (error) {
      if (get().previewRequestId !== requestId || get().previewing?.path !== path) {
        return;
      }

      set({
        textPreviewError: error instanceof Error ? error.message : "Failed to load preview.",
        textPreviewLoading: false
      });
    }
  }
});


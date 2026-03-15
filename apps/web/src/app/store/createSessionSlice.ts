import { getSession as getSessionRequest, login as loginRequest, logout as logoutRequest } from "../../shared/api/session";
import type { SessionSlice, StoreSlice } from "./types";

const DEFAULT_POLL_INTERVAL_MS = 10_000;

export const createSessionSlice: StoreSlice<SessionSlice> = (set, get) => ({
  session: null,
  authBusy: false,
  bootstrapSession: async () => {
    set({ authBusy: true });

    try {
      const session = await getSessionRequest();
      set({ session, error: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to load session."
      });
    } finally {
      set({ authBusy: false });
    }
  },
  login: async (username, password) => {
    set({ authBusy: true });

    try {
      const session = await loginRequest(username, password);
      set({
        session,
        activeView: "files",
        currentPath: "",
        error: null
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Login failed."
      });
    } finally {
      set({ authBusy: false });
    }
  },
  logout: async () => {
    const session = get().session;

    try {
      if (session?.authenticated && session.csrfToken) {
        await logoutRequest(session.csrfToken);
      }
    } finally {
      set({
        session: {
          authenticated: false,
          pollIntervalMs: session?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS
        },
        activeView: "files",
        error: null,
        currentPath: "",
        listing: null,
        selectedPath: null,
        trashItems: [],
        previewing: null,
        textPreviewContent: "",
        textPreviewError: null,
        textPreviewLoading: false,
        uploads: []
      });
    }
  }
});


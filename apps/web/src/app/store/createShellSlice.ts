import type { ShellSlice, StoreSlice } from "./types";

export const createShellSlice: StoreSlice<ShellSlice> = (set) => ({
  activeView: "files",
  error: null,
  setActiveView: (activeView) => set({ activeView }),
  setError: (error) => set({ error })
});


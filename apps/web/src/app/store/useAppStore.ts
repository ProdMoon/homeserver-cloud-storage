import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import type { StateCreator } from "zustand/vanilla";
import { createExplorerSlice } from "./createExplorerSlice";
import { createPreviewSlice } from "./createPreviewSlice";
import { createSessionSlice } from "./createSessionSlice";
import { createShellSlice } from "./createShellSlice";
import { createTrashSlice } from "./createTrashSlice";
import { createUploadsSlice } from "./createUploadsSlice";
import type { AppStore } from "./types";

const storeInitializer: StateCreator<AppStore, [], [], AppStore> = (...args) => ({
  ...createShellSlice(...args),
  ...createSessionSlice(...args),
  ...createExplorerSlice(...args),
  ...createTrashSlice(...args),
  ...createPreviewSlice(...args),
  ...createUploadsSlice(...args)
});

export function createAppStore() {
  return createStore<AppStore>(storeInitializer);
}

export const appStore = createAppStore();
const initialState = appStore.getState();

export function useAppStore<T>(selector: (state: AppStore) => T) {
  return useStore(appStore, selector);
}

export function resetAppStore() {
  appStore.setState(initialState, true);
}

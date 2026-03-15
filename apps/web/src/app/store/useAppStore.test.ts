import { createAppStore } from "./useAppStore";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("bootstraps session state from the session endpoint", async () => {
  const store = createAppStore();

  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({ authenticated: true, username: "admin", csrfToken: "csrf", pollIntervalMs: 10000 }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  );

  await store.getState().bootstrapSession();

  expect(store.getState().session).toEqual({
    authenticated: true,
    username: "admin",
    csrfToken: "csrf",
    pollIntervalMs: 10000
  });
});

test("keeps selected file when refreshed listing still contains it", async () => {
  const store = createAppStore();

  store.setState({
    session: {
      authenticated: true,
      username: "admin",
      csrfToken: "csrf",
      pollIntervalMs: 10000
    },
    selectedPath: "Photos",
    currentPath: ""
  });

  fetchMock.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        path: "",
        parentPath: null,
        items: [
          {
            name: "Photos",
            path: "Photos",
            type: "directory",
            size: 0,
            modifiedAt: new Date("2026-01-01T10:00:00.000Z").toISOString(),
            mimeType: null,
            previewKind: null,
            thumbnailAvailable: false
          }
        ]
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    )
  );

  await store.getState().refreshFiles("");

  expect(store.getState().selectedPath).toBe("Photos");
});

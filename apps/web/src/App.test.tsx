import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";

const fetchMock = vi.fn();
const scrollToMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  scrollToMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("crypto", {
    randomUUID: () => "upload-id"
  });
  vi.stubGlobal("scrollTo", scrollToMock);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  Object.defineProperty(window, "scrollX", { value: 0, writable: true, configurable: true });
  Object.defineProperty(window, "scrollY", { value: 420, writable: true, configurable: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("renders login screen before authentication", async () => {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({ authenticated: false, pollIntervalMs: 10000 }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  );

  render(<App />);

  expect(await screen.findByRole("heading", { name: /private storage/i })).toBeInTheDocument();
});

test("loads file explorer after login", async () => {
  fetchMock
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ authenticated: false, pollIntervalMs: 10000 }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ authenticated: true, username: "admin", csrfToken: "csrf", pollIntervalMs: 10000 }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    )
    .mockResolvedValueOnce(
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

  render(<App />);

  await userEvent.type(screen.getByLabelText(/password/i), "secret");
  await userEvent.click(screen.getByRole("button", { name: /enter drive/i }));

  expect(await screen.findByRole("heading", { name: /file browser/i })).toBeInTheDocument();
  expect(await screen.findByText("Photos")).toBeInTheDocument();

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/login", expect.any(Object));
  });
});

test("preserves scroll position on manual refresh", async () => {
  fetchMock
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ authenticated: true, username: "admin", csrfToken: "csrf", pollIntervalMs: 10000 }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    )
    .mockResolvedValueOnce(
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
    )
    .mockResolvedValueOnce(
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

  render(<App />);

  expect(await screen.findByText("Photos")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /refresh/i }));

  await waitFor(() => {
    expect(scrollToMock).toHaveBeenCalledWith(0, 420);
  });
});

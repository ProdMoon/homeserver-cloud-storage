import { listFiles } from "./shared/api/files";
import { getSession } from "./shared/api/session";
import { listTrash } from "./shared/api/trash";


const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("deduplicates concurrent GET requests for the same endpoint", async () => {
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ authenticated: false, pollIntervalMs: 10000 }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  );

  const [left, right] = await Promise.all([getSession(), getSession()]);

  expect(left).toEqual(right);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("does not deduplicate different GET endpoints", async () => {
  fetchMock
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ path: "", parentPath: null, items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

  await Promise.all([listFiles(""), listTrash()]);

  expect(fetchMock).toHaveBeenCalledTimes(2);
});

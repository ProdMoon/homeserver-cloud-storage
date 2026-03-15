import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './app/App';
import { appStore, resetAppStore } from './app/store/useAppStore';

const fetchMock = vi.fn();
const scrollToMock = vi.fn();

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fileListingResponse() {
  return jsonResponse({
    path: '',
    parentPath: null,
    items: [
      {
        name: 'Photos',
        path: 'Photos',
        type: 'directory',
        size: 0,
        modifiedAt: new Date('2026-01-01T10:00:00.000Z').toISOString(),
        mimeType: null,
        previewKind: null,
        thumbnailAvailable: false,
      },
    ],
  });
}

beforeEach(() => {
  resetAppStore();
  fetchMock.mockReset();
  scrollToMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('crypto', {
    randomUUID: () => 'upload-id',
  });
  vi.stubGlobal('scrollTo', scrollToMock);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  Object.defineProperty(window, 'scrollX', {
    value: 0,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(window, 'scrollY', {
    value: 420,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test('renders login screen before authentication', async () => {
  fetchMock.mockResolvedValueOnce(jsonResponse({ authenticated: false, pollIntervalMs: 10000 }));

  render(<App />);

  expect(await screen.findByRole('heading', { name: /private storage/i })).toBeInTheDocument();
});

test('loads file explorer after login', async () => {
  fetchMock
    .mockResolvedValueOnce(jsonResponse({ authenticated: false, pollIntervalMs: 10000 }))
    .mockResolvedValueOnce(
      jsonResponse({
        authenticated: true,
        username: 'admin',
        csrfToken: 'csrf',
        pollIntervalMs: 10000,
      })
    )
    .mockResolvedValueOnce(fileListingResponse());

  render(<App />);

  await userEvent.type(screen.getByLabelText(/password/i), 'secret');
  await userEvent.click(screen.getByRole('button', { name: /enter drive/i }));

  expect(await screen.findByRole('heading', { name: /file browser/i })).toBeInTheDocument();
  expect(await screen.findByText('Photos')).toBeInTheDocument();
  const sidebar = screen.getByRole('complementary');
  expect(within(sidebar).getByRole('button', { name: 'Files' })).toBeInTheDocument();
  expect(within(sidebar).getByRole('button', { name: 'Trash' })).toBeInTheDocument();
  expect(within(sidebar).getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  expect(within(sidebar).getByRole('button', { name: 'Log out' })).toBeInTheDocument();

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', expect.any(Object));
  });
});

test('does not render an empty upload queue when there are no uploads', async () => {
  fetchMock
    .mockResolvedValueOnce(
      jsonResponse({
        authenticated: true,
        username: 'admin',
        csrfToken: 'csrf',
        pollIntervalMs: 10000,
      })
    )
    .mockResolvedValueOnce(fileListingResponse());

  render(<App />);

  expect(await screen.findByText('Photos')).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: /upload queue/i })).not.toBeInTheDocument();

  await act(async () => {
    appStore.setState({
      uploads: [
        {
          id: 'upload-id',
          names: ['Photos.zip'],
          progress: 0.5,
          status: 'uploading',
        },
      ],
    });
  });

  expect(await screen.findByRole('region', { name: /upload queue/i })).toBeInTheDocument();
});

test('preserves scroll position on manual refresh', async () => {
  fetchMock
    .mockResolvedValueOnce(
      jsonResponse({
        authenticated: true,
        username: 'admin',
        csrfToken: 'csrf',
        pollIntervalMs: 10000,
      })
    )
    .mockResolvedValueOnce(fileListingResponse())
    .mockResolvedValueOnce(fileListingResponse());

  render(<App />);

  expect(await screen.findByText('Photos')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /refresh/i }));

  await waitFor(() => {
    expect(scrollToMock).toHaveBeenCalledWith(0, 420);
  });
});

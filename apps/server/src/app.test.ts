import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createApp } from './app.js';

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wb8PXQAAAAASUVORK5CYII=',
  'base64'
);

function multipartPayload(filename: string, contents: Buffer | string, contentType: string) {
  const boundary = '----pi-home-drive-test-boundary';
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`
    ),
    Buffer.isBuffer(contents) ? contents : Buffer.from(contents),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  return {
    boundary,
    body,
  };
}

async function bootApp() {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'pi-home-drive-root-'));
  const tempData = await mkdtemp(path.join(os.tmpdir(), 'pi-home-drive-data-'));
  const app = await createApp({
    config: {
      adminUsername: 'admin',
      adminPassword: 'super-secret-password',
      dataDir: tempData,
      nodeEnv: 'test',
      pollIntervalMs: 5000,
      rootDir: tempRoot,
      sessionSecret: '01234567890123456789012345678901',
      trustProxy: false,
      webDistDir: path.join(tempRoot, 'missing-web-dist'),
    },
  });

  return {
    app,
    tempRoot,
    tempData,
  };
}

async function login(app: Awaited<ReturnType<typeof createApp>>) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: {
      username: 'admin',
      password: 'super-secret-password',
    },
  });

  expect(response.statusCode).toBe(200);

  const payload = response.json() as { csrfToken: string };
  const cookie = response.cookies[0];

  if (!cookie) {
    throw new Error('Expected session cookie');
  }

  return {
    cookie: `${cookie.name}=${cookie.value}`,
    csrfToken: payload.csrfToken,
  };
}

test('authenticates, mutates files, and restores from trash', async () => {
  const { app, tempRoot, tempData } = await bootApp();

  try {
    const unauthorized = await app.inject({
      method: 'GET',
      url: '/api/files',
    });
    expect(unauthorized.statusCode).toBe(401);

    const { cookie, csrfToken } = await login(app);

    const createFolderResponse = await app.inject({
      method: 'POST',
      url: '/api/files/folder',
      headers: {
        cookie,
        'x-csrf-token': csrfToken,
      },
      payload: {
        path: '',
        name: 'Projects',
      },
    });
    expect(createFolderResponse.statusCode).toBe(200);

    const upload = multipartPayload('notes.txt', 'hello home drive', 'text/plain');
    const uploadResponse = await app.inject({
      method: 'POST',
      url: '/api/files/upload',
      headers: {
        cookie,
        'content-type': `multipart/form-data; boundary=${upload.boundary}`,
        'x-csrf-token': csrfToken,
      },
      payload: upload.body,
    });
    expect(uploadResponse.statusCode).toBe(200);

    const listRoot = await app.inject({
      method: 'GET',
      url: '/api/files',
      headers: {
        cookie,
      },
    });
    const rootPayload = listRoot.json() as { items: Array<{ name: string }> };
    expect(rootPayload.items.map((item) => item.name)).toEqual(['Projects', 'notes.txt']);

    const renameResponse = await app.inject({
      method: 'PATCH',
      url: '/api/files/rename',
      headers: {
        cookie,
        'x-csrf-token': csrfToken,
      },
      payload: {
        path: 'notes.txt',
        name: 'journal.txt',
      },
    });
    expect(renameResponse.statusCode).toBe(200);

    const moveResponse = await app.inject({
      method: 'PATCH',
      url: '/api/files/move',
      headers: {
        cookie,
        'x-csrf-token': csrfToken,
      },
      payload: {
        sourcePath: 'journal.txt',
        destinationPath: 'Projects',
      },
    });
    expect(moveResponse.statusCode).toBe(200);

    const projectListing = await app.inject({
      method: 'GET',
      url: '/api/files?path=Projects',
      headers: {
        cookie,
      },
    });
    const projectPayload = projectListing.json() as {
      items: Array<{ path: string }>;
    };
    expect(projectPayload.items[0]?.path).toBe('Projects/journal.txt');

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: '/api/files',
      headers: {
        cookie,
        'x-csrf-token': csrfToken,
      },
      payload: {
        path: 'Projects/journal.txt',
      },
    });
    expect(deleteResponse.statusCode).toBe(200);

    const trashResponse = await app.inject({
      method: 'GET',
      url: '/api/trash',
      headers: {
        cookie,
      },
    });
    const trashPayload = trashResponse.json() as {
      items: Array<{ id: string; originalPath: string }>;
    };
    expect(trashPayload.items[0]?.originalPath).toBe('Projects/journal.txt');

    const restoreResponse = await app.inject({
      method: 'POST',
      url: '/api/trash/restore',
      headers: {
        cookie,
        'x-csrf-token': csrfToken,
      },
      payload: {
        id: trashPayload.items[0]?.id,
      },
    });
    expect(restoreResponse.statusCode).toBe(200);

    const restoredListing = await app.inject({
      method: 'GET',
      url: '/api/files?path=Projects',
      headers: {
        cookie,
      },
    });
    const restoredPayload = restoredListing.json() as {
      items: Array<{ path: string }>;
    };
    expect(restoredPayload.items[0]?.path).toBe('Projects/journal.txt');
  } finally {
    await app.close();
    await rm(tempRoot, { recursive: true, force: true });
    await rm(tempData, { recursive: true, force: true });
  }
});

test('streams previews, supports ranges, and manages trash deletion', async () => {
  const { app, tempRoot, tempData } = await bootApp();

  try {
    await mkdir(path.join(tempRoot, 'media'), { recursive: true });
    await writeFile(path.join(tempRoot, 'readme.txt'), 'preview me please');
    await writeFile(path.join(tempRoot, 'media', 'tiny.png'), tinyPng);

    const { cookie, csrfToken } = await login(app);

    const textPreview = await app.inject({
      method: 'GET',
      url: '/api/previews?path=readme.txt&kind=inline',
      headers: {
        cookie,
      },
    });
    expect(textPreview.statusCode).toBe(200);
    expect(textPreview.body).toContain('preview me please');

    const thumbnail = await app.inject({
      method: 'GET',
      url: '/api/previews?path=media/tiny.png&kind=thumb',
      headers: {
        cookie,
      },
    });
    expect(thumbnail.statusCode).toBe(200);
    expect(thumbnail.headers['content-type']).toContain('image/');

    const rangedDownload = await app.inject({
      method: 'GET',
      url: '/api/files/download?path=readme.txt',
      headers: {
        cookie,
        range: 'bytes=0-6',
      },
    });
    expect(rangedDownload.statusCode).toBe(206);
    expect(rangedDownload.body).toBe('preview');

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: '/api/files',
      headers: {
        cookie,
        'x-csrf-token': csrfToken,
      },
      payload: {
        path: 'readme.txt',
      },
    });
    expect(deleteResponse.statusCode).toBe(200);

    const trashResponse = await app.inject({
      method: 'GET',
      url: '/api/trash',
      headers: {
        cookie,
      },
    });
    const trashPayload = trashResponse.json() as {
      items: Array<{ id: string }>;
    };

    const purgeResponse = await app.inject({
      method: 'DELETE',
      url: `/api/trash/${trashPayload.items[0]?.id}`,
      headers: {
        cookie,
        'x-csrf-token': csrfToken,
      },
    });
    expect(purgeResponse.statusCode).toBe(200);
  } finally {
    await app.close();
    await rm(tempRoot, { recursive: true, force: true });
    await rm(tempData, { recursive: true, force: true });
  }
});

test('serves concrete built assets and falls back to index for spa routes without duplicating static routes', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'pi-home-drive-root-'));
  const tempData = await mkdtemp(path.join(os.tmpdir(), 'pi-home-drive-data-'));
  const webDist = await mkdtemp(path.join(os.tmpdir(), 'pi-home-drive-web-'));

  try {
    await mkdir(path.join(webDist, 'assets'), { recursive: true });
    await writeFile(path.join(webDist, 'index.html'), '<html><body>spa-shell</body></html>');
    await writeFile(path.join(webDist, 'assets', 'app.js'), "console.log('ok');");

    const app = await createApp({
      config: {
        adminUsername: 'admin',
        adminPassword: 'super-secret-password',
        dataDir: tempData,
        nodeEnv: 'test',
        pollIntervalMs: 5000,
        rootDir: tempRoot,
        sessionSecret: '01234567890123456789012345678901',
        trustProxy: false,
        webDistDir: webDist,
      },
    });

    try {
      const spaResponse = await app.inject({
        method: 'GET',
        url: '/files/Projects',
      });
      expect(spaResponse.statusCode).toBe(200);
      expect(spaResponse.body).toContain('spa-shell');

      const assetResponse = await app.inject({
        method: 'GET',
        url: '/assets/app.js',
      });
      expect(assetResponse.statusCode).toBe(200);
      expect(assetResponse.body).toContain('console.log');

      const missingAssetResponse = await app.inject({
        method: 'GET',
        url: '/assets/missing.js',
      });
      expect(missingAssetResponse.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
    await rm(tempData, { recursive: true, force: true });
    await rm(webDist, { recursive: true, force: true });
  }
});

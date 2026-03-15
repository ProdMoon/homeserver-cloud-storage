import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { createWriteStream } from 'node:fs';
import { AppDatabase } from './db.js';
import { SESSION_COOKIE_NAME } from './auth.js';
import { loadConfig, type AppConfig } from './config.js';
import { HttpError } from './http-error.js';
import {
  createFolder,
  createThumbnail,
  listDirectory,
  moveEntry,
  moveToTrash,
  openFileReadStream,
  permanentlyDeleteTrashItem,
  readTextPreview,
  renameEntry,
  resolveEntry,
  restoreFromTrash,
} from './storage.js';
import { normalizeClientPath, validateEntryName } from './paths.js';

interface AppOptions {
  config?: Partial<AppConfig>;
}

function jsonBody(request: FastifyRequest): Record<string, unknown> {
  if (!request.body || typeof request.body !== 'object') {
    return {};
  }

  return request.body as Record<string, unknown>;
}

function stringValue(input: unknown, fieldName: string): string {
  if (typeof input !== 'string' || !input.trim()) {
    throw new HttpError(400, `${fieldName} is required.`);
  }

  return input.trim();
}

function optionalPath(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input;
}

function encodeFilename(name: string): string {
  return encodeURIComponent(name).replace(/['()]/g, escape).replace(/\*/g, '%2A');
}

function clearSessionCookie(reply: FastifyReply) {
  reply.clearCookie(SESSION_COOKIE_NAME, {
    path: '/',
  });
}

function requestPathname(request: FastifyRequest): string {
  const url = request.raw.url ?? request.url;
  return new URL(url, 'http://localhost').pathname;
}

function setSessionCookie(reply: FastifyReply, config: AppConfig, sessionId: string) {
  reply.setCookie(SESSION_COOKIE_NAME, sessionId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production' || config.trustProxy,
    maxAge: Math.floor(config.sessionTtlMs / 1000),
  });
}

function requireAuth(request: FastifyRequest) {
  if (!request.authSession) {
    throw new HttpError(401, 'Authentication required.');
  }

  return request.authSession;
}

function requireCsrf(request: FastifyRequest) {
  const session = requireAuth(request);
  const header = request.headers['x-csrf-token'];

  if (typeof header !== 'string' || header !== session.csrfToken) {
    throw new HttpError(403, 'CSRF token is missing or invalid.');
  }
}

function parseRange(
  rangeHeader: string | undefined,
  size: number
): { start: number; end: number } | null {
  if (!rangeHeader) {
    return null;
  }

  const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);

  if (!match) {
    throw new HttpError(416, 'Invalid range request.');
  }

  const [, startRaw, endRaw] = match;
  const start = startRaw ? Number.parseInt(startRaw, 10) : 0;
  const end = endRaw ? Number.parseInt(endRaw, 10) : size - 1;

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || end >= size) {
    throw new HttpError(416, 'Requested range is not satisfiable.');
  }

  return { start, end };
}

async function sendFileStream(
  request: FastifyRequest,
  reply: FastifyReply,
  entry: Awaited<ReturnType<typeof resolveEntry>>,
  disposition: 'inline' | 'attachment'
) {
  if (entry.type !== 'file') {
    throw new HttpError(400, 'Only files can be streamed.');
  }

  const size = typeof entry.stats.size === 'bigint' ? Number(entry.stats.size) : entry.stats.size;
  const range = parseRange(request.headers.range, size);
  const contentType = entry.mimeType ?? 'application/octet-stream';

  reply.header('Content-Type', contentType);
  reply.header('Accept-Ranges', 'bytes');
  reply.header(
    'Content-Disposition',
    `${disposition}; filename*=UTF-8''${encodeFilename(entry.name)}`
  );

  if (range) {
    const contentLength = range.end - range.start + 1;
    reply.code(206);
    reply.header('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
    reply.header('Content-Length', contentLength);
    return reply.send(openFileReadStream(entry.absolutePath, range.start, range.end));
  }

  reply.header('Content-Length', size);
  return reply.send(openFileReadStream(entry.absolutePath));
}

export async function createApp(options: AppOptions = {}) {
  const config = await loadConfig(options.config);
  const database = new AppDatabase(config.databasePath, config.sessionTtlMs);
  await database.init(config.dataDir);
  await database.ensureAdmin(config.adminUsername, config.adminPassword);

  const app = Fastify({
    logger: config.nodeEnv !== 'test',
    trustProxy: config.trustProxy,
  });

  await app.register(cookie);
  await app.register(rateLimit, {
    global: false,
  });
  await app.register(multipart, {
    limits: {
      files: 20,
      fileSize: 1024 * 1024 * 1024 * 8,
    },
  });

  app.decorateRequest('authSession', null);
  app.addHook('onRequest', async (request, reply) => {
    const sessionId = request.cookies[SESSION_COOKIE_NAME];
    request.authSession = null;

    if (!sessionId) {
      return;
    }

    const session = database.getSession(sessionId);

    if (!session) {
      clearSessionCookie(reply);
      return;
    }

    request.authSession = session;
    database.touchSession(session.id);
  });

  app.addHook('onClose', async () => {
    database.close();
  });

  app.get('/healthz', async () => ({
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
  }));

  app.get('/api/me', async (request) => {
    if (!request.authSession) {
      return {
        authenticated: false,
        pollIntervalMs: config.pollIntervalMs,
      };
    }

    return {
      authenticated: true,
      username: request.authSession.username,
      csrfToken: request.authSession.csrfToken,
      pollIntervalMs: config.pollIntervalMs,
    };
  });

  app.post(
    '/api/auth/login',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const body = jsonBody(request);
      const username = stringValue(body.username, 'username');
      const password = stringValue(body.password, 'password');
      const valid = await database.verifyAdminCredentials(username, password);

      if (!valid) {
        throw new HttpError(401, 'Invalid username or password.');
      }

      const session = database.createSession(username);
      setSessionCookie(reply, config, session.id);

      return {
        authenticated: true,
        username: session.username,
        csrfToken: session.csrfToken,
        pollIntervalMs: config.pollIntervalMs,
      };
    }
  );

  app.post('/api/auth/logout', async (request, reply) => {
    if (request.authSession) {
      requireCsrf(request);
      database.deleteSession(request.authSession.id);
    }

    clearSessionCookie(reply);
    reply.code(204);
  });

  app.get('/api/files', async (request) => {
    requireAuth(request);
    const pathQuery = optionalPath((request.query as Record<string, unknown> | undefined)?.path);
    return listDirectory(config.rootDir, pathQuery);
  });

  app.post('/api/files/folder', async (request) => {
    requireCsrf(request);
    const body = jsonBody(request);
    const parentPath = optionalPath(body.path);
    const name = validateEntryName(stringValue(body.name, 'name'));
    const item = await createFolder(config.rootDir, parentPath, name);
    return { item };
  });

  app.patch('/api/files/rename', async (request) => {
    requireCsrf(request);
    const body = jsonBody(request);
    const entryPath = stringValue(body.path, 'path');
    const name = stringValue(body.name, 'name');
    const item = await renameEntry(config.rootDir, entryPath, name);
    return { item };
  });

  app.patch('/api/files/move', async (request) => {
    requireCsrf(request);
    const body = jsonBody(request);
    const sourcePath = stringValue(body.sourcePath, 'sourcePath');
    const destinationPath = stringValue(body.destinationPath, 'destinationPath');
    const item = await moveEntry(config.rootDir, sourcePath, destinationPath);
    return { item };
  });

  app.delete('/api/files', async (request) => {
    requireCsrf(request);
    const body = jsonBody(request);
    const entryPath = stringValue(body.path, 'path');
    const record = await moveToTrash(config.rootDir, config.trashDir, entryPath);
    database.insertTrashRecord(record);
    return { deleted: record };
  });

  app.post('/api/files/upload', async (request) => {
    requireCsrf(request);
    const targetPath = optionalPath((request.query as Record<string, unknown> | undefined)?.path);
    const destination = await resolveEntry(config.rootDir, targetPath);

    if (destination.type !== 'directory') {
      throw new HttpError(400, 'Uploads must target a directory.');
    }

    const parts = request.parts();
    const uploaded = [];

    for await (const part of parts) {
      if (part.type !== 'file') {
        continue;
      }

      const safeName = validateEntryName(path.basename(part.filename));
      const nextAbsolutePath = path.join(destination.absolutePath, safeName);

      if (existsSync(nextAbsolutePath)) {
        throw new HttpError(409, `A file named "${safeName}" already exists.`);
      }

      await pipeline(part.file, createWriteStream(nextAbsolutePath, { flags: 'wx' }));
      uploaded.push(
        await resolveEntry(config.rootDir, path.posix.join(destination.relativePath, safeName))
      );
    }

    return {
      uploaded: uploaded.map((entry) => ({
        name: entry.name,
        path: entry.relativePath,
        type: entry.type,
        size: typeof entry.stats.size === 'bigint' ? Number(entry.stats.size) : entry.stats.size,
        modifiedAt: entry.stats.mtime.toISOString(),
        mimeType: entry.mimeType,
        previewKind: entry.previewKind,
        thumbnailAvailable: entry.previewKind === 'image',
      })),
    };
  });

  app.get('/api/files/download', async (request, reply) => {
    requireAuth(request);
    const entry = await resolveEntry(
      config.rootDir,
      optionalPath((request.query as Record<string, unknown> | undefined)?.path)
    );
    return sendFileStream(request, reply, entry, 'attachment');
  });

  app.get('/api/previews', async (request, reply) => {
    requireAuth(request);
    const query = (request.query as Record<string, unknown> | undefined) ?? {};
    const requestedPath = optionalPath(query.path);
    const kind = stringValue(query.kind, 'kind');
    const entry = await resolveEntry(config.rootDir, requestedPath);

    if (kind === 'inline') {
      if (!entry.previewKind) {
        throw new HttpError(404, 'No inline preview is available for this file.');
      }

      if (entry.previewKind === 'text') {
        reply.type('text/plain; charset=utf-8');
        return reply.send(await readTextPreview(entry));
      }

      return sendFileStream(request, reply, entry, 'inline');
    }

    if (kind === 'thumb') {
      const thumbnail = await createThumbnail(config.previewDir, entry);
      reply.type(thumbnail.contentType);
      return reply.send(openFileReadStream(thumbnail.filePath));
    }

    throw new HttpError(400, 'Unknown preview kind.');
  });

  app.get('/api/trash', async (request) => {
    requireAuth(request);

    return {
      items: database.listTrashRecords(),
    };
  });

  app.post('/api/trash/restore', async (request) => {
    requireCsrf(request);
    const body = jsonBody(request);
    const id = stringValue(body.id, 'id');
    const record = database.getTrashRecord(id);

    if (!record) {
      throw new HttpError(404, 'Trash item not found.');
    }

    const item = await restoreFromTrash(config.rootDir, config.trashDir, record);
    database.deleteTrashRecord(id);
    return { item };
  });

  app.delete('/api/trash/:id', async (request) => {
    requireCsrf(request);
    const id = stringValue((request.params as Record<string, unknown> | undefined)?.id, 'id');
    const record = database.getTrashRecord(id);

    if (!record) {
      throw new HttpError(404, 'Trash item not found.');
    }

    await permanentlyDeleteTrashItem(config.trashDir, record.storageName);
    database.deleteTrashRecord(id);
    return { deleted: true };
  });

  if (existsSync(config.webDistDir)) {
    await app.register(fastifyStatic, {
      root: config.webDistDir,
      prefix: '/',
      wildcard: false,
    });

    app.get('/*', async (request, reply) => {
      const pathname = requestPathname(request);

      if (pathname.startsWith('/api/') || pathname === '/healthz') {
        throw new HttpError(404, 'Route not found.');
      }

      if (path.extname(pathname)) {
        throw new HttpError(404, 'Static asset not found.');
      }

      return reply.sendFile('index.html');
    });
  }

  app.setErrorHandler((error, request, reply) => {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Internal server error.';
    request.log.error(error);
    reply.code(statusCode).send({
      error: message,
    });
  });

  return app;
}

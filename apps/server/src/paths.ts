import path from 'node:path';
import { HttpError } from './http-error.js';

export function toClientPath(value: string): string {
  return value.split(path.sep).join('/');
}

export function normalizeClientPath(value?: string): string {
  if (!value || value === '/') {
    return '';
  }

  const sanitized = value.replace(/\\/g, '/').trim();

  if (!sanitized || sanitized === '.') {
    return '';
  }

  if (sanitized.includes('\0')) {
    throw new HttpError(400, 'Invalid path.');
  }

  const normalized = path.posix.normalize(`/${sanitized}`).slice(1);

  if (normalized === '..' || normalized.startsWith('../')) {
    throw new HttpError(400, 'Path escapes the configured storage root.');
  }

  return normalized === '.' ? '' : normalized;
}

export function isWithinBase(baseDir: string, candidate: string): boolean {
  const relative = path.relative(baseDir, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function resolveWithinBase(baseDir: string, relativePath: string): string {
  const absolutePath = path.resolve(baseDir, relativePath);

  if (!isWithinBase(baseDir, absolutePath)) {
    throw new HttpError(400, 'Path escapes the configured storage root.');
  }

  return absolutePath;
}

export function validateEntryName(name: string): string {
  const trimmed = name.trim();

  if (!trimmed || trimmed === '.' || trimmed === '..') {
    throw new HttpError(400, 'Name is required.');
  }

  if (trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('\0')) {
    throw new HttpError(400, 'Name cannot contain path separators.');
  }

  return trimmed;
}

export function getClientParentPath(relativePath: string): string | null {
  if (!relativePath) {
    return null;
  }

  const parent = path.posix.dirname(relativePath);
  return parent === '.' ? '' : parent;
}

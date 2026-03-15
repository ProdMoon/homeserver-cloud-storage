import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { cp, mkdir, readdir, readFile, rename, rm, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import sharp from "sharp";
import mime from "mime-types";
import { HttpError } from "./http-error.js";
import { getClientParentPath, isWithinBase, normalizeClientPath, resolveWithinBase, toClientPath, validateEntryName } from "./paths.js";

export type PreviewKind = "image" | "video" | "pdf" | "text" | "audio" | null;

export interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modifiedAt: string;
  mimeType: string | null;
  previewKind: PreviewKind;
  thumbnailAvailable: boolean;
}

export interface DirectoryListing {
  path: string;
  parentPath: string | null;
  items: FileEntry[];
}

export interface ResolvedEntry {
  absolutePath: string;
  relativePath: string;
  name: string;
  type: "file" | "directory";
  stats: Awaited<ReturnType<typeof stat>>;
  mimeType: string | null;
  previewKind: PreviewKind;
}

export interface TrashRecordInput {
  id: string;
  originalPath: string;
  storageName: string;
  itemName: string;
  itemKind: "file" | "directory";
  deletedAt: string;
  sizeBytes: number;
  mimeType: string | null;
}

function numericSize(value: number | bigint): number {
  return typeof value === "bigint" ? Number(value) : value;
}

const textPreviewExtensions = new Set([
  ".txt",
  ".md",
  ".json",
  ".yaml",
  ".yml",
  ".log",
  ".csv",
  ".xml",
  ".html",
  ".css",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs"
]);

const browserVideoTypes = new Set(["video/mp4", "video/webm", "video/ogg"]);
const browserAudioTypes = new Set(["audio/mpeg", "audio/ogg", "audio/wav", "audio/webm"]);

export function detectPreviewKind(mimeType: string | null, name: string): PreviewKind {
  const extension = path.extname(name).toLowerCase();

  if (mimeType?.startsWith("image/")) {
    return "image";
  }

  if (mimeType === "application/pdf") {
    return "pdf";
  }

  if (mimeType && browserVideoTypes.has(mimeType)) {
    return "video";
  }

  if (mimeType && browserAudioTypes.has(mimeType)) {
    return "audio";
  }

  if (mimeType?.startsWith("text/") || textPreviewExtensions.has(extension)) {
    return "text";
  }

  return null;
}

export async function resolveEntry(rootDir: string, requestedPath?: string): Promise<ResolvedEntry> {
  const relativePath = normalizeClientPath(requestedPath);
  const absolutePath = resolveWithinBase(rootDir, relativePath);
  const stats = await stat(absolutePath).catch(() => {
    throw new HttpError(404, "Path not found.");
  });
  const type = stats.isDirectory() ? "directory" : "file";
  const name = relativePath ? path.basename(absolutePath) : "/";
  const mimeType = type === "file" ? mime.lookup(absolutePath) || null : null;
  const previewKind = type === "file" ? detectPreviewKind(mimeType, absolutePath) : null;

  return {
    absolutePath,
    relativePath,
    name,
    type,
    stats,
    mimeType,
    previewKind
  };
}

export async function createFileEntry(rootDir: string, absolutePath: string): Promise<FileEntry> {
  const stats = await stat(absolutePath);
  const relativePath = toClientPath(path.relative(rootDir, absolutePath));
  const type = stats.isDirectory() ? "directory" : "file";
  const mimeType = type === "file" ? mime.lookup(absolutePath) || null : null;
  const previewKind = type === "file" ? detectPreviewKind(mimeType, absolutePath) : null;

  return {
    name: path.basename(absolutePath),
    path: relativePath,
    type,
    size: type === "file" ? numericSize(stats.size) : 0,
    modifiedAt: stats.mtime.toISOString(),
    mimeType,
    previewKind,
    thumbnailAvailable: previewKind === "image"
  };
}

export async function listDirectory(rootDir: string, requestedPath?: string): Promise<DirectoryListing> {
  const entry = await resolveEntry(rootDir, requestedPath);

  if (entry.type !== "directory") {
    throw new HttpError(400, "Requested path is not a directory.");
  }

  const children = await readdir(entry.absolutePath, { withFileTypes: true });
  const items = await Promise.all(
    children.map(async (child) => createFileEntry(rootDir, path.join(entry.absolutePath, child.name)))
  );

  items.sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === "directory" ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
  });

  return {
    path: entry.relativePath,
    parentPath: getClientParentPath(entry.relativePath),
    items
  };
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function movePathAcrossDevices(sourcePath: string, destinationPath: string): Promise<void> {
  await mkdir(path.dirname(destinationPath), { recursive: true });

  try {
    await rename(sourcePath, destinationPath);
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "EXDEV") {
      throw error;
    }

    await cp(sourcePath, destinationPath, {
      recursive: true,
      errorOnExist: true,
      force: false,
      preserveTimestamps: true
    });
    await rm(sourcePath, { recursive: true, force: true });
  }
}

export async function createFolder(rootDir: string, parentPath: string | undefined, folderName: string): Promise<FileEntry> {
  const parent = await resolveEntry(rootDir, parentPath);

  if (parent.type !== "directory") {
    throw new HttpError(400, "Parent path must be a directory.");
  }

  const safeName = validateEntryName(folderName);
  const targetPath = path.join(parent.absolutePath, safeName);

  if (!isWithinBase(rootDir, targetPath)) {
    throw new HttpError(400, "Destination is outside the storage root.");
  }

  if (await pathExists(targetPath)) {
    throw new HttpError(409, "A file or folder with that name already exists.");
  }

  await mkdir(targetPath, { recursive: false });
  return createFileEntry(rootDir, targetPath);
}

export async function renameEntry(rootDir: string, entryPath: string, nextName: string): Promise<FileEntry> {
  const source = await resolveEntry(rootDir, entryPath);

  if (!source.relativePath) {
    throw new HttpError(400, "The storage root cannot be renamed.");
  }

  const safeName = validateEntryName(nextName);
  const parentPath = getClientParentPath(source.relativePath) ?? "";
  const destinationPath = resolveWithinBase(rootDir, path.join(parentPath, safeName));

  if (await pathExists(destinationPath)) {
    throw new HttpError(409, "A file or folder with that name already exists.");
  }

  await movePathAcrossDevices(source.absolutePath, destinationPath);
  return createFileEntry(rootDir, destinationPath);
}

export async function moveEntry(rootDir: string, sourcePath: string, destinationDirectoryPath: string): Promise<FileEntry> {
  const source = await resolveEntry(rootDir, sourcePath);
  const destinationDirectory = await resolveEntry(rootDir, destinationDirectoryPath);

  if (!source.relativePath) {
    throw new HttpError(400, "The storage root cannot be moved.");
  }

  if (destinationDirectory.type !== "directory") {
    throw new HttpError(400, "Destination must be a directory.");
  }

  const destinationPath = path.join(destinationDirectory.absolutePath, source.name);

  if (source.type === "directory" && isWithinBase(source.absolutePath, destinationPath)) {
    throw new HttpError(400, "A folder cannot be moved inside itself.");
  }

  if (await pathExists(destinationPath)) {
    throw new HttpError(409, "A file or folder with that name already exists at the destination.");
  }

  await movePathAcrossDevices(source.absolutePath, destinationPath);
  return createFileEntry(rootDir, destinationPath);
}

export async function moveToTrash(rootDir: string, trashDir: string, entryPath: string): Promise<TrashRecordInput> {
  const entry = await resolveEntry(rootDir, entryPath);

  if (!entry.relativePath) {
    throw new HttpError(400, "The storage root cannot be deleted.");
  }

  await mkdir(trashDir, { recursive: true });
  const id = randomUUID();
  const storageName = `${id}-${entry.name}`;
  const trashedAbsolutePath = path.join(trashDir, storageName);

  await movePathAcrossDevices(entry.absolutePath, trashedAbsolutePath);

  return {
    id,
    originalPath: entry.relativePath,
    storageName,
    itemName: entry.name,
    itemKind: entry.type,
    deletedAt: new Date().toISOString(),
    sizeBytes: entry.type === "file" ? numericSize(entry.stats.size) : 0,
    mimeType: entry.mimeType
  };
}

export async function restoreFromTrash(rootDir: string, trashDir: string, record: TrashRecordInput): Promise<FileEntry> {
  const destinationPath = resolveWithinBase(rootDir, record.originalPath);
  const sourcePath = path.join(trashDir, record.storageName);

  if (await pathExists(destinationPath)) {
    throw new HttpError(409, "Cannot restore because the original path already exists.");
  }

  await movePathAcrossDevices(sourcePath, destinationPath);
  return createFileEntry(rootDir, destinationPath);
}

export async function permanentlyDeleteTrashItem(trashDir: string, storageName: string): Promise<void> {
  const targetPath = path.join(trashDir, storageName);
  await rm(targetPath, { recursive: true, force: true });
}

export async function createThumbnail(
  previewDir: string,
  entry: ResolvedEntry
): Promise<{ filePath: string; contentType: string }> {
  if (entry.previewKind !== "image") {
    throw new HttpError(404, "Thumbnail generation is only available for images.");
  }

  await mkdir(previewDir, { recursive: true });
  const cacheKey = createHash("sha1")
    .update(entry.relativePath)
    .update(String(numericSize(entry.stats.size)))
    .update(String(entry.stats.mtimeMs))
    .digest("hex");
  const thumbnailPath = path.join(previewDir, `${cacheKey}.webp`);

  if (await pathExists(thumbnailPath)) {
    return {
      filePath: thumbnailPath,
      contentType: "image/webp"
    };
  }

  try {
    await sharp(entry.absolutePath)
      .rotate()
      .resize(320, 240, {
        fit: "inside",
        withoutEnlargement: true
      })
      .webp({ quality: 82 })
      .toFile(thumbnailPath);

    return {
      filePath: thumbnailPath,
      contentType: "image/webp"
    };
  } catch {
    return {
      filePath: entry.absolutePath,
      contentType: entry.mimeType ?? "application/octet-stream"
    };
  }
}

export async function readTextPreview(entry: ResolvedEntry): Promise<string> {
  if (entry.previewKind !== "text") {
    throw new HttpError(400, "Text preview is only available for text files.");
  }

  if (numericSize(entry.stats.size) > 2 * 1024 * 1024) {
    throw new HttpError(413, "Text preview is limited to files up to 2 MB.");
  }

  return readFile(entry.absolutePath, "utf8");
}

export function openFileReadStream(absolutePath: string, start?: number, end?: number) {
  return createReadStream(absolutePath, start != null && end != null ? { start, end } : undefined);
}

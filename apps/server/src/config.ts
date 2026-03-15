import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import { HttpError } from "./http-error.js";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDir, "../../..");
const loadedEnvDirectories = new Set<string>();

export interface AppConfig {
  port: number;
  rootDir: string;
  dataDir: string;
  trashDir: string;
  previewDir: string;
  databasePath: string;
  adminUsername: string;
  adminPassword?: string;
  sessionSecret: string;
  trustProxy: boolean;
  pollIntervalMs: number;
  sessionTtlMs: number;
  nodeEnv: string;
  webDistDir: string;
}

function envFilesFor(nodeEnv: string): string[] {
  const files = [`.env.${nodeEnv}.local`];

  if (nodeEnv !== "test") {
    files.push(".env.local");
  }

  files.push(`.env.${nodeEnv}`, ".env");
  return files;
}

export function loadProjectEnv(projectRoot = repoRoot): void {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const cacheKey = `${projectRoot}:${nodeEnv}`;

  if (loadedEnvDirectories.has(cacheKey)) {
    return;
  }

  for (const filename of envFilesFor(nodeEnv)) {
    const filePath = path.join(projectRoot, filename);

    try {
      process.loadEnvFile(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  loadedEnvDirectories.add(cacheKey);
}

function parsePort(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function ensureDistinctPaths(rootDir: string, dataDir: string) {
  const rootToData = path.relative(rootDir, dataDir);
  const dataToRoot = path.relative(dataDir, rootDir);
  const nestedInRoot = rootToData === "" || (!rootToData.startsWith("..") && !path.isAbsolute(rootToData));
  const nestedInData = dataToRoot === "" || (!dataToRoot.startsWith("..") && !path.isAbsolute(dataToRoot));

  if (nestedInRoot || nestedInData) {
    throw new HttpError(500, "ROOT_DIR and DATA_DIR must be different non-overlapping directories.");
  }
}

export async function loadConfig(overrides: Partial<AppConfig> = {}): Promise<AppConfig> {
  loadProjectEnv();
  const port = overrides.port ?? parsePort(process.env.PORT, 3000);
  const rootDir = path.resolve(overrides.rootDir ?? process.env.ROOT_DIR ?? path.join(repoRoot, "storage/root"));
  const dataDir = path.resolve(overrides.dataDir ?? process.env.DATA_DIR ?? path.join(repoRoot, "storage/data"));
  const adminUsername = overrides.adminUsername ?? process.env.ADMIN_USERNAME ?? "admin";
  const adminPassword = overrides.adminPassword ?? process.env.ADMIN_PASSWORD;
  const sessionSecret = overrides.sessionSecret ?? process.env.SESSION_SECRET ?? "development-session-secret-please-change";
  const trustProxy = overrides.trustProxy ?? parseBoolean(process.env.TRUST_PROXY, false);
  const pollIntervalMs = Math.max(5_000, overrides.pollIntervalMs ?? parsePort(process.env.POLL_INTERVAL_MS, 10_000));
  const sessionTtlMs = overrides.sessionTtlMs ?? 1000 * 60 * 60 * 24 * 7;
  const nodeEnv = overrides.nodeEnv ?? process.env.NODE_ENV ?? "development";
  const webDistDir = path.resolve(overrides.webDistDir ?? path.join(repoRoot, "apps/web/dist"));

  if (sessionSecret.length < 32) {
    throw new HttpError(500, "SESSION_SECRET must be at least 32 characters long.");
  }

  ensureDistinctPaths(rootDir, dataDir);
  await mkdir(rootDir, { recursive: true });
  await mkdir(dataDir, { recursive: true });

  return {
    port,
    rootDir,
    dataDir,
    trashDir: path.join(dataDir, "trash"),
    previewDir: path.join(dataDir, "previews"),
    databasePath: path.join(dataDir, "pi-home-drive.sqlite"),
    adminUsername,
    adminPassword,
    sessionSecret,
    trustProxy,
    pollIntervalMs,
    sessionTtlMs,
    nodeEnv,
    webDistDir
  };
}

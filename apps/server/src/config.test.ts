import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadProjectEnv } from "./config.js";

const envKeys = ["ADMIN_PASSWORD", "SESSION_SECRET", "NODE_ENV"] as const;

function snapshotEnv() {
  return Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
}

function restoreEnv(snapshot: Record<string, string | undefined>) {
  for (const key of envKeys) {
    const value = snapshot[key];

    if (value == null) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }
}

test("loads repo-root env files for the active mode without overriding existing env", async () => {
  const snapshot = snapshotEnv();
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "pi-home-drive-env-"));

  try {
    delete process.env.ADMIN_PASSWORD;
    process.env.NODE_ENV = "development";
    process.env.SESSION_SECRET = "already-present-secret";

    await writeFile(path.join(tempRoot, ".env"), "ADMIN_PASSWORD=from-root-env\nSESSION_SECRET=from-env\n");
    await writeFile(path.join(tempRoot, ".env.development.local"), "ADMIN_PASSWORD=from-development-local\n");

    loadProjectEnv(tempRoot);

    expect(process.env.ADMIN_PASSWORD).toBe("from-development-local");
    expect(process.env.SESSION_SECRET).toBe("already-present-secret");
  } finally {
    restoreEnv(snapshot);
    await rm(tempRoot, { recursive: true, force: true });
  }
});

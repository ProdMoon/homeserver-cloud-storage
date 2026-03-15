import argon2 from "argon2";
import { randomBytes, randomUUID } from "node:crypto";

export const SESSION_COOKIE_NAME = "phd_session";

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

export function createSessionId(): string {
  return randomUUID();
}

export function createCsrfToken(): string {
  return randomBytes(24).toString("hex");
}


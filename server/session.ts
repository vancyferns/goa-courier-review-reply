import { AsyncLocalStorage } from "node:async_hooks";
import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";

export interface TokenPayload {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at: number;
}

export interface SessionData {
  configs: Record<string, string>;
  tokens: TokenPayload | null;
  dirty: boolean;
}

const COOKIE_NAME = "gcs_session";
const sessionStorage = new AsyncLocalStorage<SessionData>();

function getEncryptionKey(): Buffer {
  const raw =
    process.env.TOKEN_ENCRYPTION_KEY ||
    process.env.VERCEL_PROJECT_ID ||
    process.env.GOOGLE_CLIENT_SECRET ||
    "goa-courier-workstation-session-v1";
  return crypto.createHash("sha256").update(raw).digest();
}

function encryptSession(data: {
  configs: Record<string, string>;
  tokens: TokenPayload | null;
}): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const json = JSON.stringify(data);
  const encrypted = Buffer.concat([
    cipher.update(json, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

function decryptSession(cookieValue: string): {
  configs: Record<string, string>;
  tokens: TokenPayload | null;
} | null {
  try {
    const buf = Buffer.from(cookieValue, "base64url");
    if (buf.length < 29) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      getEncryptionKey(),
      iv
    );
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString("utf8");
    const parsed = JSON.parse(decrypted);
    return {
      configs:
        parsed && typeof parsed.configs === "object" && parsed.configs
          ? parsed.configs
          : {},
      tokens: parsed?.tokens ?? null,
    };
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(";")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const k = part.slice(0, eqIdx).trim();
    const v = part.slice(eqIdx + 1).trim();
    if (k) result[k] = decodeURIComponent(v);
  }
  return result;
}

export function sessionMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const cookies = parseCookies(req.headers.cookie);
  const raw = cookies[COOKIE_NAME];
  const decoded = raw ? decryptSession(raw) : null;
  const initial: SessionData = {
    configs: decoded?.configs ?? {},
    tokens: decoded?.tokens ?? null,
    dirty: false,
  };
  sessionStorage.run(initial, () => next());
}

export function getSessionConfig(key: string): string | undefined {
  return sessionStorage.getStore()?.configs[key];
}

export function setSessionConfig(key: string, value: string): void {
  const store = sessionStorage.getStore();
  if (!store) return;
  if (value === "") {
    delete store.configs[key];
  } else {
    store.configs[key] = value;
  }
  store.dirty = true;
}

export function getSessionTokens(): TokenPayload | null {
  return sessionStorage.getStore()?.tokens ?? null;
}

export function setSessionTokens(tokens: TokenPayload | null): void {
  const store = sessionStorage.getStore();
  if (!store) return;
  store.tokens = tokens;
  store.dirty = true;
}

export function commitSessionCookie(req: Request, res: Response): void {
  const store = sessionStorage.getStore();
  if (!store || !store.dirty) return;
  const value = encryptSession({
    configs: store.configs,
    tokens: store.tokens,
  });
  const isHttps =
    req.secure ||
    String(req.headers["x-forwarded-proto"] || "").includes("https");
  const attrs = [
    `${COOKIE_NAME}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=2592000",
  ];
  if (isHttps) {
    attrs.push("Secure");
  }
  res.setHeader("Set-Cookie", attrs.join("; "));
  store.dirty = false;
}

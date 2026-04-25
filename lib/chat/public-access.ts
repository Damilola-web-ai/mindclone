import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { requireEnv } from "@/lib/env";

const COOKIE_NAME = "mindclone-visitor-access";
const HASH_PREFIX = "scrypt";
const HASH_KEY_LENGTH = 32;

function normalizePassword(value?: string | null) {
  return value?.trim() ?? "";
}

function bufferEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function createCookieSignature(ownerProfileId: string, passwordHash: string) {
  return createHmac("sha256", requireEnv("SUPABASE_SERVICE_ROLE_KEY"))
    .update(`${ownerProfileId}:${passwordHash}`)
    .digest("hex");
}

export function hashVisitorAccessPassword(password: string) {
  const normalizedPassword = normalizePassword(password);
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(normalizedPassword, salt, HASH_KEY_LENGTH).toString("hex");

  return `${HASH_PREFIX}$${salt}$${derivedKey}`;
}

export function verifyVisitorAccessPassword(
  password: string,
  storedHash?: string | null,
) {
  const normalizedPassword = normalizePassword(password);

  if (!storedHash || !normalizedPassword) {
    return false;
  }

  const [prefix, salt, expectedHash] = storedHash.split("$");

  if (prefix !== HASH_PREFIX || !salt || !expectedHash) {
    return false;
  }

  const actualHash = scryptSync(normalizedPassword, salt, HASH_KEY_LENGTH).toString("hex");

  return bufferEquals(actualHash, expectedHash);
}

export function buildVisitorAccessCookieValue(
  ownerProfileId: string,
  passwordHash: string,
) {
  return `${ownerProfileId}.${createCookieSignature(ownerProfileId, passwordHash)}`;
}

export function hasValidVisitorAccessCookie(input: {
  cookieValue?: string | null;
  ownerProfileId: string;
  passwordHash?: string | null;
}) {
  if (!input.cookieValue || !input.passwordHash) {
    return false;
  }

  const [storedOwnerId, signature] = input.cookieValue.split(".");

  if (!storedOwnerId || !signature || storedOwnerId !== input.ownerProfileId) {
    return false;
  }

  const expectedSignature = createCookieSignature(
    input.ownerProfileId,
    input.passwordHash,
  );

  return bufferEquals(signature, expectedSignature);
}

export function getVisitorAccessCookieName() {
  return COOKIE_NAME;
}

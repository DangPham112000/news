import { createHash, randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { ApiKey } from './models/ApiKey.js';

export const API_KEY_PREFIX = 'nwk_';

export interface ApiKeyInfo {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
}

const useMock = () => process.env.USE_MOCK === 'true';

// Mock mode keeps keys in memory, like the mock article store.
let mockKeys: (ApiKeyInfo & { hash: string })[] = [];
let mockNextId = 1;

/** Forget all in-memory keys and rate limit counters (used by tests). */
export function resetMockKeys(): void {
  mockKeys = [];
  mockNextId = 1;
  windows.clear();
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

function toInfo(doc: any): ApiKeyInfo {
  return {
    id: doc._id.toString(),
    name: doc.name,
    prefix: doc.prefix,
    createdAt: doc.createdAt.toISOString(),
    lastUsedAt: doc.lastUsedAt?.toISOString(),
  };
}

/** Create a key. The raw key is returned only here. */
export async function createApiKey(name: string): Promise<{ key: string; apiKey: ApiKeyInfo }> {
  const key = API_KEY_PREFIX + randomBytes(32).toString('base64url');
  const prefix = key.slice(0, API_KEY_PREFIX.length + 6);
  const trimmed = name.trim().slice(0, 100) || 'AI agent';

  if (useMock()) {
    const apiKey = { id: `key-${mockNextId++}`, name: trimmed, prefix, createdAt: new Date().toISOString() };
    mockKeys.push({ ...apiKey, hash: hashKey(key) });
    return { key, apiKey };
  }

  const doc = await ApiKey.create({ name: trimmed, hash: hashKey(key), prefix });
  return { key, apiKey: toInfo(doc) };
}

export async function listApiKeys(): Promise<ApiKeyInfo[]> {
  if (useMock()) return mockKeys.map(({ hash: _hash, ...info }) => info);
  const docs = await ApiKey.find().sort({ createdAt: -1 });
  return docs.map(toInfo);
}

export async function revokeApiKey(id: string): Promise<boolean> {
  if (useMock()) {
    const index = mockKeys.findIndex((k) => k.id === id);
    if (index === -1) return false;
    mockKeys.splice(index, 1);
    return true;
  }
  if (!mongoose.isValidObjectId(id)) return false;
  const result = await ApiKey.deleteOne({ _id: id });
  return result.deletedCount === 1;
}

/** Resolve a raw API key to its record, or null when it is unknown. */
export async function verifyApiKey(key: string | undefined): Promise<ApiKeyInfo | null> {
  if (!key?.startsWith(API_KEY_PREFIX)) return null;
  const hash = hashKey(key);

  if (useMock()) {
    const found = mockKeys.find((k) => k.hash === hash);
    if (!found) return null;
    found.lastUsedAt = new Date().toISOString();
    const { hash: _hash, ...info } = found;
    return info;
  }

  const doc = await ApiKey.findOneAndUpdate({ hash }, { lastUsedAt: new Date() }, { new: true });
  return doc ? toInfo(doc) : null;
}

/** Read "Authorization: Bearer <key>". */
export function bearerToken(header: string | undefined): string | undefined {
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : undefined;
}

// Fixed-window rate limit per key, in memory (one backend instance).
const WINDOW_MS = 60_000;
const windows = new Map<string, { start: number; count: number }>();

/** True when the key may make another request in the current minute. */
export function allowRequest(keyId: string, now = Date.now()): boolean {
  const limit = Number(process.env.RATE_LIMIT_PER_MIN) || 60;
  const w = windows.get(keyId);
  if (!w || now - w.start >= WINDOW_MS) {
    windows.set(keyId, { start: now, count: 1 });
    return true;
  }
  w.count++;
  return w.count <= limit;
}

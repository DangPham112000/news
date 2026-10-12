import type { IDataSource } from './types.js';
import { mockDataSource } from './mockDataSource.js';
import { dbDataSource } from './dbDataSource.js';

/**
 * Returns the appropriate data source based on USE_MOCK env var.
 *
 * - USE_MOCK=true  → in-memory data (no DB required)
 * - Otherwise      → MongoDB via Mongoose
 */
export function getDataSource(): IDataSource {
  if (process.env.USE_MOCK === 'true') {
    return mockDataSource;
  }
  return dbDataSource;
}

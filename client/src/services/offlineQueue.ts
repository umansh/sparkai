import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { QueuedSubmission, SubmissionResult } from '../types';

interface SparkSchoolDB extends DBSchema {
  response_queue: {
    key: string;
    value: QueuedSubmission;
  };
  sync_logs: {
    key: string;
    value: {
      timestamp: string;
      message: string;
      status: 'success' | 'warning' | 'error';
    };
  };
}

let dbPromise: Promise<IDBPDatabase<SparkSchoolDB>> | null = null;

function getDB(): Promise<IDBPDatabase<SparkSchoolDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SparkSchoolDB>('sparkschool_offline_db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('response_queue')) {
          db.createObjectStore('response_queue', { keyPath: 'submission_id' });
        }
        if (!db.objectStoreNames.contains('sync_logs')) {
          db.createObjectStore('sync_logs', { keyPath: 'timestamp' });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Retries a fetch request with exponential backoff + full jitter.
 * Designed for 2G/3G networks where a single attempt frequently times out.
 * Delays: ~1s, ~2s, ~4s, ~8s (capped at 30s), each with ±500ms random jitter.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 4
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
      const backoffMs = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 500, 30000);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
  throw new Error('Max retries exceeded');
}

export const offlineQueueService = {
  async addSubmission(item: QueuedSubmission): Promise<void> {
    const db = await getDB();
    // Check if duplicate already exists locally
    const existing = await db.get('response_queue', item.submission_id);
    if (!existing) {
      await db.put('response_queue', item);
      await this.logSync(`Queued offline response for ${item.student_id} on ${item.skill_id} (ID: ${item.submission_id.slice(0, 8)}...)`, 'warning');
    }
  },

  async getPendingSubmissions(): Promise<QueuedSubmission[]> {
    const db = await getDB();
    return db.getAll('response_queue');
  },

  async removeSubmission(submission_id: string): Promise<void> {
    const db = await getDB();
    await db.delete('response_queue', submission_id);
  },

  async clearQueue(): Promise<void> {
    const db = await getDB();
    await db.clear('response_queue');
    await this.logSync('Cleared local offline queue.', 'warning');
  },

  async logSync(message: string, status: 'success' | 'warning' | 'error'): Promise<void> {
    const db = await getDB();
    const timestamp = new Date().toISOString() + '_' + Math.random().toString(36).substring(2, 6);
    await db.put('sync_logs', { timestamp, message, status });
  },

  async getSyncLogs(): Promise<{ timestamp: string; message: string; status: 'success' | 'warning' | 'error' }[]> {
    const db = await getDB();
    const logs = await db.getAll('sync_logs');
    return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 30);
  },

  async syncAll(apiBaseUrl: string): Promise<{ synced: number; duplicates: number; errors: number; results: SubmissionResult[] }> {
    const pending = await this.getPendingSubmissions();
    if (pending.length === 0) {
      return { synced: 0, duplicates: 0, errors: 0, results: [] };
    }

    await this.logSync(`Starting sync for ${pending.length} queued responses (with retry backoff)...`, 'warning');

    try {
      // fetchWithRetry instead of bare fetch — handles 2G/3G packet drops with backoff
      const response = await fetchWithRetry(`${apiBaseUrl}/response/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: pending }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed with HTTP status ${response.status}`);
      }

      const results: SubmissionResult[] = await response.json();
      let syncedCount = 0;
      let dupCount = 0;

      for (const res of results) {
        await this.removeSubmission(res.submission_id);
        if (res.is_duplicate) {
          dupCount++;
        } else {
          syncedCount++;
        }
      }

      await this.logSync(
        `Successfully synced ${syncedCount} new responses (${dupCount} duplicates safely deduplicated).`,
        'success'
      );

      return { synced: syncedCount, duplicates: dupCount, errors: 0, results };
    } catch (err: any) {
      await this.logSync(`Sync failed after retries: ${err.message || 'Network unreachable'}`, 'error');
      return { synced: 0, duplicates: 0, errors: pending.length, results: [] };
    }
  },
};

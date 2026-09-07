import {
  QueuedMutation,
  getQueuedMutations,
  removeQueuedMutation,
  updateQueuedMutation,
  setMeta,
} from './offlineDb';

export type SyncStatus =
  | 'online' // connected, queue empty
  | 'offline' // no connectivity, changes saved locally
  | 'syncing' // queue is being uploaded
  | 'error'; // an item could not be synced after retries

type Listener = (status: SyncStatus, pendingCount: number) => void;

// One entry point per entity/operation so the manager can replay queued
// mutations without every React component knowing about offline logic.
export type MutationExecutor = (mutation: QueuedMutation) => Promise<void>;

const MAX_ATTEMPTS_BEFORE_BACKOFF_CAP = 6;
const BASE_DELAY_MS = 2000;

class SyncManager {
  private listeners = new Set<Listener>();
  private executor: MutationExecutor | null = null;
  private status: SyncStatus = navigator.onLine ? 'online' : 'offline';
  private pendingCount = 0;
  private syncing = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  init(executor: MutationExecutor) {
    this.executor = executor;
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    this.refreshPendingCount().then(() => {
      if (navigator.onLine) this.processQueue();
    });
  }

  destroy() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.status, this.pendingCount);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l(this.status, this.pendingCount));
  }

  private setStatus(status: SyncStatus) {
    this.status = status;
    this.notify();
  }

  private handleOnline = () => {
    this.setStatus(this.pendingCount > 0 ? 'syncing' : 'online');
    this.processQueue();
  };

  private handleOffline = () => {
    this.setStatus('offline');
  };

  async refreshPendingCount() {
    const queue = await getQueuedMutations();
    this.pendingCount = queue.length;
    if (!navigator.onLine) {
      this.setStatus('offline');
    } else if (this.pendingCount > 0) {
      this.setStatus(this.syncing ? 'syncing' : 'syncing');
    } else {
      this.setStatus('online');
    }
  }

  /** Call after a mutation is enqueued locally, so the UI updates immediately. */
  async notifyMutationQueued() {
    await this.refreshPendingCount();
    if (navigator.onLine) this.processQueue();
  }

  async processQueue() {
    if (this.syncing || !this.executor || !navigator.onLine) return;
    this.syncing = true;

    try {
      let queue = await getQueuedMutations();
      if (queue.length === 0) {
        this.setStatus('online');
        return;
      }

      this.setStatus('syncing');

      for (const mutation of queue) {
        if (!navigator.onLine) break; // connection dropped mid-sync

        try {
          mutation.status = 'syncing';
          await updateQueuedMutation(mutation);
          await this.executor(mutation);
          // Success: remove it only after server confirmation
          await removeQueuedMutation(mutation.id);
        } catch (err: any) {
          mutation.attempts += 1;
          mutation.lastError = err?.message || 'Erreur de synchronisation';
          mutation.status = mutation.attempts >= MAX_ATTEMPTS_BEFORE_BACKOFF_CAP ? 'conflict' : 'failed';
          await updateQueuedMutation(mutation);

          if (mutation.status === 'conflict') {
            // Leave it in the queue as a visible error; keep processing the rest.
            continue;
          }

          // Exponential backoff before the next full retry pass.
          const delay = Math.min(
            BASE_DELAY_MS * Math.pow(2, mutation.attempts),
            60_000
          );
          this.scheduleRetry(delay);
          break;
        }
      }

      queue = await getQueuedMutations();
      this.pendingCount = queue.length;
      const hasConflicts = queue.some((m) => m.status === 'conflict');

      if (hasConflicts) {
        this.setStatus('error');
      } else if (queue.length > 0) {
        // Some items remain (network dropped mid-loop); a retry is already scheduled.
        this.setStatus('syncing');
      } else {
        this.setStatus('online');
        await setMeta('lastSyncedAt', new Date().toISOString());
      }
    } finally {
      this.syncing = false;
    }
  }

  private scheduleRetry(delay: number) {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      this.processQueue();
    }, delay);
  }
}

export const syncManager = new SyncManager();

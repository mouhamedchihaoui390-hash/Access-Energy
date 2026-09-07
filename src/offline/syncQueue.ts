import {
  QueuedMutation,
  MutationEntity,
  MutationOperation,
  enqueueMutation,
  generateStableId,
} from './offlineDb';
import { syncManager } from './syncManager';

/**
 * Builds a queue entry for a mutation that couldn't reach the server and
 * stores it in IndexedDB, then wakes the sync manager so it retries as soon
 * as connectivity is available (immediately if already online-but-flaky).
 */
export async function queueMutation(
  entity: MutationEntity,
  operation: MutationOperation,
  entityId: string,
  payload: any
): Promise<QueuedMutation> {
  const mutation: QueuedMutation = {
    id: generateStableId('mut'),
    entity,
    operation,
    entityId,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
    status: 'pending',
  };
  await enqueueMutation(mutation);
  await syncManager.notifyMutationQueued();
  return mutation;
}

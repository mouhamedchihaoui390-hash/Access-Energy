import { QueuedMutation } from './offlineDb';
import { rawApi, HttpError } from '../api';

/**
 * Replays one queued mutation against the real server endpoints. Throws on
 * failure so the sync manager's own retry/backoff logic can handle it —
 * this must NOT swallow errors or re-queue on its own.
 */
export async function replayMutation(mutation: QueuedMutation): Promise<void> {
  const { entity, operation, entityId, payload } = mutation;

  switch (entity) {
    case 'client':
      if (operation === 'create') await rawApi.createClient(payload);
      else if (operation === 'update') await rawApi.updateClient(entityId, payload);
      else if (operation === 'delete') await idempotentDelete(() => rawApi.deleteClient(entityId));
      return;

    case 'product':
      if (operation === 'create') await rawApi.createProduct(payload);
      else if (operation === 'update') await rawApi.updateProduct(entityId, payload);
      else if (operation === 'delete') await idempotentDelete(() => rawApi.deleteProduct(entityId));
      return;

    case 'devis':
      if (operation === 'create') await rawApi.createDevis(payload);
      else if (operation === 'update') await rawApi.updateDevis(entityId, payload);
      else if (operation === 'delete') await idempotentDelete(() => rawApi.deleteDevis(entityId));
      return;

    case 'bl':
      if (operation === 'create') await rawApi.createBL(payload);
      else if (operation === 'update') await rawApi.updateBL(entityId, payload);
      else if (operation === 'delete') await idempotentDelete(() => rawApi.deleteBL(entityId));
      return;

    case 'facture':
      if (operation === 'create') await rawApi.createFacture(payload);
      else if (operation === 'update') await rawApi.updateFacture(entityId, payload);
      else if (operation === 'delete') await idempotentDelete(() => rawApi.deleteFacture(entityId));
      return;

    case 'payment':
      if (operation === 'create') await rawApi.createPayment(payload);
      else if (operation === 'delete') await idempotentDelete(() => rawApi.deletePayment(entityId));
      return;

    case 'company':
      if (operation === 'update') await rawApi.updateCompany(payload);
      return;
  }
}

/** A delete that 404s means the record is already gone server-side — that IS
 * the desired end state, so treat it as success instead of retrying forever. */
async function idempotentDelete(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) return;
    throw err;
  }
}

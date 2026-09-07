import {
  Client,
  Product,
  CommercialDocument,
  Payment,
  CompanySettings,
  AuditLog,
  DashboardMetrics,
  FinancialReport,
} from './types';
import { getSnapshot, setSnapshot, generateStableId } from './offline/offlineDb';
import { queueMutation } from './offline/syncQueue';
import { MutationEntity, MutationOperation } from './offline/offlineDb';

export interface BootstrapData {
  company: CompanySettings;
  metrics: DashboardMetrics;
  clients: Client[];
  products: Product[];
  documents: CommercialDocument[];
  payments: Payment[];
  auditLogs: AuditLog[];
  reports: FinancialReport;
}

export const defaultCompany: CompanySettings = {
  id: 'company-main',
  name: 'ACCESS ENERGY',
  legal_name: 'ACCESS ENERGY SARL',
  subtitle: 'ÉNERGIE SOLAIRE • PV BT • POMPAGE • MT',
  address_line1: 'AV FARHAD HACHET - BIR MCHARGUA - ZAGHOUAN',
  address_line2: 'RUE SIDI BOUCHOUCHA - MANOUBA',
  city: 'Bir Mchargua - Zaghouan',
  country: 'Tunisie',
  phone: '28 057 771 / 29256084',
  email: 'solution.accessenergy@gmail.com',
  website: 'www.access-energy.tn',
  matricule_fiscal: '1954656YAM000',
  registre_commerce: '1954656YAM000',
  identifiant_unique: '1954656YAM000',
  rib: '08 014 0001234567890 42 (BIAT Bir Mchargua)',
  bank_name: 'BIAT',
  default_tva: 19,
  timbre_fiscal: 1.0,
  currency_symbol: 'TND',
  devis_prefix: 'Devis-',
  bl_prefix: 'BL-',
  facture_prefix: 'Facture-',
  next_devis_number: 101,
  next_bl_number: 101,
  next_facture_number: 101,
  default_conditions:
    'Paiement : 50% à la commande, 50% à la livraison et mise en service. Garantie matériel 5 ans constructeur.',
  footer_text: 'Merci pour votre confiance.',
};

function emptyBootstrap(): BootstrapData {
  return {
    company: defaultCompany,
    metrics: {} as DashboardMetrics,
    clients: [],
    products: [],
    documents: [],
    payments: [],
    auditLogs: [],
    reports: {} as FinancialReport,
  };
}

export function computeFinancialReport(
  factures: CommercialDocument[],
  payments: Payment[]
): FinancialReport {
  let total_ca_ht = 0;
  let total_tva = 0;
  let total_timbre = 0;
  let total_ttc = 0;
  const tvaMap: { [rate: number]: { base: number; amount: number } } = {
    19: { base: 0, amount: 0 },
    7: { base: 0, amount: 0 },
    13: { base: 0, amount: 0 },
    0: { base: 0, amount: 0 },
  };

  const clientTurnover: { [id: string]: { name: string; count: number; total: number } } = {};

  factures.forEach((f) => {
    total_ca_ht += f.totals?.subtotal_net_ht || 0;
    total_tva += f.totals?.total_tva || 0;
    total_timbre += f.totals?.timbre_fiscal || 0;
    total_ttc += f.totals?.total_ttc || 0;

    f.totals?.tva_details?.forEach((td) => {
      if (!tvaMap[td.rate]) {
        tvaMap[td.rate] = { base: 0, amount: 0 };
      }
      tvaMap[td.rate].base += td.base_ht;
      tvaMap[td.rate].amount += td.amount_tva;
    });

    const cId = f.client_id;
    const cName = f.client_snapshot?.company_name || f.client_snapshot?.name || 'Client';
    if (!clientTurnover[cId]) {
      clientTurnover[cId] = { name: cName, count: 0, total: 0 };
    }
    clientTurnover[cId].count += 1;
    clientTurnover[cId].total += f.totals?.total_ttc || 0;
  });

  const total_encaisse = payments.reduce((acc, p) => acc + p.amount, 0);
  const total_solde_du = Math.max(0, total_ttc - total_encaisse);

  const paymentMethodsMap: { [m: string]: { count: number; amount: number } } = {};
  payments.forEach((p) => {
    if (!paymentMethodsMap[p.method]) {
      paymentMethodsMap[p.method] = { count: 0, amount: 0 };
    }
    paymentMethodsMap[p.method].count += 1;
    paymentMethodsMap[p.method].amount += p.amount;
  });

  const top_clients = Object.entries(clientTurnover)
    .map(([id, data]) => ({
      client_id: id,
      client_name: data.name,
      total_ttc: data.total,
      invoices_count: data.count,
    }))
    .sort((a, b) => b.total_ttc - a.total_ttc);

  const payments_by_method = Object.entries(paymentMethodsMap).map(([method, val]) => ({
    method,
    count: val.count,
    amount: val.amount,
  }));

  const tva_by_rate = Object.entries(tvaMap)
    .map(([rate, val]) => ({
      rate: Number(rate),
      base: val.base,
      amount: val.amount,
    }))
    .filter((r) => r.base > 0 || r.rate === 19 || r.rate === 7);

  return {
    total_ca_ht,
    total_tva,
    total_timbre,
    total_ttc,
    total_encaisse,
    total_solde_du,
    tva_by_rate,
    top_clients,
    payments_by_method,
  };
}

// ---------------------------------------------------------------------------
// Low-level network helpers
// ---------------------------------------------------------------------------

export class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Resilient fetch helper with automatic retries for transient connection drops / server reboots
async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = 3,
  delayMs = 600
): Promise<Response> {
  try {
    const res = await fetch(url, options);
    if (!res.ok && retries > 0 && res.status >= 500) {
      await new Promise((r) => setTimeout(r, delayMs));
      return fetchWithRetry(url, options, retries - 1, delayMs * 1.5);
    }
    return res;
  } catch (err: any) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
      return fetchWithRetry(url, options, retries - 1, delayMs * 1.5);
    }
    throw err;
  }
}

/** True when the failure looks like "we couldn't reach the server at all"
 * (real connectivity loss), as opposed to a legitimate validation/server error
 * the user should see. Used to decide whether to fall back to offline mode. */
function isNetworkFailure(err: any): boolean {
  if (!navigator.onLine) return true;
  if (err instanceof TypeError) return true; // fetch() itself throws TypeError on network failure
  if (typeof err?.message === 'string' && /fetch|network|NetworkError/i.test(err.message)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Offline snapshot cache (IndexedDB) — mirrors the last known bootstrap data
// and is updated on every successful read and every offline-queued mutation.
// ---------------------------------------------------------------------------

async function readCache(): Promise<BootstrapData> {
  const cached = await getSnapshot<BootstrapData>();
  return cached || emptyBootstrap();
}

async function writeCache(data: BootstrapData): Promise<void> {
  await setSnapshot(data);
}

function findDocIndex(cache: BootstrapData, id: string): number {
  return cache.documents.findIndex((d) => d.id === id);
}

// ---------------------------------------------------------------------------
// Raw network calls — used both by the public resilient `api` and by the
// offline sync executor to replay queued mutations. These never fall back to
// local storage themselves: a failure here is a real failure the caller
// (resilientMutate, or the sync manager's retry loop) must handle.
// ---------------------------------------------------------------------------

export const rawApi = {
  getBootstrap: async (): Promise<BootstrapData> => {
    const res = await fetchWithRetry('/api/bootstrap', undefined, 3, 600);
    if (!res.ok) throw new HttpError('Impossible de charger les données ERP', res.status);
    const data = await res.json();
    const factures = (data.documents || []).filter(
      (d: CommercialDocument) => d.type === 'facture' || d.type === 'avoir'
    );
    const reports = computeFinancialReport(factures, data.payments || []);
    return {
      company: data.company || defaultCompany,
      metrics: data.metrics,
      clients: data.clients || [],
      products: data.products || [],
      documents: data.documents || [],
      payments: data.payments || [],
      auditLogs: data.auditLogs || [],
      reports,
    };
  },

  getCompany: async (): Promise<CompanySettings> => {
    const res = await fetchWithRetry('/api/company');
    if (!res.ok) throw new HttpError("Impossible de charger les paramètres d'entreprise", res.status);
    return res.json();
  },
  updateCompany: async (data: Partial<CompanySettings>): Promise<CompanySettings> => {
    const res = await fetchWithRetry('/api/company', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new HttpError('Échec de mise à jour des paramètres', res.status);
    return res.json();
  },

  getNextNumber: async (type: 'devis' | 'bl' | 'facture'): Promise<string> => {
    const res = await fetchWithRetry(`/api/next-number/${type}`);
    if (!res.ok) throw new HttpError('Échec de génération du numéro', res.status);
    const data = await res.json();
    return data.number;
  },

  // Clients
  getClients: async (): Promise<Client[]> => {
    const res = await fetchWithRetry('/api/clients');
    if (!res.ok) throw new HttpError('Impossible de charger les clients', res.status);
    return res.json();
  },
  createClient: async (client: Partial<Client>): Promise<Client> => {
    const res = await fetchWithRetry('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(client),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new HttpError(err.error || 'Échec de création du client', res.status);
    }
    return res.json();
  },
  updateClient: async (id: string, client: Partial<Client>): Promise<Client> => {
    const res = await fetchWithRetry(`/api/clients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(client),
    });
    if (!res.ok) throw new HttpError('Échec de mise à jour du client', res.status);
    return res.json();
  },
  deleteClient: async (id: string): Promise<void> => {
    const res = await fetchWithRetry(`/api/clients/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new HttpError('Échec de suppression du client', res.status);
  },

  // Products
  getProducts: async (): Promise<Product[]> => {
    const res = await fetchWithRetry('/api/products');
    if (!res.ok) throw new HttpError('Impossible de charger les produits', res.status);
    return res.json();
  },
  createProduct: async (product: Partial<Product>): Promise<Product> => {
    const res = await fetchWithRetry('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new HttpError(err.error || 'Échec de création du produit', res.status);
    }
    return res.json();
  },
  updateProduct: async (id: string, product: Partial<Product>): Promise<Product> => {
    const res = await fetchWithRetry(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    if (!res.ok) throw new HttpError('Échec de modification du produit', res.status);
    return res.json();
  },
  deleteProduct: async (id: string): Promise<void> => {
    const res = await fetchWithRetry(`/api/products/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new HttpError('Échec de suppression du produit', res.status);
  },

  // Devis
  getDevis: async (): Promise<CommercialDocument[]> => {
    const res = await fetchWithRetry('/api/devis');
    if (!res.ok) throw new HttpError('Impossible de charger les devis', res.status);
    return res.json();
  },
  createDevis: async (doc: Partial<CommercialDocument>): Promise<CommercialDocument> => {
    const res = await fetchWithRetry('/api/devis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    });
    if (!res.ok) throw new HttpError('Échec de création du devis', res.status);
    return res.json();
  },
  updateDevis: async (id: string, doc: Partial<CommercialDocument>): Promise<CommercialDocument> => {
    const res = await fetchWithRetry(`/api/devis/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    });
    if (!res.ok) throw new HttpError('Échec de mise à jour du devis', res.status);
    return res.json();
  },
  deleteDevis: async (id: string): Promise<void> => {
    const res = await fetchWithRetry(`/api/devis/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new HttpError('Échec de suppression du devis', res.status);
  },
  convertDevisToBL: async (id: string): Promise<CommercialDocument> => {
    const res = await fetchWithRetry(`/api/devis/${id}/convert-bl`, { method: 'POST' });
    if (!res.ok) throw new HttpError('Échec de conversion du devis en Bon de Livraison', res.status);
    return res.json();
  },
  convertDevisToFacture: async (id: string): Promise<CommercialDocument> => {
    const res = await fetchWithRetry(`/api/devis/${id}/convert-facture`, { method: 'POST' });
    if (!res.ok) throw new HttpError('Échec de conversion du devis en Facture', res.status);
    return res.json();
  },

  // BL
  getBL: async (): Promise<CommercialDocument[]> => {
    const res = await fetchWithRetry('/api/bl');
    if (!res.ok) throw new HttpError('Impossible de charger les bons de livraison', res.status);
    return res.json();
  },
  createBL: async (doc: Partial<CommercialDocument>): Promise<CommercialDocument> => {
    const res = await fetchWithRetry('/api/bl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    });
    if (!res.ok) throw new HttpError('Échec de création du bon de livraison', res.status);
    return res.json();
  },
  updateBL: async (id: string, doc: Partial<CommercialDocument>): Promise<CommercialDocument> => {
    const res = await fetchWithRetry(`/api/bl/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    });
    if (!res.ok) throw new HttpError('Échec de modification du bon de livraison', res.status);
    return res.json();
  },
  deleteBL: async (id: string): Promise<void> => {
    const res = await fetchWithRetry(`/api/bl/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new HttpError('Échec de suppression du bon de livraison', res.status);
  },
  convertBLToFacture: async (id: string): Promise<CommercialDocument> => {
    const res = await fetchWithRetry(`/api/bl/${id}/convert-facture`, { method: 'POST' });
    if (!res.ok) throw new HttpError('Échec de conversion du bon de livraison en Facture', res.status);
    return res.json();
  },

  // Factures
  getFactures: async (): Promise<CommercialDocument[]> => {
    const res = await fetchWithRetry('/api/factures');
    if (!res.ok) throw new HttpError('Impossible de charger les factures', res.status);
    return res.json();
  },
  createFacture: async (doc: Partial<CommercialDocument>): Promise<CommercialDocument> => {
    const res = await fetchWithRetry('/api/factures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    });
    if (!res.ok) throw new HttpError('Échec de création de la facture', res.status);
    return res.json();
  },
  updateFacture: async (id: string, doc: Partial<CommercialDocument>): Promise<CommercialDocument> => {
    const res = await fetchWithRetry(`/api/factures/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    });
    if (!res.ok) throw new HttpError('Échec de mise à jour de la facture', res.status);
    return res.json();
  },
  deleteFacture: async (id: string): Promise<void> => {
    const res = await fetchWithRetry(`/api/factures/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new HttpError('Échec de suppression de la facture', res.status);
  },

  // Payments
  getPayments: async (): Promise<Payment[]> => {
    const res = await fetchWithRetry('/api/payments');
    if (!res.ok) throw new HttpError('Impossible de charger les règlements', res.status);
    return res.json();
  },
  createPayment: async (payment: any): Promise<{ payment: Payment; invoice: CommercialDocument }> => {
    const res = await fetchWithRetry('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payment),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new HttpError(err.error || "Échec de l'enregistrement du règlement", res.status);
    }
    return res.json();
  },
  deletePayment: async (id: string): Promise<void> => {
    const res = await fetchWithRetry(`/api/payments/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new HttpError('Échec de suppression du règlement', res.status);
  },

  getAuditLogs: async (): Promise<AuditLog[]> => {
    const res = await fetchWithRetry('/api/audit');
    if (!res.ok) throw new HttpError("Impossible de charger l'historique d'audit", res.status);
    return res.json();
  },

  resetSeed: async (): Promise<void> => {
    const res = await fetchWithRetry('/api/reset-seed', { method: 'POST' });
    if (!res.ok) throw new HttpError('Échec de réinitialisation', res.status);
  },
};

// ---------------------------------------------------------------------------
// Resilient mutation wrapper: try the network first; if (and only if) the
// failure looks like a real connectivity problem, apply the change straight
// to the local cache and queue it for the sync manager to replay later.
// Legitimate validation/server errors (4xx business errors) are NOT
// swallowed — they still throw so the UI shows the real message.
// ---------------------------------------------------------------------------

async function resilientMutate<T>(opts: {
  attempt: () => Promise<T>;
  entity: MutationEntity;
  operation: MutationOperation;
  entityId: string;
  payload: any;
  applyLocally: (cache: BootstrapData) => T;
}): Promise<T> {
  if (navigator.onLine) {
    try {
      const result = await opts.attempt();
      return result;
    } catch (err: any) {
      if (!isNetworkFailure(err)) {
        throw err;
      }
      // fall through to offline handling below
    }
  }

  const cache = await readCache();
  const result = opts.applyLocally(cache);
  await writeCache(cache);
  await queueMutation(opts.entity, opts.operation, opts.entityId, opts.payload);
  return result;
}

function stubTimestamps() {
  const now = new Date().toISOString();
  return { created_at: now, updated_at: now };
}

// ---------------------------------------------------------------------------
// Public, offline-resilient API used by the UI
// ---------------------------------------------------------------------------

export const api = {
  // Bootstrap: try network, fall back to the IndexedDB snapshot when offline.
  getBootstrap: async (): Promise<BootstrapData> => {
    try {
      const data = await rawApi.getBootstrap();
      await writeCache(data);
      return data;
    } catch (err) {
      const cached = await getSnapshot<BootstrapData>();
      if (cached && cached.company) {
        console.warn('Hors ligne : données chargées depuis le cache local.', err);
        return cached;
      }
      throw err;
    }
  },

  // Company
  getCompany: rawApi.getCompany,
  updateCompany: (data: Partial<CompanySettings>) =>
    resilientMutate({
      attempt: () => rawApi.updateCompany(data),
      entity: 'company',
      operation: 'update',
      entityId: 'company-main',
      payload: data,
      applyLocally: (cache) => {
        cache.company = { ...cache.company, ...data } as CompanySettings;
        return cache.company;
      },
    }),

  // Next Number
  getNextNumber: rawApi.getNextNumber,

  // Unified Documents
  getDocuments: async (): Promise<CommercialDocument[]> => {
    const [devis, bl, factures] = await Promise.all([api.getDevis(), api.getBL(), api.getFactures()]);
    return [...devis, ...bl, ...factures];
  },

  createDocument: (doc: Partial<CommercialDocument>): Promise<CommercialDocument> => {
    if (doc.type === 'devis') return api.createDevis(doc);
    if (doc.type === 'bon_livraison' || doc.type === 'bl') return api.createBL(doc);
    return api.createFacture(doc);
  },

  updateDocument: (id: string, doc: Partial<CommercialDocument>): Promise<CommercialDocument> => {
    if (doc.type === 'devis') return api.updateDevis(id, doc);
    if (doc.type === 'bon_livraison' || doc.type === 'bl') return api.updateBL(id, doc);
    return api.updateFacture(id, doc);
  },

  deleteDocument: async (id: string): Promise<void> => {
    try {
      await api.deleteDevis(id);
      return;
    } catch {
      // not a devis
    }
    try {
      await api.deleteBL(id);
      return;
    } catch {
      // not a bl
    }
    await api.deleteFacture(id);
  },

  // Clients
  getClients: rawApi.getClients,
  createClient: (client: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client> => {
    const id = generateStableId('cli');
    return resilientMutate({
      attempt: () => rawApi.createClient({ ...client, id }),
      entity: 'client',
      operation: 'create',
      entityId: id,
      payload: { ...client, id },
      applyLocally: (cache) => {
        const newClient: Client = { ...client, id, ...stubTimestamps() } as Client;
        cache.clients = [newClient, ...cache.clients];
        return newClient;
      },
    });
  },
  updateClient: (id: string, client: Partial<Client>): Promise<Client> =>
    resilientMutate({
      attempt: () => rawApi.updateClient(id, client),
      entity: 'client',
      operation: 'update',
      entityId: id,
      payload: client,
      applyLocally: (cache) => {
        const idx = cache.clients.findIndex((c) => c.id === id);
        const updated: Client = {
          ...(idx >= 0 ? cache.clients[idx] : ({ id } as Client)),
          ...client,
          updated_at: new Date().toISOString(),
        };
        if (idx >= 0) cache.clients[idx] = updated;
        else cache.clients.unshift(updated);
        return updated;
      },
    }),
  deleteClient: (id: string): Promise<void> =>
    resilientMutate({
      attempt: () => rawApi.deleteClient(id),
      entity: 'client',
      operation: 'delete',
      entityId: id,
      payload: {},
      applyLocally: (cache) => {
        cache.clients = cache.clients.filter((c) => c.id !== id);
      },
    }),

  // Products
  getProducts: rawApi.getProducts,
  createProduct: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> => {
    const id = generateStableId('prd');
    return resilientMutate({
      attempt: () => rawApi.createProduct({ ...product, id }),
      entity: 'product',
      operation: 'create',
      entityId: id,
      payload: { ...product, id },
      applyLocally: (cache) => {
        const newProduct: Product = { ...product, id, ...stubTimestamps() } as Product;
        cache.products = [newProduct, ...cache.products];
        return newProduct;
      },
    });
  },
  updateProduct: (id: string, product: Partial<Product>): Promise<Product> =>
    resilientMutate({
      attempt: () => rawApi.updateProduct(id, product),
      entity: 'product',
      operation: 'update',
      entityId: id,
      payload: product,
      applyLocally: (cache) => {
        const idx = cache.products.findIndex((p) => p.id === id);
        const updated: Product = {
          ...(idx >= 0 ? cache.products[idx] : ({ id } as Product)),
          ...product,
          updated_at: new Date().toISOString(),
        };
        if (idx >= 0) cache.products[idx] = updated;
        else cache.products.unshift(updated);
        return updated;
      },
    }),
  deleteProduct: (id: string): Promise<void> =>
    resilientMutate({
      attempt: () => rawApi.deleteProduct(id),
      entity: 'product',
      operation: 'delete',
      entityId: id,
      payload: {},
      applyLocally: (cache) => {
        const idx = cache.products.findIndex((p) => p.id === id);
        if (idx >= 0) cache.products[idx] = { ...cache.products[idx], active: false };
      },
    }),

  // Devis
  getDevis: rawApi.getDevis,
  getDevisById: async (id: string): Promise<CommercialDocument> => {
    const res = await fetch(`/api/devis/${id}`);
    if (!res.ok) throw new HttpError('Devis introuvable', res.status);
    return res.json();
  },
  createDevis: (doc: Partial<CommercialDocument>): Promise<CommercialDocument> => {
    const id = doc.id || generateStableId('dev');
    const payload = { ...doc, id };
    return resilientMutate({
      attempt: () => rawApi.createDevis(payload),
      entity: 'devis',
      operation: 'create',
      entityId: id,
      payload,
      applyLocally: (cache) => {
        const newDoc = buildOfflineDocument(payload, id, 'devis', cache);
        cache.documents = [newDoc, ...cache.documents];
        return newDoc;
      },
    });
  },
  updateDevis: (id: string, doc: Partial<CommercialDocument>): Promise<CommercialDocument> =>
    resilientMutate({
      attempt: () => rawApi.updateDevis(id, doc),
      entity: 'devis',
      operation: 'update',
      entityId: id,
      payload: doc,
      applyLocally: (cache) => updateOfflineDocument(cache, id, doc),
    }),
  deleteDevis: (id: string): Promise<void> =>
    resilientMutate({
      attempt: () => rawApi.deleteDevis(id),
      entity: 'devis',
      operation: 'delete',
      entityId: id,
      payload: {},
      applyLocally: (cache) => {
        cache.documents = cache.documents.filter((d) => d.id !== id);
      },
    }),
  convertDevisToBL: rawApi.convertDevisToBL,
  convertDevisToFacture: rawApi.convertDevisToFacture,

  // BL
  getBL: rawApi.getBL,
  getBLById: async (id: string): Promise<CommercialDocument> => {
    const res = await fetch(`/api/bl/${id}`);
    if (!res.ok) throw new HttpError('Bon de livraison introuvable', res.status);
    return res.json();
  },
  createBL: (doc: Partial<CommercialDocument>): Promise<CommercialDocument> => {
    const id = doc.id || generateStableId('bl');
    const payload = { ...doc, id };
    return resilientMutate({
      attempt: () => rawApi.createBL(payload),
      entity: 'bl',
      operation: 'create',
      entityId: id,
      payload,
      applyLocally: (cache) => {
        const newDoc = buildOfflineDocument(payload, id, 'bon_livraison', cache);
        cache.documents = [newDoc, ...cache.documents];
        return newDoc;
      },
    });
  },
  updateBL: (id: string, doc: Partial<CommercialDocument>): Promise<CommercialDocument> =>
    resilientMutate({
      attempt: () => rawApi.updateBL(id, doc),
      entity: 'bl',
      operation: 'update',
      entityId: id,
      payload: doc,
      applyLocally: (cache) => updateOfflineDocument(cache, id, doc),
    }),
  deleteBL: (id: string): Promise<void> =>
    resilientMutate({
      attempt: () => rawApi.deleteBL(id),
      entity: 'bl',
      operation: 'delete',
      entityId: id,
      payload: {},
      applyLocally: (cache) => {
        cache.documents = cache.documents.filter((d) => d.id !== id);
      },
    }),
  convertBLToFacture: rawApi.convertBLToFacture,

  // Factures
  getFactures: rawApi.getFactures,
  getFactureById: async (id: string): Promise<CommercialDocument> => {
    const res = await fetch(`/api/factures/${id}`);
    if (!res.ok) throw new HttpError('Facture introuvable', res.status);
    return res.json();
  },
  createFacture: (doc: Partial<CommercialDocument>): Promise<CommercialDocument> => {
    const id = doc.id || generateStableId('fa');
    const payload = { ...doc, id };
    return resilientMutate({
      attempt: () => rawApi.createFacture(payload),
      entity: 'facture',
      operation: 'create',
      entityId: id,
      payload,
      applyLocally: (cache) => {
        const newDoc = buildOfflineDocument(payload, id, 'facture', cache);
        cache.documents = [newDoc, ...cache.documents];
        return newDoc;
      },
    });
  },
  updateFacture: (id: string, doc: Partial<CommercialDocument>): Promise<CommercialDocument> =>
    resilientMutate({
      attempt: () => rawApi.updateFacture(id, doc),
      entity: 'facture',
      operation: 'update',
      entityId: id,
      payload: doc,
      applyLocally: (cache) => updateOfflineDocument(cache, id, doc),
    }),
  deleteFacture: (id: string): Promise<void> =>
    resilientMutate({
      attempt: () => rawApi.deleteFacture(id),
      entity: 'facture',
      operation: 'delete',
      entityId: id,
      payload: {},
      applyLocally: (cache) => {
        cache.documents = cache.documents.filter((d) => d.id !== id);
      },
    }),

  // Payments
  getPayments: rawApi.getPayments,
  createPayment: (payment: {
    invoice_id: string;
    amount: number;
    method: string;
    reference?: string;
    bank?: string;
    date?: string;
    notes?: string;
  }): Promise<{ payment: Payment; invoice: CommercialDocument }> => {
    const id = generateStableId('pay');
    const payload = { ...payment, id };
    return resilientMutate({
      attempt: () => rawApi.createPayment(payload),
      entity: 'payment',
      operation: 'create',
      entityId: id,
      payload,
      applyLocally: (cache) => {
        const invIdx = cache.documents.findIndex((d) => d.id === payment.invoice_id);
        const invoice = invIdx >= 0 ? cache.documents[invIdx] : undefined;
        const newPayment: Payment = {
          id,
          invoice_id: payment.invoice_id,
          invoice_number: invoice?.number || '',
          client_id: invoice?.client_id || '',
          client_name: invoice?.client_snapshot?.name || '',
          date: payment.date || new Date().toISOString().split('T')[0],
          amount: Number(payment.amount) || 0,
          method: payment.method as any,
          reference: payment.reference,
          bank: payment.bank,
          notes: payment.notes,
          created_at: new Date().toISOString(),
        };
        cache.payments = [newPayment, ...cache.payments];

        if (invoice) {
          const currentPaid = (invoice.amount_paid || 0) + newPayment.amount;
          const totalTTC = invoice.totals?.total_ttc || 0;
          const remaining = Math.max(0, totalTTC - currentPaid);
          const updatedInvoice: CommercialDocument = {
            ...invoice,
            amount_paid: Math.round(currentPaid * 1000) / 1000,
            amount_remaining: Math.round(remaining * 1000) / 1000,
            status: currentPaid >= totalTTC - 0.001 ? 'payee' : 'partiellement_payee',
            payment_method: newPayment.method,
            payment_reference: newPayment.reference,
            payment_date: newPayment.date,
            updated_at: new Date().toISOString(),
          };
          cache.documents[invIdx] = updatedInvoice;
          return { payment: newPayment, invoice: updatedInvoice };
        }
        return { payment: newPayment, invoice: {} as CommercialDocument };
      },
    });
  },
  deletePayment: (id: string): Promise<void> =>
    resilientMutate({
      attempt: () => rawApi.deletePayment(id),
      entity: 'payment',
      operation: 'delete',
      entityId: id,
      payload: {},
      applyLocally: (cache) => {
        cache.payments = cache.payments.filter((p) => p.id !== id);
      },
    }),

  // Reports & Metrics
  getMetrics: async (): Promise<DashboardMetrics> => {
    const res = await fetchWithRetry('/api/reports');
    if (!res.ok) throw new HttpError('Impossible de charger les métriques', res.status);
    return res.json();
  },

  getReports: async (): Promise<FinancialReport> => {
    const [factures, payments] = await Promise.all([rawApi.getFactures(), rawApi.getPayments()]);
    return computeFinancialReport(factures, payments);
  },

  // Audit
  getAuditLogs: rawApi.getAuditLogs,

  // Reset to Seed
  resetSeed: rawApi.resetSeed,
  resetSeedData: (): Promise<void> => api.resetSeed(),
};

function buildOfflineDocument(
  payload: Partial<CommercialDocument>,
  id: string,
  type: CommercialDocument['type'],
  cache: BootstrapData
): CommercialDocument {
  const client = cache.clients.find((c) => c.id === payload.client_id);
  const now = new Date().toISOString();
  return {
    id,
    type,
    number: payload.number || `${type.toUpperCase()}-HORS-LIGNE-${Date.now()}`,
    client_id: payload.client_id || '',
    client_snapshot:
      payload.client_snapshot ||
      (client
        ? {
            name: client.name,
            company_name: client.company_name,
            address: client.address,
            city: client.city,
            phone: client.phone,
            email: client.email,
          }
        : { name: 'Client', address: '', city: '', phone: '', email: '' }),
    date: payload.date || now.split('T')[0],
    status: payload.status || 'brouillon',
    lines: payload.lines || [],
    totals: payload.totals || {
      subtotal_brut_ht: 0,
      total_remise: 0,
      subtotal_net_ht: 0,
      tva_details: [],
      total_tva: 0,
      timbre_fiscal: 0,
      total_ttc: 0,
    },
    notes: payload.notes,
    conditions: payload.conditions,
    created_at: now,
    updated_at: now,
    ...payload,
  } as CommercialDocument;
}

function updateOfflineDocument(
  cache: BootstrapData,
  id: string,
  doc: Partial<CommercialDocument>
): CommercialDocument {
  const idx = cache.documents.findIndex((d) => d.id === id);
  const base = idx >= 0 ? cache.documents[idx] : ({ id } as CommercialDocument);
  const updated: CommercialDocument = { ...base, ...doc, updated_at: new Date().toISOString() };
  if (idx >= 0) cache.documents[idx] = updated;
  else cache.documents.unshift(updated);
  return updated;
}


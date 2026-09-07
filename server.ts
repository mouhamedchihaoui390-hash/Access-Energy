import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db';
import { calculateDocumentTotals } from './src/utils/calculations';

async function startServer() {
  // Load persisted data (from Supabase if configured, otherwise local file) before accepting requests
  await db.init();

  const app = express();
  const PORT = 3000;

  // JSON Body Parser
  app.use(express.json());

  // Delay the response of mutating /api requests until the most recent write
  // has been confirmed against Supabase (or immediately if Supabase isn't
  // configured). This avoids a pure fire-and-forget write: the client only
  // gets its "created/updated" confirmation once the data is actually durable.
  app.use('/api', (req, res, next) => {
    if (req.method === 'GET') return next();
    const originalJson = res.json.bind(res);
    res.json = ((body: any) => {
      db.waitForLastSync().finally(() => {
        originalJson(body);
      });
      return res;
    }) as typeof res.json;
    next();
  });

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // --- Passcode Authentication API ---
  app.post('/api/auth/verify-passcode', (req, res) => {
    try {
      const { passcode } = req.body;
      const expectedPasscode = process.env.APP_PASSCODE || '52523200';
      if (passcode && passcode.trim() === expectedPasscode) {
        return res.json({
          success: true,
          token: `access_energy_session_${Date.now()}`,
          message: 'Session authentifiée avec succès',
        });
      }
      return res.status(401).json({ error: 'Code d\'accès incorrect. Veuillez vérifier et réessayer.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Full Bootstrap API (Single atomic query for instant load) ---
  app.get('/api/bootstrap', (req, res) => {
    try {
      const devis = db.getDevis();
      const bl = db.getBL();
      const factures = db.getFactures();
      const clients = db.getClients();
      const products = db.getProducts();
      const company = db.getCompany();
      const payments = db.getPayments();
      const metrics = db.getDashboardMetrics();
      const auditLogs = db.getAuditLogs();

      res.json({
        company,
        metrics,
        clients,
        products,
        documents: [...devis, ...bl, ...factures],
        payments,
        auditLogs,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Company Settings API ---
  app.get('/api/company', (req, res) => {
    try {
      const company = db.getCompany();
      res.json(company);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/company', (req, res) => {
    try {
      const updated = db.updateCompany(req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Next Document Number Generator
  app.get('/api/next-number/:type', (req, res) => {
    try {
      const type = req.params.type as 'devis' | 'bl' | 'facture';
      if (!['devis', 'bl', 'facture'].includes(type)) {
        return res.status(400).json({ error: 'Type invalide' });
      }
      const num = db.generateNextNumber(type);
      res.json({ number: num });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Clients API ---
  app.get('/api/clients', (req, res) => {
    try {
      const clients = db.getClients();
      res.json(clients);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/clients', (req, res) => {
    try {
      const { name, client_type, address, city, phone, email } = req.body;
      if (!name || !phone) {
        return res.status(400).json({ error: 'Le nom et le numéro de téléphone sont requis.' });
      }
      const created = db.createClient({
        id: req.body.id,
        name,
        client_type: client_type || 'entreprise',
        company_name: req.body.company_name || '',
        matricule_fiscal: req.body.matricule_fiscal || '',
        registre_commerce: req.body.registre_commerce || '',
        cin: req.body.cin || '',
        address: address || '',
        city: city || 'Tunis',
        governorate: req.body.governorate || 'Tunis',
        postal_code: req.body.postal_code || '',
        phone,
        email: email || '',
        notes: req.body.notes || '',
        status: req.body.status || 'actif',
      });
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/clients/:id', (req, res) => {
    try {
      const updated = db.updateClient(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Client introuvable' });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/clients/:id', (req, res) => {
    try {
      const success = db.deleteClient(req.params.id);
      if (!success) return res.status(404).json({ error: 'Client introuvable' });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Products API ---
  app.get('/api/products', (req, res) => {
    try {
      const products = db.getProducts();
      res.json(products);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/products', (req, res) => {
    try {
      const { reference, designation, sale_price_ht, tva, unit, category } = req.body;
      if (!reference || !designation || sale_price_ht === undefined) {
        return res.status(400).json({ error: 'Référence, désignation et prix unitaire HT sont obligatoires.' });
      }
      const created = db.createProduct({
        id: req.body.id,
        reference,
        designation,
        description: req.body.description || '',
        category: category || 'Matériel Solaire',
        unit: unit || 'Unité',
        purchase_price_ht: req.body.purchase_price_ht ? Number(req.body.purchase_price_ht) : 0,
        sale_price_ht: Number(sale_price_ht),
        tva: tva !== undefined ? Number(tva) : 19,
        stock: req.body.stock !== undefined ? Number(req.body.stock) : 0,
        active: req.body.active !== undefined ? Boolean(req.body.active) : true,
      });
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/products/:id', (req, res) => {
    try {
      const updated = db.updateProduct(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Produit introuvable' });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/products/:id', (req, res) => {
    try {
      const success = db.deleteProduct(req.params.id);
      if (!success) return res.status(404).json({ error: 'Produit introuvable' });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Devis API ---
  app.get('/api/devis', (req, res) => {
    try {
      const list = db.getDevis();
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/devis/:id', (req, res) => {
    try {
      const dev = db.getDevisById(req.params.id);
      if (!dev) return res.status(404).json({ error: 'Devis introuvable' });
      res.json(dev);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/devis', (req, res) => {
    try {
      const dev = db.createDevis(req.body);
      res.status(201).json(dev);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/devis/:id', (req, res) => {
    try {
      const updated = db.updateDevis(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Devis introuvable' });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/devis/:id', (req, res) => {
    try {
      const success = db.deleteDevis(req.params.id);
      if (!success) return res.status(404).json({ error: 'Devis introuvable' });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Convert Devis -> BL
  app.post('/api/devis/:id/convert-bl', (req, res) => {
    try {
      const bl = db.convertDevisToBL(req.params.id);
      if (!bl) return res.status(404).json({ error: 'Devis introuvable pour conversion' });
      res.json(bl);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Convert Devis -> Facture
  app.post('/api/devis/:id/convert-facture', (req, res) => {
    try {
      const fac = db.convertDevisToFacture(req.params.id);
      if (!fac) return res.status(404).json({ error: 'Devis introuvable pour conversion' });
      res.json(fac);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Bons de Livraison API ---
  app.get('/api/bl', (req, res) => {
    try {
      const list = db.getBL();
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/bl/:id', (req, res) => {
    try {
      const item = db.getBLById(req.params.id);
      if (!item) return res.status(404).json({ error: 'Bon de livraison introuvable' });
      res.json(item);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/bl', (req, res) => {
    try {
      const item = db.createBL(req.body);
      res.status(201).json(item);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/bl/:id', (req, res) => {
    try {
      const updated = db.updateBL(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Bon de livraison introuvable' });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/bl/:id', (req, res) => {
    try {
      const success = db.deleteBL(req.params.id);
      if (!success) return res.status(404).json({ error: 'Bon de livraison introuvable' });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Convert BL -> Facture
  app.post('/api/bl/:id/convert-facture', (req, res) => {
    try {
      const fac = db.convertBLToFacture(req.params.id);
      if (!fac) return res.status(404).json({ error: 'Bon de livraison introuvable pour conversion' });
      res.json(fac);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Factures API ---
  app.get('/api/factures', (req, res) => {
    try {
      const list = db.getFactures();
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/factures/:id', (req, res) => {
    try {
      const fac = db.getFactureById(req.params.id);
      if (!fac) return res.status(404).json({ error: 'Facture introuvable' });
      res.json(fac);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/factures', (req, res) => {
    try {
      const fac = db.createFacture(req.body);
      res.status(201).json(fac);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/factures/:id', (req, res) => {
    try {
      const updated = db.updateFacture(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Facture introuvable' });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/factures/:id', (req, res) => {
    try {
      const success = db.deleteFacture(req.params.id);
      if (!success) return res.status(404).json({ error: 'Facture introuvable' });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Payments API ---
  app.get('/api/payments', (req, res) => {
    try {
      const payments = db.getPayments();
      res.json(payments);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/payments', (req, res) => {
    try {
      const { invoice_id, amount, method, reference, date, notes, bank } = req.body;
      if (!invoice_id || !amount || !method) {
        return res.status(400).json({ error: 'Facture, montant et mode de règlement sont obligatoires.' });
      }
      const result = db.registerPayment({
        id: req.body.id,
        invoice_id,
        invoice_number: req.body.invoice_number || '',
        client_id: req.body.client_id || '',
        client_name: req.body.client_name || '',
        date: date || new Date().toISOString().split('T')[0],
        amount: Number(amount),
        method,
        reference: reference || '',
        bank: bank || '',
        notes: notes || '',
      });
      if (!result) return res.status(400).json({ error: 'Échec de l\'enregistrement du paiement. Facture introuvable ou montant invalide.' });
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/payments/:id', (req, res) => {
    try {
      const success = db.deletePayment(req.params.id);
      if (!success) return res.status(404).json({ error: 'Paiement introuvable' });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Reports & Dashboard API ---
  app.get('/api/reports', (req, res) => {
    try {
      const metrics = db.getDashboardMetrics();
      res.json(metrics);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Audit Trail API ---
  app.get('/api/audit', (req, res) => {
    try {
      const logs = db.getAuditLogs();
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Reset to Seed Data API
  app.post('/api/reset-seed', (req, res) => {
    try {
      const fresh = db.resetToSeed();
      res.json({ success: true, message: 'Base réinitialisée avec succès', data: fresh });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Vite Middleware or Static Production Serving ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Access ERP Commercial Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

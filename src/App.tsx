import React, { useState, useEffect, useCallback } from 'react';
import {
  CompanySettings,
  Client,
  Product,
  CommercialDocument,
  CommercialDocumentType,
  Payment,
  DashboardMetrics,
  FinancialReport,
  AuditLog,
} from './types';
import { api } from './api';
import { syncManager } from './offline/syncManager';
import { replayMutation } from './offline/executor';
import { Sidebar, ViewTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DocumentPreview } from './components/DocumentPreview';
import { DocumentEditor } from './components/DocumentEditor';
import { PaymentModal } from './components/PaymentModal';
import { ClientModal } from './components/ClientModal';
import { ProductModal } from './components/ProductModal';
import { SyncStatusIndicator } from './components/SyncStatusIndicator';
import { PasscodeScreen } from './components/PasscodeScreen';
import { AlertCircle, RefreshCw } from 'lucide-react';

// Pages
import { DashboardView } from './pages/DashboardView';
import { ClientsView } from './pages/ClientsView';
import { ProductsView } from './pages/ProductsView';
import { DevisView } from './pages/DevisView';
import { BonsLivraisonView } from './pages/BonsLivraisonView';
import { FacturesView } from './pages/FacturesView';
import { PaymentsView } from './pages/PaymentsView';
import { ReportsView } from './pages/ReportsView';
import { SettingsView } from './pages/SettingsView';
import { AuditView } from './pages/AuditView';

export default function App() {
  // Authentication
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('access_energy_auth_token');
  });

  const handleLockSession = () => {
    localStorage.removeItem('access_energy_auth_token');
    setIsAuthenticated(false);
  };

  // Navigation
  const [currentTab, setCurrentTab] = useState<ViewTab>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Core Data
  const [company, setCompany] = useState<CompanySettings>({
    name: 'ACCESS ENERGY',
    tagline: 'Énergies Renouvelables & Solutions Solaires',
    matricule_fiscal: '1954656YAM000',
    registre_commerce: 'B01125482024',
    code_tva: '1954656Y',
    address: 'Zone Industrielle, Route de Zaghouan, Bir Mchargua',
    city: 'Bir Mchargua',
    postal_code: '1141',
    country: 'Tunisie',
    phone: '+216 28 057 771',
    email: 'contact@access-energy.tn',
    website: 'www.access-energy.tn',
    bank_name: 'BIAT Agence Zaghouan',
    bank_rib: '08 045 0001234567890 22',
    timbre_fiscal: 1.0,
    footer_notes:
      'ACCESS ENERGY - SARL au capital de 100 000 DT - R.C : B01125482024 - M.F : 1954656YAM000 - Banque : BIAT Zaghouan',
  });

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [documents, setDocuments] = useState<CommercialDocument[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reports, setReports] = useState<FinancialReport | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Drawers
  const [previewDoc, setPreviewDoc] = useState<CommercialDocument | null>(null);
  const [editorState, setEditorState] = useState<{
    open: boolean;
    docType: CommercialDocumentType;
    document?: CommercialDocument;
  } | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<CommercialDocument | null>(null);
  const [clientModalState, setClientModalState] = useState<{
    open: boolean;
    client?: Client | null;
  } | null>(null);
  const [productModalState, setProductModalState] = useState<{
    open: boolean;
    product?: Product | null;
  } | null>(null);

  // Toast / Notification banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Server Connection & Load Error State
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load all initial data via fast atomic bootstrap
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await api.getBootstrap();

      setCompany(data.company);
      setMetrics(data.metrics);
      setClients(data.clients);
      setProducts(data.products);
      setDocuments(data.documents);
      setPayments(data.payments);
      setReports(data.reports);
      setAuditLogs(data.auditLogs);
    } catch (err: any) {
      console.error('Failed to load ERP data:', err);
      setLoadError(
        err?.message ||
          'Connexion au serveur en cours de synchronisation. Cliquez sur Actualiser.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Start the offline sync manager once: it watches connectivity, replays any
  // queued mutations when back online, and refreshes app data from the server
  // once the queue is confirmed empty (so local optimistic data is replaced
  // by the authoritative server/Supabase state).
  useEffect(() => {
    syncManager.init(replayMutation);
    let prevStatus: string = 'online';
    const unsubscribe = syncManager.subscribe((status) => {
      if (prevStatus === 'syncing' && status === 'online') {
        loadData();
      }
      prevStatus = status;
    });
    return () => {
      unsubscribe();
      syncManager.destroy();
    };
  }, [loadData]);

  // Automatic retry if transient server restart / cold boot occurred
  useEffect(() => {
    let timer: any;
    if (loadError) {
      timer = setTimeout(() => {
        loadData();
      }, 2500);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [loadError, loadData]);

  // Document lists by type
  const devisList = documents.filter((d) => d.type === 'devis');
  const blList = documents.filter((d) => d.type === 'bon_livraison');
  const facturesList = documents.filter((d) => d.type === 'facture' || d.type === 'avoir');

  // Document Actions
  const handleSaveDocument = async (docData: any) => {
    if (editorState?.document?.id) {
      const updated = await api.updateDocument(editorState.document.id, docData);
      showNotification(`Document ${updated.number} mis à jour avec succès.`);
    } else {
      const created = await api.createDocument(docData);
      showNotification(`Document ${created.number} créé avec succès.`);
    }
    setEditorState(null);
    await loadData();
  };

  const handleDeleteDocument = async (id: string) => {
    await api.deleteDocument(id);
    showNotification('Document supprimé.');
    await loadData();
  };

  const handleConvertToBL = async (devisId: string) => {
    try {
      const newBL = await api.convertDevisToBL(devisId);
      showNotification(`Nouveau Bon de Livraison créé : ${newBL.number}`);
      await loadData();
      setCurrentTab('bl');
      setPreviewDoc(newBL);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la conversion en Bon de Livraison');
    }
  };

  const handleConvertDevisToFacture = async (devisId: string) => {
    try {
      const newFacture = await api.convertDevisToFacture(devisId);
      showNotification(`Nouvelle Facture créée : ${newFacture.number}`);
      await loadData();
      setCurrentTab('factures');
      setPreviewDoc(newFacture);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la conversion en Facture');
    }
  };

  const handleConvertBLToFacture = async (blId: string) => {
    try {
      const newFacture = await api.convertBLToFacture(blId);
      showNotification(`Nouvelle Facture générée depuis le BL : ${newFacture.number}`);
      await loadData();
      setCurrentTab('factures');
      setPreviewDoc(newFacture);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la conversion du BL en Facture');
    }
  };

  // Payment Actions
  const handleRecordPayment = async (paymentData: any) => {
    await api.createPayment(paymentData);
    showNotification(`Encaissement de ${paymentData.amount.toFixed(3)} DT enregistré.`);
    await loadData();
  };

  const handleDeletePayment = async (id: string) => {
    await api.deletePayment(id);
    showNotification('Règlement annulé.');
    await loadData();
  };

  // Client Actions
  const handleSaveClient = async (clientData: any) => {
    if (clientModalState?.client?.id) {
      await api.updateClient(clientModalState.client.id, clientData);
      showNotification(`Fiche client mise à jour.`);
    } else {
      await api.createClient(clientData);
      showNotification(`Nouveau client enregistré.`);
    }
    setClientModalState(null);
    await loadData();
  };

  const handleDeleteClient = async (id: string) => {
    await api.deleteClient(id);
    showNotification('Fiche client supprimée.');
    await loadData();
  };

  // Product Actions
  const handleSaveProduct = async (productData: any) => {
    if (productModalState?.product?.id) {
      await api.updateProduct(productModalState.product.id, productData);
      showNotification(`Article mis à jour.`);
    } else {
      await api.createProduct(productData);
      showNotification(`Nouvel article ajouté au catalogue.`);
    }
    setProductModalState(null);
    await loadData();
  };

  const handleDeleteProduct = async (id: string) => {
    await api.deleteProduct(id);
    showNotification('Article retiré du catalogue.');
    await loadData();
  };

  // Company Settings
  const handleSaveCompany = async (updated: CompanySettings) => {
    const res = await api.updateCompany(updated);
    setCompany(res);
    showNotification('Paramètres de l\'entreprise mis à jour.');
    await loadData();
  };

  // Reset Demo Data
  const handleResetSeed = async () => {
    if (
      window.confirm(
        'Voulez-vous réinitialiser le système avec les données de démonstration conformes (Société ACCESS ENERGY, Devis solaire Bir Mchargua, Factures, Règlements) ?'
      )
    ) {
      await api.resetSeedData();
      showNotification('Données initialisées avec succès !');
      await loadData();
    }
  };

  const getActiveTabTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return 'Tableau de bord de gestion';
      case 'clients':
        return 'Gestion des clients & partenaires';
      case 'products':
        return 'Catalogue produits & prestations';
      case 'devis':
        return 'Devis commerciaux';
      case 'bl':
        return 'Bons de livraison (BL)';
      case 'factures':
        return 'Facturation & Avoirs';
      case 'payments':
        return 'Journal des encaissements & règlements';
      case 'reports':
        return 'Rapports financiers & TVA tunisienne';
      case 'settings':
        return 'Configuration de l\'entreprise';
      case 'audit':
        return 'Journal d\'audit & traçabilité';
      default:
        return 'ERP Commercial';
    }
  };

  if (!isAuthenticated) {
    return <PasscodeScreen onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-60 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-2xl border border-teal-500/50 flex items-center gap-2 animate-bounce">
          <span className="h-2 w-2 rounded-full bg-teal-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          company={company}
          isOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          counts={{
            devis: devisList.length,
            bl: blList.length,
            factures: facturesList.length,
            clients: clients.length,
          }}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <div className="fixed bottom-4 right-4 z-40">
            <SyncStatusIndicator />
          </div>
          <Header
            onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            onNewDevis={() => setEditorState({ open: true, docType: 'devis' })}
            onNewFacture={() => setEditorState({ open: true, docType: 'facture' })}
            onNewClient={() => setClientModalState({ open: true, client: null })}
            onResetSeed={handleResetSeed}
            onLockSession={handleLockSession}
            company={company}
            activeTabTitle={getActiveTabTitle()}
          />

          {loadError && (
            <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs sm:text-sm text-amber-900 shadow-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0" />
                <span>{loadError}</span>
              </div>
              <button
                onClick={loadData}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 shrink-0 ml-3"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Actualiser</span>
              </button>
            </div>
          )}

          <main className="p-4 sm:p-6 lg:p-8 flex-1">
            {currentTab === 'dashboard' && (
              <DashboardView
                metrics={metrics}
                company={company}
                onPreviewDoc={setPreviewDoc}
                onOpenNewDevis={() => setEditorState({ open: true, docType: 'devis' })}
                onOpenNewFacture={() => setEditorState({ open: true, docType: 'facture' })}
                onNavigateTab={setCurrentTab}
              />
            )}

            {currentTab === 'clients' && (
              <ClientsView
                clients={clients}
                devisList={devisList}
                facturesList={facturesList}
                onNewClient={() => setClientModalState({ open: true, client: null })}
                onEditClient={(client) => setClientModalState({ open: true, client })}
                onDeleteClient={handleDeleteClient}
                onPreviewDoc={setPreviewDoc}
              />
            )}

            {currentTab === 'products' && (
              <ProductsView
                products={products}
                onNewProduct={() => setProductModalState({ open: true, product: null })}
                onEditProduct={(product) => setProductModalState({ open: true, product })}
                onDeleteProduct={handleDeleteProduct}
              />
            )}

            {currentTab === 'devis' && (
              <DevisView
                devisList={devisList}
                onNewDevis={() => setEditorState({ open: true, docType: 'devis' })}
                onEditDevis={(d) => setEditorState({ open: true, docType: 'devis', document: d })}
                onDeleteDevis={handleDeleteDocument}
                onPreviewDoc={setPreviewDoc}
                onConvertToBL={handleConvertToBL}
                onConvertToFacture={handleConvertDevisToFacture}
              />
            )}

            {currentTab === 'bl' && (
              <BonsLivraisonView
                blList={blList}
                onNewBL={() => setEditorState({ open: true, docType: 'bon_livraison' })}
                onEditBL={(bl) =>
                  setEditorState({ open: true, docType: 'bon_livraison', document: bl })
                }
                onDeleteBL={handleDeleteDocument}
                onPreviewDoc={setPreviewDoc}
                onConvertToFacture={handleConvertBLToFacture}
              />
            )}

            {currentTab === 'factures' && (
              <FacturesView
                facturesList={facturesList}
                onNewFacture={() => setEditorState({ open: true, docType: 'facture' })}
                onEditFacture={(f) =>
                  setEditorState({ open: true, docType: 'facture', document: f })
                }
                onDeleteFacture={handleDeleteDocument}
                onPreviewDoc={setPreviewDoc}
                onOpenPaymentModal={setPaymentInvoice}
              />
            )}

            {currentTab === 'payments' && (
              <PaymentsView payments={payments} onDeletePayment={handleDeletePayment} />
            )}

            {currentTab === 'reports' && (
              <ReportsView report={reports} company={company} />
            )}

            {currentTab === 'settings' && (
              <SettingsView company={company} onSaveCompany={handleSaveCompany} />
            )}

            {currentTab === 'audit' && <AuditView logs={auditLogs} />}
          </main>
        </div>
      </div>

      {/* Document Preview & Print Modal (Exact visual replica of official reference) */}
      {previewDoc && (
        <DocumentPreview
          document={previewDoc}
          company={company}
          onClose={() => setPreviewDoc(null)}
          onEdit={() => {
            const d = previewDoc;
            setPreviewDoc(null);
            setEditorState({ open: true, docType: d.type, document: d });
          }}
          onConvertToBL={
            previewDoc.type === 'devis'
              ? () => handleConvertToBL(previewDoc.id)
              : undefined
          }
          onConvertToFacture={
            previewDoc.type === 'devis'
              ? () => handleConvertDevisToFacture(previewDoc.id)
              : previewDoc.type === 'bon_livraison'
              ? () => handleConvertBLToFacture(previewDoc.id)
              : undefined
          }
          onRecordPayment={
            previewDoc.type === 'facture'
              ? () => setPaymentInvoice(previewDoc)
              : undefined
          }
        />
      )}

      {/* Document Editor Modal */}
      {editorState?.open && (
        <DocumentEditor
          type={editorState.docType}
          initialDocument={editorState.document}
          clients={clients}
          products={products}
          company={company}
          onClose={() => setEditorState(null)}
          onSave={handleSaveDocument}
          onPreview={(doc) => setPreviewDoc(doc)}
          onCreateClient={async (newCli) => {
            const created = await api.createClient(newCli);
            await loadData();
            return created;
          }}
        />
      )}

      {/* Payment Settlement Modal */}
      {paymentInvoice && (
        <PaymentModal
          invoice={paymentInvoice}
          onClose={() => setPaymentInvoice(null)}
          onSubmit={handleRecordPayment}
        />
      )}

      {/* Client Modal */}
      {clientModalState?.open && (
        <ClientModal
          initialClient={clientModalState.client}
          onClose={() => setClientModalState(null)}
          onSave={handleSaveClient}
        />
      )}

      {/* Product Modal */}
      {productModalState?.open && (
        <ProductModal
          initialProduct={productModalState.product}
          onClose={() => setProductModalState(null)}
          onSave={handleSaveProduct}
        />
      )}
    </div>
  );
}

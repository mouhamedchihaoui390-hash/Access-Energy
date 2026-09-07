import React, { useState, useEffect } from 'react';
import {
  CommercialDocument,
  Client,
  Product,
  DocumentLine,
  CompanySettings,
  PaymentMethod,
} from '../types';
import {
  calculateDocumentTotals,
  calculateLineTotals,
  formatTND,
  numberToWordsTunisianTND,
} from '../utils/calculations';
import {
  Plus,
  Trash2,
  Copy,
  Eye,
  Save,
  X,
  UserPlus,
  AlertCircle,
  Building,
  Zap,
  Percent,
} from 'lucide-react';

interface DocumentEditorProps {
  type: 'devis' | 'bl' | 'bon_livraison' | 'facture' | string;
  initialDocument?: CommercialDocument | null;
  clients: Client[];
  products: Product[];
  company: CompanySettings;
  onSave: (doc: Partial<CommercialDocument>) => Promise<void>;
  onClose: () => void;
  onPreview?: (doc: CommercialDocument) => void;
  onCreateClient?: (c: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => Promise<Client>;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  type,
  initialDocument,
  clients,
  products,
  company,
  onSave,
  onClose,
  onPreview,
  onCreateClient,
}) => {
  // Normalize type
  const normalizedType = type === 'bon_livraison' ? 'bl' : type;

  // Client selection
  const [selectedClientId, setSelectedClientId] = useState<string>(
    initialDocument?.client_id || (clients.length > 0 ? clients[0].id : '')
  );
  const [showNewClientModal, setShowNewClientModal] = useState(false);

  // New Client quick form state
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientMF, setNewClientMF] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientCity, setNewClientCity] = useState('Radès');

  // Document fields
  const [docNumber, setDocNumber] = useState(
    initialDocument?.number ||
      (normalizedType === 'devis'
        ? 'Devis-000100'
        : normalizedType === 'bl'
        ? 'BL-000100'
        : 'Facture-000100')
  );
  const [date, setDate] = useState(
    initialDocument?.date || new Date().toISOString().split('T')[0]
  );
  const [validityDate, setValidityDate] = useState(
    initialDocument?.validity_date ||
      new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState(
    initialDocument?.due_date ||
      new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<string>(
    initialDocument?.status ||
      (normalizedType === 'devis' ? 'brouillon' : normalizedType === 'bl' ? 'prepare' : 'emise')
  );

  // Photovoltaic Description
  const [description, setDescription] = useState<string>(
    initialDocument?.description ||
      (normalizedType === 'devis'
        ? 'Générateur photovoltaïque raccordé au réseau STEG de puissance 2.46Kwc.'
        : '')
  );

  // Remise toggle
  const [hasRemise, setHasRemise] = useState<boolean>(
    initialDocument?.has_remise ?? false
  );

  // Payment settings
  const [paymentMode, setPaymentMode] = useState<string>(
    initialDocument?.payment_mode || 'Comptant'
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initialDocument?.payment_method || 'especes'
  );
  const [paymentRef, setPaymentRef] = useState(initialDocument?.payment_reference || '');
  const [paymentDate, setPaymentDate] = useState(initialDocument?.payment_date || date);
  const [notes, setNotes] = useState(initialDocument?.notes || '');
  const [conditions, setConditions] = useState(
    initialDocument?.conditions || company.default_conditions || ''
  );

  // Lines
  const [lines, setLines] = useState<DocumentLine[]>(() => {
    if (initialDocument?.lines?.length) {
      return initialDocument.lines;
    }
    return [
      {
        id: `line-${Date.now()}-1`,
        product_id: '',
        reference: '',
        designation: '',
        quantity: 1,
        unit: 'Pièce',
        unit_price_ht: 0,
        discount_percent: 0,
        tva_percent: 19,
        total_ht: 0,
        total_tva: 0,
        total_ttc: 0,
      },
    ];
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-fetch next number if new document
  useEffect(() => {
    if (!initialDocument) {
      const fetchType = normalizedType === 'bl' ? 'bl' : normalizedType === 'facture' ? 'facture' : 'devis';
      fetch(`/api/next-number/${fetchType}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.number) setDocNumber(data.number);
        })
        .catch(() => {});
    }
  }, [normalizedType, initialDocument]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  // Compute document totals in real time (for Devis, default Timbre Fiscal is 0)
  const isInvoice = normalizedType === 'facture';
  const timbreFiscalValue = isInvoice ? (company.timbre_fiscal ?? 1.000) : 0;
  const totals = calculateDocumentTotals(lines, timbreFiscalValue);
  const arreteSomme =
    initialDocument?.arrete_somme ||
    `Arrêté le présent ${normalizedType === 'devis' ? 'devis' : normalizedType === 'bl' ? 'bon de livraison' : 'facture'} à la somme de : ${numberToWordsTunisianTND(totals.total_ttc)}`;

  // Handle line changes
  const handleLineChange = (
    id: string,
    field: keyof DocumentLine,
    value: string | number
  ) => {
    // Fields that must always be stored as numbers (not raw input strings),
    // otherwise formatTND()/.toFixed() crashes later when previewing/printing.
    const numericFields: (keyof DocumentLine)[] = [
      'quantity',
      'unit_price_ht',
      'discount_percent',
      'tva_percent',
    ];

    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;

        const normalizedValue = numericFields.includes(field)
          ? Number(value) || 0
          : value;

        const updated = { ...line, [field]: normalizedValue };

        // If product chosen from dropdown, auto-fill designation, PU, TVA, Unit
        if (field === 'product_id' && typeof value === 'string') {
          const prd = products.find((p) => p.id === value);
          if (prd) {
            updated.reference = prd.reference;
            updated.designation = prd.designation;
            updated.unit = prd.unit || 'Pièce';
            updated.unit_price_ht = prd.sale_price_ht;
            updated.tva_percent = prd.tva;
          }
        }

        const calcs = calculateLineTotals(
          Number(updated.quantity) || 0,
          Number(updated.unit_price_ht) || 0,
          hasRemise ? Number(updated.discount_percent) || 0 : 0,
          Number(updated.tva_percent) || 0
        );

        updated.total_ht = calcs.total_ht;
        updated.total_tva = calcs.total_tva;
        updated.total_ttc = calcs.total_ttc;

        return updated;
      })
    );
  };

  const handleAddLine = () => {
    const newLine: DocumentLine = {
      id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      product_id: '',
      reference: '',
      designation: '',
      quantity: 1,
      unit: 'Pièce',
      unit_price_ht: 0,
      discount_percent: 0,
      tva_percent: 19,
      total_ht: 0,
      total_tva: 0,
      total_ttc: 0,
    };
    setLines([...lines, newLine]);
  };

  const handleDuplicateLine = (index: number) => {
    const target = lines[index];
    const duplicated: DocumentLine = {
      ...target,
      id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    const newLines = [...lines];
    newLines.splice(index + 1, 0, duplicated);
    setLines(newLines);
  };

  const handleRemoveLine = (id: string) => {
    if (lines.length === 1) {
      setLines([
        {
          id: `line-${Date.now()}`,
          product_id: '',
          reference: '',
          designation: '',
          quantity: 1,
          unit: 'Pièce',
          unit_price_ht: 0,
          discount_percent: 0,
          tva_percent: 19,
          total_ht: 0,
          total_tva: 0,
          total_ttc: 0,
        },
      ]);
      return;
    }
    setLines(lines.filter((l) => l.id !== id));
  };

  // Build snapshot representation
  const buildCurrentDoc = (): CommercialDocument => {
    return {
      id: initialDocument?.id || `temp-${Date.now()}`,
      type: normalizedType as any,
      number: docNumber,
      client_id: selectedClientId,
      client_snapshot: {
        name: selectedClient?.name || selectedClient?.nom || 'Client',
        company_name: selectedClient?.company_name,
        matricule_fiscal: selectedClient?.matricule_fiscal,
        registre_commerce: selectedClient?.registre_commerce,
        cin: selectedClient?.cin,
        cin_matricule_fiscale:
          selectedClient?.cin_matricule_fiscale ||
          selectedClient?.matricule_fiscal ||
          selectedClient?.cin ||
          '',
        reference_client: selectedClient?.reference_client || '',
        address: selectedClient?.address || selectedClient?.adresse || '',
        city: selectedClient?.city || '',
        phone: selectedClient?.phone || selectedClient?.telephone || '',
        email: selectedClient?.email || '',
      },
      description,
      has_remise: hasRemise,
      source_document_id: initialDocument?.source_document_id,
      source_document_number: initialDocument?.source_document_number,
      date,
      validity_date: normalizedType === 'devis' ? validityDate : undefined,
      due_date: normalizedType === 'facture' ? dueDate : undefined,
      status: status as any,
      lines: lines.map((l) => ({
        ...l,
        discount_percent: hasRemise ? Number(l.discount_percent || 0) : 0,
      })),
      totals,
      payment_mode: paymentMode,
      payment_method: paymentMethod,
      payment_reference: paymentRef,
      payment_date: paymentDate,
      notes,
      conditions,
      arrete_somme: arreteSomme,
      created_at: initialDocument?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  };

  const handleSave = async () => {
    if (!selectedClientId) {
      setErrorMsg('Veuillez sélectionner un client.');
      return;
    }
    const hasValidLine = lines.some((l) => l.designation.trim() !== '');
    if (!hasValidLine) {
      setErrorMsg('Veuillez ajouter au moins une ligne avec une désignation.');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);
      const currentDoc = buildCurrentDoc();
      await onSave(currentDoc);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la sauvegarde du document');
    } finally {
      setSaving(false);
    }
  };

  const title =
    normalizedType === 'devis'
      ? initialDocument
        ? `Modifier le Devis ${docNumber}`
        : 'Nouveau Devis Commercial'
      : normalizedType === 'bl'
      ? initialDocument
        ? `Modifier le Bon de Livraison ${docNumber}`
        : 'Nouveau Bon de Livraison'
      : initialDocument
      ? `Modifier la Facture ${docNumber}`
      : 'Nouvelle Facture';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-6 backdrop-blur-xs overflow-y-auto">
      <div className="relative flex flex-col max-h-[96vh] w-full max-w-6xl rounded-2xl bg-white shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                normalizedType === 'devis'
                  ? 'bg-blue-100 text-blue-800'
                  : normalizedType === 'bl'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {normalizedType.toUpperCase()}
            </span>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">{title}</h2>
          </div>

          <div className="flex items-center gap-2">
            {onPreview && (
              <button
                type="button"
                onClick={() => onPreview(buildCurrentDoc())}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
              >
                <Eye className="h-4 w-4 text-slate-500" />
                <span>Aperçu Officiel</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-800 transition shadow-xs disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Enregistrement...' : 'Enregistrer'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Top Row: Client and Doc Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Client Destinataire Card */}
            <div className="md:col-span-2 border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Building className="h-4 w-4 text-blue-600" />
                  <span>Client Destinataire</span>
                </label>
                {onCreateClient && (
                  <button
                    type="button"
                    onClick={() => setShowNewClientModal(true)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>+ Nouveau client</span>
                  </button>
                )}
              </div>

              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:border-blue-600 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
              >
                <option value="">-- Sélectionner un client --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.nom} {c.phone ? `(${c.phone})` : ''} — {c.address || c.city}
                  </option>
                ))}
              </select>

              {/* Client Auto-populated Details */}
              {selectedClient ? (
                <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-200 text-xs text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-700">Nom : </span>
                    <span className="font-medium text-slate-900">{selectedClient.name || selectedClient.nom}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Téléphone : </span>
                    <span className="font-medium text-slate-900">{selectedClient.phone || selectedClient.telephone}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Adresse : </span>
                    <span className="text-slate-800">{selectedClient.address || selectedClient.adresse}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">E-mail : </span>
                    <span className="text-slate-800">{selectedClient.email || '-'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">CIN / MF : </span>
                    <span className="font-mono text-slate-800">
                      {selectedClient.matricule_fiscal || selectedClient.cin || selectedClient.cin_matricule_fiscale || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Réf. Client : </span>
                    <span className="font-mono text-slate-800">{selectedClient.reference_client || '-'}</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-amber-700 italic">
                  Veuillez choisir un client pour pré-remplir les données fiscales automatiquement.
                </div>
              )}
            </div>

            {/* Document Details Card */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-800 block">
                Paramètres du Document
              </label>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Numéro officiel (ex: Devis-000100)
                </label>
                <input
                  type="text"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono font-bold text-blue-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    {normalizedType === 'devis' ? 'Validité' : 'Échéance'}
                  </label>
                  <input
                    type="date"
                    value={normalizedType === 'devis' ? validityDate : dueDate}
                    onChange={(e) =>
                      normalizedType === 'devis'
                        ? setValidityDate(e.target.value)
                        : setDueDate(e.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Statut
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700"
                >
                  <option value="brouillon">Brouillon</option>
                  <option value="envoye">Envoyé</option>
                  <option value="accepte">Accepté</option>
                  <option value="livre">Livré</option>
                  <option value="payee">Payée</option>
                </select>
              </div>
            </div>
          </div>

          {/* Photovoltaic Description and Remise Toggle Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
            {/* Description Field */}
            <div className="md:col-span-2 border border-blue-200 rounded-xl p-3.5 bg-blue-50/50">
              <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5 mb-1.5">
                <Zap className="h-4 w-4 text-blue-600" />
                <span>Description de l'installation photovoltaïque</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Générateur photovoltaïque raccordé au réseau STEG de puissance 2.46Kwc."
                className="w-full rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
              />
            </div>

            {/* Dedicated Remise Toggle */}
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/70 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-blue-600" />
                  <span>Gestion des Remises</span>
                </span>
                <span className="text-[11px] text-slate-500">
                  {hasRemise ? 'Colonne remise visible' : 'Remise désactivée'}
                </span>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasRemise}
                  onChange={(e) => setHasRemise(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Product Items Table */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Lignes du document (Articles & Prestations)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Sélectionnez un article solaire ou saisissez une désignation personnalisée.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddLine}
                className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 border border-blue-200 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Ajouter une ligne</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-blue-700 text-white font-bold">
                    <th className="py-2.5 px-2 w-48 font-bold">Catalogue Solaire</th>
                    <th className="py-2.5 px-2 font-bold">Désignation</th>
                    <th className="py-2.5 px-2 w-16 text-center font-bold">Qté</th>
                    <th className="py-2.5 px-2 w-24 text-right font-bold">P.U. HT</th>
                    {hasRemise && (
                      <th className="py-2.5 px-2 w-16 text-center font-bold">Rem. %</th>
                    )}
                    <th className="py-2.5 px-2 w-24 text-right font-bold">Total HT</th>
                    <th className="py-2.5 px-2 w-20 text-center font-bold">TVA %</th>
                    <th className="py-2.5 px-2 w-28 text-right font-bold">Total TTC</th>
                    <th className="py-2.5 px-2 w-16 text-center font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {lines.map((line, idx) => (
                    <tr key={line.id} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                      {/* Catalog dropdown */}
                      <td className="py-2 px-1">
                        <select
                          value={line.product_id || ''}
                          onChange={(e) =>
                            handleLineChange(line.id, 'product_id', e.target.value)
                          }
                          className="w-full rounded border border-slate-300 bg-white p-1 text-[11px] text-slate-800"
                        >
                          <option value="">-- Choisir un produit --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.designation} ({formatTND(p.sale_price_ht, true)})
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Designation */}
                      <td className="py-2 px-1">
                        <input
                          type="text"
                          value={line.designation}
                          placeholder="Ex: Onduleur Sungrow 2k"
                          onChange={(e) =>
                            handleLineChange(line.id, 'designation', e.target.value)
                          }
                          className="w-full rounded border border-slate-300 px-2 py-1 text-xs text-slate-800 font-medium"
                        />
                      </td>

                      {/* Quantity */}
                      <td className="py-2 px-1">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={line.quantity}
                          onChange={(e) =>
                            handleLineChange(line.id, 'quantity', e.target.value)
                          }
                          className="w-full rounded border border-slate-300 px-1 py-1 text-xs text-center font-semibold text-slate-800"
                        />
                      </td>

                      {/* PU HT */}
                      <td className="py-2 px-1 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={line.unit_price_ht}
                          onChange={(e) =>
                            handleLineChange(line.id, 'unit_price_ht', e.target.value)
                          }
                          className="w-full rounded border border-slate-300 px-1.5 py-1 text-xs text-right font-mono text-slate-800"
                        />
                      </td>

                      {/* Remise if enabled */}
                      {hasRemise && (
                        <td className="py-2 px-1 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={line.discount_percent || 0}
                            onChange={(e) =>
                              handleLineChange(line.id, 'discount_percent', e.target.value)
                            }
                            className="w-full rounded border border-slate-300 px-1 py-1 text-xs text-center font-mono text-blue-700"
                          />
                        </td>
                      )}

                      {/* Total HT */}
                      <td className="py-2 px-2 text-right font-mono font-medium text-slate-800">
                        {formatTND(line.total_ht, false)}
                      </td>

                      {/* TVA Rate */}
                      <td className="py-2 px-1 text-center">
                        <select
                          value={line.tva_percent}
                          onChange={(e) =>
                            handleLineChange(line.id, 'tva_percent', Number(e.target.value))
                          }
                          className="w-full rounded border border-slate-300 px-1 py-1 text-xs text-center font-mono"
                        >
                          <option value={19}>19%</option>
                          <option value={7}>7%</option>
                          <option value={13}>13%</option>
                          <option value={0}>0%</option>
                        </select>
                      </td>

                      {/* Total TTC */}
                      <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                        {formatTND(line.total_ttc, false)}
                      </td>

                      {/* Action buttons */}
                      <td className="py-2 px-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            title="Dupliquer"
                            onClick={() => handleDuplicateLine(idx)}
                            className="p-1 text-slate-400 hover:text-blue-700 transition"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Supprimer"
                            onClick={() => handleRemoveLine(line.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Totals and Payment Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            {/* Mode de règlement card */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2">
                MODE DE RÈGLEMENT
              </h4>

              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="payment_mode"
                      value="Comptant"
                      checked={paymentMode === 'Comptant'}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-800">Comptant</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="payment_mode"
                      value="Virement"
                      checked={paymentMode === 'Virement'}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-800">Virement</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="payment_mode"
                      value="Chèque"
                      checked={paymentMode === 'Chèque'}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-800">Chèque</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Référence
                    </label>
                    <input
                      type="text"
                      value={paymentRef}
                      placeholder="Ex: N° Chèque, Référence vir..."
                      onChange={(e) => setPaymentRef(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Conditions & Garantie
                  </label>
                  <textarea
                    rows={2}
                    value={conditions}
                    onChange={(e) => setConditions(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-700"
                  />
                </div>
              </div>
            </div>

            {/* Totals Summary Card */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2">
                Totaux Financiers (TND)
              </h4>

              <div className="space-y-2 text-xs text-slate-700">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Montant Total HT</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatTND(totals.subtotal_net_ht)}
                  </span>
                </div>

                {/* TVA Breakdown */}
                {totals.tva_details.map((t) => (
                  <div key={t.rate} className="flex justify-between items-center text-slate-600">
                    <span>TVA {t.rate}% :</span>
                    <span className="font-mono font-bold text-slate-800">
                      {formatTND(t.amount_tva)}
                    </span>
                  </div>
                ))}

                {isInvoice && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Timbre Fiscal :</span>
                    <span className="font-mono font-bold text-slate-800">
                      {formatTND(totals.timbre_fiscal)}
                    </span>
                  </div>
                )}

                {/* TOTAL TTC BLUE BOX */}
                <div className="rounded-xl bg-blue-700 text-white p-3 flex justify-between items-center shadow-xs">
                  <span className="font-black text-sm uppercase tracking-wider">TOTAL TTC</span>
                  <span className="font-mono font-black text-lg sm:text-xl">
                    {formatTND(totals.total_ttc)}
                  </span>
                </div>

                {/* Amount in French Words */}
                <div className="pt-2 text-[11px] text-slate-600 italic">
                  <span className="font-semibold text-slate-800 not-italic">
                    Arrêté à la somme de :{' '}
                  </span>
                  {arreteSomme}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 bg-slate-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            Annuler
          </button>

          <div className="flex items-center gap-3">
            {onPreview && (
              <button
                type="button"
                onClick={() => onPreview(buildCurrentDoc())}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
              >
                <Eye className="h-4 w-4 text-slate-500" />
                <span>Aperçu Officiel</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-blue-700 px-5 py-2 text-xs font-bold text-white hover:bg-blue-800 transition shadow-xs disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Enregistrement en cours...' : 'Enregistrer le document'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

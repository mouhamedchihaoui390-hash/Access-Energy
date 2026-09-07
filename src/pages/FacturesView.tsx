import React, { useState } from 'react';
import { CommercialDocument } from '../types';
import { formatTND } from '../utils/calculations';
import {
  Receipt,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Truck,
  ArrowUpRight,
} from 'lucide-react';

interface FacturesViewProps {
  facturesList: CommercialDocument[];
  onNewFacture: () => void;
  onEditFacture: (facture: CommercialDocument) => void;
  onDeleteFacture: (id: string) => Promise<void>;
  onPreviewDoc: (doc: CommercialDocument) => void;
  onOpenPaymentModal: (facture: CommercialDocument) => void;
}

export const FacturesView: React.FC<FacturesViewProps> = ({
  facturesList,
  onNewFacture,
  onEditFacture,
  onDeleteFacture,
  onPreviewDoc,
  onOpenPaymentModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = facturesList.filter((f) => {
    const matchesSearch =
      f.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.client_snapshot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.client_snapshot.company_name &&
        f.client_snapshot.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (f.client_snapshot.matricule_fiscal &&
        f.client_snapshot.matricule_fiscal.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (f.source_document_number &&
        f.source_document_number.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate quick metrics for invoices
  const totalTTC = facturesList.reduce((acc, f) => acc + (f.totals?.total_ttc || 0), 0);
  const totalPaid = facturesList.reduce((acc, f) => acc + (f.amount_paid || 0), 0);
  const totalRemaining = facturesList.reduce(
    (acc, f) => acc + (f.amount_remaining !== undefined ? f.amount_remaining : f.totals?.total_ttc || 0),
    0
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'payee':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
            <CheckCircle2 className="h-3 w-3" /> Soldée / Payée
          </span>
        );
      case 'partiellement_payee':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
            <Clock className="h-3 w-3" /> Acompte Versé
          </span>
        );
      case 'emise':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800">
            Émise (Non payée)
          </span>
        );
      case 'retard':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-800">
            <AlertCircle className="h-3 w-3" /> Échue / En retard
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
            Brouillon
          </span>
        );
    }
  };

  const handleDelete = async (f: CommercialDocument) => {
    if (window.confirm(`Supprimer définitivement la facture ${f.number} ?`)) {
      await onDeleteFacture(f.id);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Facturation Commerciale</h2>
          <p className="text-xs text-slate-500">
            Factures de vente avec TVA, timbre fiscal de 1.000 DT, retenues à la source et suivi des encaissements.
          </p>
        </div>

        <button
          onClick={onNewFacture}
          className="flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800 transition"
        >
          <Plus className="h-4 w-4" />
          Nouvelle Facture
        </button>
      </div>

      {/* Mini KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500">Total Facturé (TTC)</div>
            <div className="text-lg font-black font-mono text-slate-800">
              {formatTND(totalTTC)}
            </div>
          </div>
          <Receipt className="h-7 w-7 text-slate-300" />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500">Total Encaissé</div>
            <div className="text-lg font-black font-mono text-emerald-700">
              {formatTND(totalPaid)}
            </div>
          </div>
          <CreditCard className="h-7 w-7 text-emerald-300" />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500">Reste à Recouvrer</div>
            <div className="text-lg font-black font-mono text-rose-600">
              {formatTND(totalRemaining)}
            </div>
          </div>
          <AlertCircle className="h-7 w-7 text-rose-300" />
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par N° Facture (FA-...), client, matricule fiscal, BL source..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-xs placeholder:text-slate-400 focus:border-teal-600 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'all', label: 'Toutes' },
            { id: 'emise', label: 'Non Soldées' },
            { id: 'partiellement_payee', label: 'Partielles' },
            { id: 'payee', label: 'Payées' },
            { id: 'retard', label: 'En retard' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition shrink-0 ${
                statusFilter === st.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-4">N° Facture</th>
                <th className="py-3 px-4">Client & Fiscalité</th>
                <th className="py-3 px-4">Date / Échéance</th>
                <th className="py-3 px-4">Origine</th>
                <th className="py-3 px-4 text-right">Total TTC</th>
                <th className="py-3 px-4 text-right">Déjà Payé</th>
                <th className="py-3 px-4 text-right">Reste Dû</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((f) => {
                const remaining = f.amount_remaining !== undefined ? f.amount_remaining : (f.totals?.total_ttc || 0);
                const isPaid = f.status === 'payee' || remaining <= 0.001;

                return (
                  <tr key={f.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-amber-700 text-sm">
                      {f.number}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">
                        {f.client_snapshot.company_name || f.client_snapshot.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {f.client_snapshot.matricule_fiscal ? (
                          `MF: ${f.client_snapshot.matricule_fiscal}`
                        ) : f.client_snapshot.cin ? (
                          `CIN: ${f.client_snapshot.cin}`
                        ) : (
                          f.client_snapshot.city
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-700">{f.date}</div>
                      {f.due_date && (
                        <div className="text-[10px] text-slate-400">
                          Échéance : {f.due_date}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-500">
                      {f.source_document_number ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                          {f.source_document_type === 'bon_livraison' ? (
                            <Truck className="h-3 w-3" />
                          ) : (
                            <FileText className="h-3 w-3" />
                          )}
                          {f.source_document_number}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Directe</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-black text-slate-900 text-sm">
                      {formatTND(f.totals?.total_ttc)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-emerald-700 font-semibold">
                      {formatTND(f.amount_paid || 0)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold">
                      {remaining > 0.001 ? (
                        <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                          {formatTND(remaining)}
                        </span>
                      ) : (
                        <span className="text-emerald-700">0,000 DT</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">{getStatusBadge(f.status)}</td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Record Payment Button */}
                        {!isPaid && (
                          <button
                            onClick={() => onOpenPaymentModal(f)}
                            title="Enregistrer un encaissement"
                            className="flex items-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold text-[11px] shadow-2xs transition"
                          >
                            <CreditCard className="h-3 w-3" />
                            Encaisser
                          </button>
                        )}

                        {/* Preview */}
                        <button
                          onClick={() => onPreviewDoc(f)}
                          title="Aperçu & Impression officielle"
                          className="p-1.5 text-slate-600 hover:text-teal-800 hover:bg-teal-50 rounded-md transition"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => onEditFacture(f)}
                          title="Modifier"
                          className="p-1.5 text-slate-400 hover:text-slate-800 rounded-md transition"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(f)}
                          title="Supprimer"
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 text-xs">
                    Aucune facture trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { CommercialDocument } from '../types';
import { formatTND } from '../utils/calculations';
import {
  Truck,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Receipt,
  CheckCircle2,
  Clock,
  FileText,
} from 'lucide-react';

interface BonsLivraisonViewProps {
  blList: CommercialDocument[];
  onNewBL: () => void;
  onEditBL: (bl: CommercialDocument) => void;
  onDeleteBL: (id: string) => Promise<void>;
  onPreviewDoc: (doc: CommercialDocument) => void;
  onConvertToFacture: (id: string) => Promise<void>;
}

export const BonsLivraisonView: React.FC<BonsLivraisonViewProps> = ({
  blList,
  onNewBL,
  onEditBL,
  onDeleteBL,
  onPreviewDoc,
  onConvertToFacture,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = blList.filter((bl) => {
    const matchesSearch =
      bl.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bl.client_snapshot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bl.client_snapshot.company_name &&
        bl.client_snapshot.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (bl.source_document_number &&
        bl.source_document_number.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || bl.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'livre':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
            <CheckCircle2 className="h-3 w-3" /> Livré & Réceptionné
          </span>
        );
      case 'en_cours_livraison':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
            <Clock className="h-3 w-3" /> En cours d'acheminement
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
            Brouillon
          </span>
        );
    }
  };

  const handleDelete = async (bl: CommercialDocument) => {
    if (window.confirm(`Supprimer le bon de livraison ${bl.number} ?`)) {
      await onDeleteBL(bl.id);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Bons de Livraison (BL)</h2>
          <p className="text-xs text-slate-500">
            Bordereaux de décharge chantier, déstockage des équipements et justification de livraison.
          </p>
        </div>

        <button
          onClick={onNewBL}
          className="flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800 transition"
        >
          <Plus className="h-4 w-4" />
          Nouveau BL
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par N° BL, client, devis d'origine..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-xs placeholder:text-slate-400 focus:border-teal-600 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {['all', 'brouillon', 'en_cours_livraison', 'livre'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'all' ? 'Tous' : st.replace('_', ' ')}
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
                <th className="py-3 px-4">N° BL</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Date Expédition</th>
                <th className="py-3 px-4">Devis Source</th>
                <th className="py-3 px-4 text-right">Total Net H.T.</th>
                <th className="py-3 px-4 text-right">Total TTC</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-center">Workflow & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((bl) => (
                <tr key={bl.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-amber-700 text-sm">
                    {bl.number}
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">
                      {bl.client_snapshot.company_name || bl.client_snapshot.name}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {bl.client_snapshot.city} • {bl.client_snapshot.phone}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-slate-600 font-medium">{bl.date}</td>

                  <td className="py-3 px-4 font-mono text-slate-500">
                    {bl.source_document_number ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                        <FileText className="h-3 w-3" />
                        {bl.source_document_number}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Direct</span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-right font-mono text-slate-700">
                    {formatTND(bl.totals?.subtotal_net_ht)}
                  </td>

                  <td className="py-3 px-4 text-right font-mono font-black text-slate-900 text-sm">
                    {formatTND(bl.totals?.total_ttc)}
                  </td>

                  <td className="py-3 px-4 text-center">{getStatusBadge(bl.status)}</td>

                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {/* Preview Button */}
                      <button
                        onClick={() => onPreviewDoc(bl)}
                        title="Aperçu Bon de Livraison"
                        className="p-1.5 text-slate-600 hover:text-teal-800 hover:bg-teal-50 rounded-md transition"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {/* Convert to Facture */}
                      <button
                        onClick={() => onConvertToFacture(bl.id)}
                        title="Facturer ce Bon de Livraison"
                        className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-md font-semibold text-[11px] transition"
                      >
                        <Receipt className="h-3 w-3" />
                        Facturer
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => onEditBL(bl)}
                        title="Modifier le BL"
                        className="p-1.5 text-slate-400 hover:text-slate-800 rounded-md transition"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(bl)}
                        title="Supprimer"
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                    Aucun bon de livraison enregistré.
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

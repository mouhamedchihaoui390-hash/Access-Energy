import React, { useState } from 'react';
import { CommercialDocument } from '../types';
import { formatTND } from '../utils/calculations';
import {
  FileText,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  ArrowRightCircle,
  Truck,
  Receipt,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface DevisViewProps {
  devisList: CommercialDocument[];
  onNewDevis: () => void;
  onEditDevis: (devis: CommercialDocument) => void;
  onDeleteDevis: (id: string) => Promise<void>;
  onPreviewDoc: (doc: CommercialDocument) => void;
  onConvertToBL: (id: string) => Promise<void>;
  onConvertToFacture: (id: string) => Promise<void>;
}

export const DevisView: React.FC<DevisViewProps> = ({
  devisList,
  onNewDevis,
  onEditDevis,
  onDeleteDevis,
  onPreviewDoc,
  onConvertToBL,
  onConvertToFacture,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = devisList.filter((d) => {
    const matchesSearch =
      d.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.client_snapshot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.client_snapshot.company_name &&
        d.client_snapshot.company_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepte':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
            <CheckCircle2 className="h-3 w-3" /> Accepté
          </span>
        );
      case 'envoye':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
            <Clock className="h-3 w-3" /> Envoyé
          </span>
        );
      case 'refuse':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
            <XCircle className="h-3 w-3" /> Refusé
          </span>
        );
      case 'expire':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
            Expiré
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

  const handleDelete = async (d: CommercialDocument) => {
    if (window.confirm(`Supprimer le devis ${d.number} ?`)) {
      await onDeleteDevis(d.id);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Devis Commerciaux</h2>
          <p className="text-xs text-slate-500">
            Création de propositions tarifaires, calculs automatisés et conversion fluide en BL ou Facture.
          </p>
        </div>

        <button
          onClick={onNewDevis}
          className="flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800 transition"
        >
          <Plus className="h-4 w-4" />
          Nouveau Devis
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par numéro (DEVIS-...), client..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-xs placeholder:text-slate-400 focus:border-teal-600 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['all', 'brouillon', 'envoye', 'accepte', 'refuse'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition shrink-0 ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'all' ? 'Tous' : st}
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
                <th className="py-3 px-4">N° Devis</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Date Émission</th>
                <th className="py-3 px-4">Validité</th>
                <th className="py-3 px-4 text-right">Total Net H.T.</th>
                <th className="py-3 px-4 text-right">Total TTC</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-center">Workflow & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-amber-700 text-sm">
                    {d.number}
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">
                      {d.client_snapshot.company_name || d.client_snapshot.name}
                    </div>
                    {d.client_snapshot.company_name && (
                      <div className="text-[11px] text-slate-500">{d.client_snapshot.name}</div>
                    )}
                    <div className="text-[10px] text-slate-400 font-mono">
                      {d.client_snapshot.matricule_fiscal || d.client_snapshot.cin || ''}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-slate-600 font-medium">{d.date}</td>

                  <td className="py-3 px-4 text-slate-500">{d.validity_date || 'N/A'}</td>

                  <td className="py-3 px-4 text-right font-mono text-slate-700">
                    {formatTND(d.totals?.subtotal_net_ht)}
                  </td>

                  <td className="py-3 px-4 text-right font-mono font-black text-slate-900 text-sm">
                    {formatTND(d.totals?.total_ttc)}
                  </td>

                  <td className="py-3 px-4 text-center">{getStatusBadge(d.status)}</td>

                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {/* Preview Button */}
                      <button
                        onClick={() => onPreviewDoc(d)}
                        title="Aperçu officiel (comme dans la référence)"
                        className="p-1.5 text-slate-600 hover:text-teal-800 hover:bg-teal-50 rounded-md transition"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {/* Convert to BL */}
                      <button
                        onClick={() => onConvertToBL(d.id)}
                        title="Convertir en Bon de Livraison (BL)"
                        className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md font-semibold text-[11px] transition"
                      >
                        <Truck className="h-3 w-3" />
                        BL
                      </button>

                      {/* Convert to Facture */}
                      <button
                        onClick={() => onConvertToFacture(d.id)}
                        title="Convertir directement en Facture"
                        className="flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-md font-semibold text-[11px] transition"
                      >
                        <Receipt className="h-3 w-3" />
                        Facture
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => onEditDevis(d)}
                        title="Modifier le devis"
                        className="p-1.5 text-slate-400 hover:text-slate-800 rounded-md transition"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(d)}
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
                    Aucun devis commercial trouvé.
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

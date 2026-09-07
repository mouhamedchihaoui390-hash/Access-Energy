import React, { useState } from 'react';
import { Client, CommercialDocument } from '../types';
import { formatTND } from '../utils/calculations';
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Building,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  Receipt,
} from 'lucide-react';

interface ClientsViewProps {
  clients: Client[];
  devisList: CommercialDocument[];
  facturesList: CommercialDocument[];
  onNewClient: () => void;
  onEditClient: (client: Client) => void;
  onDeleteClient: (id: string) => Promise<void>;
  onPreviewDoc: (doc: CommercialDocument) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  devisList,
  facturesList,
  onNewClient,
  onEditClient,
  onDeleteClient,
  onPreviewDoc,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'entreprise' | 'particulier'>('all');
  const [selectedClientForDetails, setSelectedClientForDetails] = useState<Client | null>(null);

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.company_name && c.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.matricule_fiscal && c.matricule_fiscal.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.cin && c.cin.includes(searchTerm)) ||
      c.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm);

    const matchesType = filterType === 'all' || c.client_type === filterType;
    return matchesSearch && matchesType;
  });

  const handleDelete = async (client: Client) => {
    if (
      window.confirm(
        `Êtes-vous sûr de vouloir supprimer ou désactiver la fiche client "${client.name}" ?`
      )
    ) {
      await onDeleteClient(client.id);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Répertoire Clients</h2>
          <p className="text-xs text-slate-500">
            Gestion des comptes clients, identification fiscale tunisienne et historique comptable.
          </p>
        </div>

        <button
          onClick={onNewClient}
          className="flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800 transition"
        >
          <Plus className="h-4 w-4" />
          Nouveau Client
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Recherche par nom, raison sociale, matricule fiscal, CIN, ville, tél..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-xs placeholder:text-slate-400 focus:border-teal-600 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filterType === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tous ({clients.length})
          </button>
          <button
            onClick={() => setFilterType('entreprise')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filterType === 'entreprise'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Entreprises
          </button>
          <button
            onClick={() => setFilterType('particulier')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filterType === 'particulier'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Particuliers
          </button>
        </div>
      </div>

      {/* Clients Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-4">Client & Raison Sociale</th>
                <th className="py-3 px-4">Identifiant Fiscal / CIN</th>
                <th className="py-3 px-4">Coordonnées</th>
                <th className="py-3 px-4 text-right">Facturé (TTC)</th>
                <th className="py-3 px-4 text-right">Solde Dû</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.map((client) => {
                const soldeDu = client.solde_du || 0;
                return (
                  <tr key={client.id} className="hover:bg-slate-50 transition">
                    {/* Name & Company */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-sm">
                        {client.company_name || client.name}
                      </div>
                      {client.company_name && (
                        <div className="text-slate-500 font-medium text-[11px]">
                          Contact : {client.name}
                        </div>
                      )}
                      <div className="text-slate-400 text-[10px] flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {client.city} ({client.governorate})
                      </div>
                    </td>

                    {/* Fiscal ID / CIN */}
                    <td className="py-3 px-4 font-mono">
                      {client.matricule_fiscal ? (
                        <div>
                          <span className="text-[10px] text-slate-400 block">MF:</span>
                          <span className="font-bold text-slate-800">
                            {client.matricule_fiscal}
                          </span>
                        </div>
                      ) : client.cin ? (
                        <div>
                          <span className="text-[10px] text-slate-400 block">CIN:</span>
                          <span className="font-bold text-slate-800">{client.cin}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Non spécifié</span>
                      )}
                    </td>

                    {/* Contact */}
                    <td className="py-3 px-4 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {client.phone}
                      </div>
                      {client.email && (
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                          <Mail className="h-3 w-3 text-slate-400" />
                          {client.email}
                        </div>
                      )}
                    </td>

                    {/* Total Invoiced */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                      {formatTND(client.total_facture)}
                    </td>

                    {/* Balance Due */}
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      {soldeDu > 0 ? (
                        <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                          {formatTND(soldeDu)}
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold">0,000 DT</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          client.status === 'actif'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {client.status === 'actif' ? 'Actif' : 'Inactif'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedClientForDetails(client)}
                          title="Historique & Documents"
                          className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-md transition"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onEditClient(client)}
                          title="Modifier la fiche"
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(client)}
                          title="Supprimer / Archiver"
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    Aucun client trouvé correspondant aux critères de recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Client 360 Details Drawer/Modal */}
      {selectedClientForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Fiche Client 360° : {selectedClientForDetails.company_name || selectedClientForDetails.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Historique commercial, documents émis et état des créances
                </p>
              </div>
              <button
                onClick={() => setSelectedClientForDetails(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-3 text-xs border border-slate-200">
              <div>
                <span className="text-slate-500">Total Facturé :</span>
                <div className="font-mono font-bold text-slate-800 text-sm">
                  {formatTND(selectedClientForDetails.total_facture)}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Total Encaissé :</span>
                <div className="font-mono font-bold text-emerald-700 text-sm">
                  {formatTND(selectedClientForDetails.total_paye)}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Solde Dû :</span>
                <div className="font-mono font-bold text-rose-600 text-sm">
                  {formatTND(selectedClientForDetails.solde_du)}
                </div>
              </div>
            </div>

            {/* Linked Invoices */}
            <div>
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Receipt className="h-4 w-4 text-amber-600" />
                Factures Émises
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                {facturesList.filter((f) => f.client_id === selectedClientForDetails.id).length > 0 ? (
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="p-2">Numéro</th>
                        <th className="p-2">Date</th>
                        <th className="p-2 text-right">Total TTC</th>
                        <th className="p-2 text-right">Payé</th>
                        <th className="p-2 text-center">Statut</th>
                        <th className="p-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {facturesList
                        .filter((f) => f.client_id === selectedClientForDetails.id)
                        .map((f) => (
                          <tr key={f.id} className="hover:bg-slate-50">
                            <td className="p-2 font-mono font-bold">{f.number}</td>
                            <td className="p-2">{f.date}</td>
                            <td className="p-2 text-right font-mono font-bold">
                              {formatTND(f.totals?.total_ttc)}
                            </td>
                            <td className="p-2 text-right font-mono text-emerald-700">
                              {formatTND(f.amount_paid || 0)}
                            </td>
                            <td className="p-2 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100">
                                {f.status}
                              </span>
                            </td>
                            <td className="p-2 text-center">
                              <button
                                onClick={() => {
                                  setSelectedClientForDetails(null);
                                  onPreviewDoc(f);
                                }}
                                className="text-teal-700 font-semibold hover:underline"
                              >
                                Voir
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    Aucune facture émise pour ce client pour l'instant.
                  </div>
                )}
              </div>
            </div>

            {/* Linked Quotes */}
            <div>
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-teal-700" />
                Devis Réalisés
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                {devisList.filter((d) => d.client_id === selectedClientForDetails.id).length > 0 ? (
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="p-2">Numéro</th>
                        <th className="p-2">Date</th>
                        <th className="p-2 text-right">Montant TTC</th>
                        <th className="p-2 text-center">Statut</th>
                        <th className="p-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {devisList
                        .filter((d) => d.client_id === selectedClientForDetails.id)
                        .map((d) => (
                          <tr key={d.id} className="hover:bg-slate-50">
                            <td className="p-2 font-mono font-bold">{d.number}</td>
                            <td className="p-2">{d.date}</td>
                            <td className="p-2 text-right font-mono font-bold">
                              {formatTND(d.totals?.total_ttc)}
                            </td>
                            <td className="p-2 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100">
                                {d.status}
                              </span>
                            </td>
                            <td className="p-2 text-center">
                              <button
                                onClick={() => {
                                  setSelectedClientForDetails(null);
                                  onPreviewDoc(d);
                                }}
                                className="text-teal-700 font-semibold hover:underline"
                              >
                                Voir
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    Aucun devis créé pour ce client.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

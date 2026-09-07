import React, { useState } from 'react';
import { Payment } from '../types';
import { formatTND } from '../utils/calculations';
import { CreditCard, Search, Calendar, Landmark, Trash2, ArrowDownRight } from 'lucide-react';

interface PaymentsViewProps {
  payments: Payment[];
  onDeletePayment: (id: string) => Promise<void>;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  payments,
  onDeletePayment,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  const filtered = payments.filter((p) => {
    const matchesSearch =
      p.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.reference && p.reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.bank && p.bank.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesMethod = methodFilter === 'all' || p.method === methodFilter;
    return matchesSearch && matchesMethod;
  });

  const totalCollected = payments.reduce((acc, p) => acc + p.amount, 0);

  const handleDelete = async (p: Payment) => {
    if (
      window.confirm(
        `Annuler ce règlement de ${p.amount.toFixed(3)} DT pour la facture ${p.invoice_number} ?`
      )
    ) {
      await onDeletePayment(p.id);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Journal des Règlements & Encaissements</h2>
          <p className="text-xs text-slate-500">
            Suivi des chèques en caisse, virements bancaires, traites et règlements en espèces.
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-right">
          <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
            Total Encaissé
          </div>
          <div className="text-xl font-black text-emerald-900 font-mono">
            {formatTND(totalCollected)}
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par facture, client, N° de chèque, banque..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-xs placeholder:text-slate-400 focus:border-teal-600 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {['all', 'cheque', 'virement', 'especes', 'traite'].map((m) => (
            <button
              key={m}
              onClick={() => setMethodFilter(m)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                methodFilter === m
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {m === 'all' ? 'Tous' : m}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-4">Date Règlement</th>
                <th className="py-3 px-4">Facture Liée</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Mode & Banque</th>
                <th className="py-3 px-4">Référence / Chèque</th>
                <th className="py-3 px-4 text-right">Montant Encaissé</th>
                <th className="py-3 px-4">Observations</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-medium text-slate-700">{p.date}</td>

                  <td className="py-3 px-4 font-mono font-bold text-amber-700">
                    {p.invoice_number}
                  </td>

                  <td className="py-3 px-4 font-bold text-slate-900">{p.client_name}</td>

                  <td className="py-3 px-4">
                    <div className="font-semibold capitalize text-slate-800">
                      {p.method}
                    </div>
                    {p.bank && (
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Landmark className="h-3 w-3 text-slate-400" />
                        {p.bank}
                      </div>
                    )}
                  </td>

                  <td className="py-3 px-4 font-mono text-slate-600">
                    {p.reference || '—'}
                  </td>

                  <td className="py-3 px-4 text-right font-mono font-black text-emerald-700 text-sm">
                    {formatTND(p.amount)}
                  </td>

                  <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                    {p.notes || '—'}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleDelete(p)}
                      title="Annuler le règlement"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                    Aucun encaissement enregistré.
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

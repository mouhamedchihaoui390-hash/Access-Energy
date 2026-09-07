import React from 'react';
import { FinancialReport, CompanySettings } from '../types';
import { formatTND } from '../utils/calculations';
import {
  BarChart3,
  Receipt,
  CreditCard,
  Building,
  Printer,
  FileSpreadsheet,
  Coins,
  ShieldCheck,
} from 'lucide-react';

interface ReportsViewProps {
  report: FinancialReport | null;
  company: CompanySettings;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ report, company }) => {
  if (!report) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-700" />
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Rapports & Déclaration Fiscale</h2>
          <p className="text-xs text-slate-500">
            Synthèse comptable mensuelle et trimestrielle : Décompte TVA tunisienne, timbres fiscaux et chiffre d'affaires.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
        >
          <Printer className="h-4 w-4 text-slate-500" />
          Imprimer l'état comptable
        </button>
      </div>

      {/* Main Fiscal Statement Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row justify-between border-b border-slate-200 pb-4 gap-2">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              État Récapitulatif Fiscal & Commercial
            </h3>
            <p className="text-xs text-slate-500">
              Société : <span className="font-bold text-slate-800">{company.name}</span> • MF :{' '}
              <span className="font-mono font-bold text-slate-800">{company.matricule_fiscal}</span>
            </p>
          </div>
          <div className="text-xs text-slate-500 text-left sm:text-right">
            Date de génération : <span className="font-semibold text-slate-700">{new Date().toLocaleDateString('fr-TN')}</span>
          </div>
        </div>

        {/* Global Figures */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">
              Chiffre d'Affaires Net H.T.
            </span>
            <div className="text-xl font-black font-mono text-slate-900 mt-1">
              {formatTND(report.total_ca_ht)}
            </div>
            <span className="text-[10px] text-slate-400">Hors taxes déductibles</span>
          </div>

          <div className="rounded-lg bg-amber-50/60 p-4 border border-amber-200">
            <span className="text-[11px] font-semibold text-amber-800 uppercase">
              TVA Collectée Totale
            </span>
            <div className="text-xl font-black font-mono text-amber-900 mt-1">
              {formatTND(report.total_tva)}
            </div>
            <span className="text-[10px] text-amber-700">À reverser à l'État</span>
          </div>

          <div className="rounded-lg bg-teal-50/60 p-4 border border-teal-200">
            <span className="text-[11px] font-semibold text-teal-800 uppercase">
              Timbres Fiscaux
            </span>
            <div className="text-xl font-black font-mono text-teal-900 mt-1">
              {formatTND(report.total_timbre)}
            </div>
            <span className="text-[10px] text-teal-700">1.000 DT / facture</span>
          </div>

          <div className="rounded-lg bg-slate-900 p-4 text-white">
            <span className="text-[11px] font-semibold text-slate-300 uppercase">
              Total TTC Facturé
            </span>
            <div className="text-xl font-black font-mono text-amber-400 mt-1">
              {formatTND(report.total_ttc)}
            </div>
            <span className="text-[10px] text-slate-400">Total facturé toutes taxes comprises</span>
          </div>
        </div>

        {/* TVA Breakdown Table */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-teal-700" />
            Ventilation de la TVA Collectée par Taux
          </h4>
          <div className="rounded-lg border border-slate-200 overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Taux de TVA</th>
                  <th className="py-2.5 px-4 text-right">Base Imposable H.T. (DT)</th>
                  <th className="py-2.5 px-4 text-right">Montant TVA (DT)</th>
                  <th className="py-2.5 px-4 text-right">Part du C.A. (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {report.tva_by_rate.map((row) => (
                  <tr key={row.rate} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-bold text-slate-800 font-sans">
                      TVA {row.rate}% {row.rate === 19 ? '(Taux standard)' : row.rate === 7 ? '(Études & Prestations)' : ''}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                      {formatTND(row.base)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-black text-amber-700">
                      {formatTND(row.amount)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-600 font-sans">
                      {report.total_ca_ht > 0
                        ? `${((row.base / report.total_ca_ht) * 100).toFixed(1)}%`
                        : '0.0%'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Client Distribution & Payment Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
          {/* Top Clients by Turnover */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Building className="h-4 w-4 text-teal-700" />
              Répartition du Chiffre d'Affaires par Client
            </h4>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden text-xs">
              {report.top_clients.map((c, idx) => (
                <div key={c.client_id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <div className="font-bold text-slate-800">
                      {idx + 1}. {c.client_name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {c.invoices_count} facture(s) émise(s)
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="font-black text-slate-900 text-sm">
                      {formatTND(c.total_ttc)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payments by Method */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-700" />
              Encaissements par Mode de Règlement
            </h4>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden text-xs">
              {report.payments_by_method.map((p) => (
                <div key={p.method} className="p-3 flex items-center justify-between hover:bg-slate-50">
                  <div className="font-bold capitalize text-slate-800">
                    {p.method} ({p.count} opérations)
                  </div>
                  <div className="text-right font-mono font-black text-emerald-700 text-sm">
                    {formatTND(p.amount)}
                  </div>
                </div>
              ))}
              {report.payments_by_method.length === 0 && (
                <div className="p-4 text-center text-slate-400">
                  Aucun encaissement sur la période.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import {
  DashboardMetrics,
  CommercialDocument,
  Payment,
  CompanySettings,
} from '../types';
import { formatTND } from '../utils/calculations';
import {
  TrendingUp,
  CreditCard,
  AlertCircle,
  FileText,
  Truck,
  Receipt,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  Eye,
  DollarSign,
  Send,
} from 'lucide-react';

interface DashboardViewProps {
  metrics: DashboardMetrics | null;
  company: CompanySettings;
  onPreviewDoc: (doc: CommercialDocument) => void;
  onOpenNewDevis: () => void;
  onOpenNewFacture: () => void;
  onNavigateTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  company,
  onPreviewDoc,
  onOpenNewDevis,
  onOpenNewFacture,
  onNavigateTab,
}) => {
  if (!metrics) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-700" />
        <span className="text-xs text-slate-500 font-medium">Chargement des données ERP...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-[11px] font-semibold text-amber-300 ring-1 ring-amber-500/30 mb-2">
            Direction Commerciale & Financière
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">
            Plateforme Commerciale — {company.name}
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Gestion intégrale : Clients • Devis • Bons de livraison • Factures • Règlements
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenNewDevis}
            className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-teal-500 transition"
          >
            <FileText className="h-4 w-4" />
            Nouveau Devis
          </button>
          <button
            onClick={onOpenNewFacture}
            className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-amber-500 transition"
          >
            <Receipt className="h-4 w-4" />
            Nouvelle Facture
          </button>
        </div>
      </div>

      {/* 4 Primary Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoiced */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Chiffre d'Affaires Facturé
            </span>
            <div className="rounded-lg bg-teal-50 p-2 text-teal-700">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono">
            {formatTND(metrics.total_revenue)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {metrics.count_factures} factures émises
          </div>
        </div>

        {/* Total Collected */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Encaissements Réalisés
            </span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700 font-mono">
            {formatTND(metrics.paid_revenue)}
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 font-medium">
            Règlements reçus en banque / caisse
          </div>
        </div>

        {/* Pending Receivables */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Créances Clients (À Recouvrer)
            </span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-700">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 font-mono">
            {formatTND(metrics.pending_revenue)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            En attente d'échéance ou virement
          </div>
        </div>

        {/* Overdue */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Impayés en Retard
            </span>
            <div className="rounded-lg bg-rose-50 p-2 text-rose-700">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600 font-mono">
            {formatTND(metrics.overdue_revenue)}
          </div>
          <div className="mt-1 text-[11px] text-rose-600 font-medium">
            Nécessite relance client
          </div>
        </div>
      </div>

      {/* Commercial Performance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quote Conversion Rate Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
            Taux de Conversion des Devis
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-teal-800 font-mono">
              {metrics.conversion_rate_devis}%
            </span>
            <span className="text-xs text-slate-500">
              ({metrics.count_devis_accepted} acceptés sur {metrics.count_devis} émis)
            </span>
          </div>

          <div className="mt-3 w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-teal-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, metrics.conversion_rate_devis)}%` }}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-100 text-slate-600">
            <div>
              <span className="text-slate-400">Total Devis : </span>
              <span className="font-bold text-slate-800">{metrics.count_devis}</span>
            </div>
            <div>
              <span className="text-slate-400">Acceptés : </span>
              <span className="font-bold text-emerald-700">
                {metrics.count_devis_accepted}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Bons de livraison : </span>
              <span className="font-bold text-slate-800">{metrics.count_bl}</span>
            </div>
            <div>
              <span className="text-slate-400">Factures émises : </span>
              <span className="font-bold text-slate-800">{metrics.count_factures}</span>
            </div>
          </div>
        </div>

        {/* Monthly Revenue Bars */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Évolution du Chiffre d'Affaires Mensuel (DT)
            </h3>
            <span className="text-[11px] font-medium text-slate-400">
              Facturé vs Encaissé
            </span>
          </div>

          <div className="space-y-3">
            {metrics.monthly_revenue.map((m) => {
              const maxVal = 35000;
              const barTurnover = Math.min(100, (m.turnover / maxVal) * 100);
              const barPaid = Math.min(100, (m.paid / maxVal) * 100);

              return (
                <div key={m.month} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>{m.month}</span>
                    <span className="font-mono text-slate-800">
                      {formatTND(m.turnover)} (dont {formatTND(m.paid)} payés)
                    </span>
                  </div>
                  <div className="relative w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-slate-300 h-3 rounded-full absolute top-0 left-0"
                      style={{ width: `${barTurnover}%` }}
                    />
                    <div
                      className="bg-teal-700 h-3 rounded-full absolute top-0 left-0"
                      style={{ width: `${barPaid}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-end gap-4 text-[11px] text-slate-500 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              <span>Chiffre d'affaires facturé</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-teal-700" />
              <span>Montant encaissé</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Invoices & Devis Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 bg-slate-50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-amber-600" />
              Dernières Factures Émises
            </h3>
            <button
              onClick={() => onNavigateTab('factures')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1"
            >
              Voir tout <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {metrics.recent_invoices.map((inv) => (
              <div
                key={inv.id}
                className="p-4 flex items-center justify-between hover:bg-slate-50 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-800 text-xs">
                      {inv.number}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        inv.status === 'payee'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.status === 'partiellement_payee'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {inv.status === 'payee'
                        ? 'Payée'
                        : inv.status === 'partiellement_payee'
                        ? 'Partielle'
                        : 'Émise'}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-slate-600 mt-0.5">
                    {inv.client_snapshot.name}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Date : {inv.date} • Échéance : {inv.due_date || 'N/A'}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-black text-slate-900 text-sm">
                    {formatTND(inv.totals?.total_ttc)}
                  </div>
                  {inv.amount_remaining !== undefined && inv.amount_remaining > 0 && (
                    <div className="text-[10px] text-rose-600 font-semibold font-mono">
                      Dû : {formatTND(inv.amount_remaining)}
                    </div>
                  )}
                  <button
                    onClick={() => onPreviewDoc(inv)}
                    className="mt-1 inline-flex items-center gap-1 text-[11px] text-teal-700 hover:text-teal-900 font-semibold"
                  >
                    <Eye className="h-3 w-3" /> Aperçu
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Devis */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 bg-slate-50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <FileText className="h-4 w-4 text-teal-700" />
              Derniers Devis Commerciaux
            </h3>
            <button
              onClick={() => onNavigateTab('devis')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1"
            >
              Voir tout <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {metrics.recent_devis.map((dev) => (
              <div
                key={dev.id}
                className="p-4 flex items-center justify-between hover:bg-slate-50 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-800 text-xs">
                      {dev.number}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        dev.status === 'accepte'
                          ? 'bg-emerald-100 text-emerald-800'
                          : dev.status === 'envoye'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {dev.status === 'accepte'
                        ? 'Accepté'
                        : dev.status === 'envoye'
                        ? 'Envoyé'
                        : 'Brouillon'}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-slate-600 mt-0.5">
                    {dev.client_snapshot.name}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Date : {dev.date} • Validité : {dev.validity_date || 'N/A'}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-black text-slate-900 text-sm">
                    {formatTND(dev.totals?.total_ttc)}
                  </div>
                  <button
                    onClick={() => onPreviewDoc(dev)}
                    className="mt-1 inline-flex items-center gap-1 text-[11px] text-teal-700 hover:text-teal-900 font-semibold"
                  >
                    <Eye className="h-3 w-3" /> Aperçu
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

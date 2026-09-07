import React from 'react';
import { Menu, Plus, FileText, Receipt, UserPlus, RefreshCw, CheckCircle2, Lock } from 'lucide-react';
import { CompanySettings } from '../types';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  onNewDevis: () => void;
  onNewFacture: () => void;
  onNewClient: () => void;
  onResetSeed: () => void;
  onLockSession?: () => void;
  company: CompanySettings;
  activeTabTitle: string;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileSidebar,
  onNewDevis,
  onNewFacture,
  onNewClient,
  onResetSeed,
  onLockSession,
  company,
  activeTabTitle,
}) => {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 backdrop-blur-xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <h2 className="text-base font-bold text-slate-800">{activeTabTitle}</h2>
          <p className="hidden sm:block text-[11px] text-slate-500 font-medium">
            {company.name} • {company.city} • Tél : {company.phone}
          </p>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onResetSeed}
          title="Réinitialiser les données de démonstration"
          className="hidden md:flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
        >
          <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
          <span className="hidden xl:inline">Données démo</span>
        </button>

        <button
          onClick={onNewClient}
          className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
        >
          <UserPlus className="h-3.5 w-3.5 text-slate-500" />
          <span>+ Client</span>
        </button>

        <button
          onClick={onNewDevis}
          className="flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 transition shadow-xs"
        >
          <FileText className="h-3.5 w-3.5" />
          <span>+ Devis</span>
        </button>

        <button
          onClick={onNewFacture}
          className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition shadow-xs"
        >
          <Receipt className="h-3.5 w-3.5" />
          <span>+ Facture</span>
        </button>

        {onLockSession && (
          <button
            onClick={onLockSession}
            title="Verrouiller la session (Code 52523200)"
            className="flex items-center p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition border border-slate-200 bg-white"
          >
            <Lock className="h-4 w-4" />
          </button>
        )}
      </div>
    </header>
  );
};

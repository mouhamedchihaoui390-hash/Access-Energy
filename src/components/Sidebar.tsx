import React from 'react';
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Truck,
  Receipt,
  CreditCard,
  BarChart3,
  Settings,
  History,
  Sun,
  ShieldCheck,
} from 'lucide-react';
import { CompanySettings } from '../types';

export type ViewTab =
  | 'dashboard'
  | 'clients'
  | 'products'
  | 'devis'
  | 'bl'
  | 'factures'
  | 'payments'
  | 'reports'
  | 'settings'
  | 'audit';

interface SidebarProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  company: CompanySettings;
  isOpen: boolean;
  onCloseMobile: () => void;
  counts: {
    devis: number;
    bl: number;
    factures: number;
    clients: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  company,
  isOpen,
  onCloseMobile,
  counts,
}) => {
  const menuItems: { id: ViewTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'clients', label: 'Clients & Partenaires', icon: Users, badge: counts.clients },
    { id: 'products', label: 'Produits & Services', icon: Package },
    { id: 'devis', label: 'Devis Commerciaux', icon: FileText, badge: counts.devis },
    { id: 'bl', label: 'Bons de Livraison', icon: Truck, badge: counts.bl },
    { id: 'factures', label: 'Factures & Avoirs', icon: Receipt, badge: counts.factures },
    { id: 'payments', label: 'Règlements & Caisses', icon: CreditCard },
    { id: 'reports', label: 'Rapports Financiers', icon: BarChart3 },
    { id: 'settings', label: 'Configuration & Société', icon: Settings },
    { id: 'audit', label: 'Journal d\'Audit', icon: History },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden backdrop-blur-xs"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex w-64 flex-col bg-slate-950 text-slate-300 transition-transform duration-200 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } border-r border-slate-800 shadow-xl`}
      >
        {/* Brand Banner */}
        <div className="flex items-center gap-3 border-b border-slate-800/80 px-5 py-4 bg-slate-900/60">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 font-black text-slate-950 shadow-md">
            <Sun className="h-6 w-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div className="overflow-hidden">
            <h1 className="truncate text-base font-extrabold tracking-tight text-white">
              {company.name || 'ACCESS ENERGY'}
            </h1>
            <p className="truncate text-[10px] font-semibold tracking-wider text-amber-400 uppercase">
              ERP Commercial Tunisie
            </p>
          </div>
        </div>

        {/* Company Quick Badge */}
        <div className="mx-3 my-2.5 rounded-lg bg-slate-900/90 p-2.5 text-[11px] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 font-medium">
            <span>Matricule Fiscal :</span>
            <span className="font-mono text-amber-300 font-semibold text-[10px]">
              {company.matricule_fiscal || '1954656YAM000'}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400 font-medium mt-1">
            <span>Devise usuelle :</span>
            <span className="font-bold text-slate-200">Dinar Tunisien (DT)</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`group flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-teal-700 text-white shadow-xs font-bold'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`h-4 w-4 shrink-0 transition ${
                      isActive ? 'text-white' : 'text-slate-500 group-hover:text-teal-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold ${
                      isActive
                        ? 'bg-teal-900 text-teal-100'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Fiscal Compliance Badge */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/40 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5 text-teal-400 font-medium mb-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Conforme Législation Tunisienne</span>
          </div>
          <p className="text-[10px] leading-tight text-slate-400">
            Timbre fiscal {company.timbre_fiscal?.toFixed(3) || '1.000'} DT inclus. Facturation en 3 décimales.
          </p>
        </div>
      </aside>
    </>
  );
};

import React from 'react';
import { AuditLog } from '../types';
import { History, Shield, Clock, FileText, CreditCard, Users, Package } from 'lucide-react';

interface AuditViewProps {
  logs: AuditLog[];
}

export const AuditView: React.FC<AuditViewProps> = ({ logs }) => {
  const getIcon = (action: string) => {
    if (action.includes('paiement') || action.includes('reglement')) {
      return <CreditCard className="h-4 w-4 text-emerald-600" />;
    }
    if (action.includes('client')) {
      return <Users className="h-4 w-4 text-teal-600" />;
    }
    if (action.includes('produit')) {
      return <Package className="h-4 w-4 text-amber-600" />;
    }
    return <FileText className="h-4 w-4 text-blue-600" />;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Journal d'Audit & Traçabilité Commerciale</h2>
          <p className="text-xs text-slate-500">
            Historique chronologique et immuable des créations, modifications, conversions et encaissements.
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
          <Shield className="h-4 w-4 text-teal-700" />
          <span>{logs.length} Événements consignés</span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {logs.map((log) => (
            <div key={log.id} className="p-4 flex items-start gap-3 hover:bg-slate-50 transition text-xs">
              <div className="mt-0.5 rounded-lg bg-slate-100 p-2 shrink-0">
                {getIcon(log.action)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 font-mono">
                    {log.action.toUpperCase()}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(log.timestamp).toLocaleString('fr-TN')}
                  </span>
                </div>
                <p className="text-slate-600 mt-1">{log.details}</p>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Utilisateur : <span className="font-semibold">{log.user}</span>
                </div>
              </div>
            </div>
          ))}

          {logs.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">
              Aucune activité enregistrée pour le moment.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

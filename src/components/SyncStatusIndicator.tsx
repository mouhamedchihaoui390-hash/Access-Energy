import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { syncManager, SyncStatus } from '../offline/syncManager';

export const SyncStatusIndicator: React.FC = () => {
  const [status, setStatus] = useState<SyncStatus>('online');
  const [pending, setPending] = useState(0);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    let prevStatus: SyncStatus = 'online';
    const unsubscribe = syncManager.subscribe((s, count) => {
      if (prevStatus === 'syncing' && s === 'online') {
        setJustSynced(true);
        setTimeout(() => setJustSynced(false), 3000);
      }
      prevStatus = s;
      setStatus(s);
      setPending(count);
    });
    return unsubscribe;
  }, []);

  const config: Record<
    SyncStatus,
    { label: string; icon: React.ReactNode; className: string }
  > = {
    online: {
      label: 'En ligne',
      icon: <Wifi className="h-3.5 w-3.5" />,
      className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    },
    offline: {
      label: 'Hors ligne — modifications enregistrées localement',
      icon: <WifiOff className="h-3.5 w-3.5" />,
      className: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    },
    syncing: {
      label: `Synchronisation...${pending > 1 ? ` (${pending})` : ''}`,
      icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" />,
      className: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    },
    error: {
      label: 'Erreur de synchronisation',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      className: 'bg-red-50 text-red-700 ring-red-600/20',
    },
  };

  if (status === 'online' && !justSynced) {
    // Don't clutter the UI when everything is fine and there's nothing to report.
    return null;
  }

  const display = justSynced && status === 'online'
    ? { label: 'Synchronisé', icon: <CheckCircle2 className="h-3.5 w-3.5" />, className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' }
    : config[status];

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset transition-colors ${display.className}`}
      title={display.label}
    >
      {display.icon}
      <span className="hidden sm:inline">{display.label}</span>
    </div>
  );
};

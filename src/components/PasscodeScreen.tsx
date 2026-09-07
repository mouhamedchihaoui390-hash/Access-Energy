import React, { useState } from 'react';
import { AccessEnergyLogo } from './AccessEnergyLogo';
import { Lock, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

interface PasscodeScreenProps {
  onSuccess: () => void;
}

export const PasscodeScreen: React.FC<PasscodeScreenProps> = ({ onSuccess }) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // GitHub Pages has no Express backend. In Pages mode, authenticate locally.
      const isGitHubPages = window.location.hostname.endsWith('github.io');
      if (isGitHubPages) {
        if (passcode === '52523200') {
          localStorage.setItem('access_energy_auth_token', 'local_auth_ok');
          onSuccess();
        } else {
          setError('Code d\'accès invalide. Veuillez réessayer.');
        }
        return;
      }

      const res = await fetch('/api/auth/verify-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('access_energy_auth_token', data.token || 'authenticated');
        onSuccess();
      } else {
        setError(data.error || 'Code d\'accès invalide. Veuillez réessayer.');
      }
    } catch {
      if (passcode === '52523200') {
        localStorage.setItem('access_energy_auth_token', 'local_auth_ok');
        onSuccess();
      } else {
        setError('Code d\'accès invalide. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 bg-radial-[at_top] from-slate-900 via-slate-950 to-black p-4 relative overflow-hidden font-sans">
      {/* Subtle background decorative shapes */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative z-10 transition-all">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 p-6 text-white text-center">
          <div className="flex justify-center mb-3">
            <div className="bg-white p-2.5 rounded-xl shadow-md inline-block">
              <AccessEnergyLogo className="h-10 w-auto" />
            </div>
          </div>
          <h2 className="text-lg font-bold tracking-tight">Portail Commercial</h2>
          <p className="text-xs text-blue-200 mt-0.5">
            Gestion des Devis, Bons de Livraison & Factures
          </p>
        </div>

        {/* Card Body */}
        <div className="p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-blue-700 mb-3 border border-blue-100">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Accès Sécurisé</h3>
            <p className="text-xs text-slate-500 mt-1">
              Veuillez saisir votre code d'accès confidentiel pour ouvrir votre session de travail.
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 animate-shake">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 text-center">
                Code d'accès
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  autoFocus
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="••••••••"
                  className="w-full text-center text-xl tracking-widest font-mono font-bold py-3 px-4 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-hidden transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !passcode.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs py-3 px-4 shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{loading ? 'Vérification...' : 'Déverrouiller l\'application'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Environnement ACCESS ENERGY sécurisé</span>
          </div>
        </div>
      </div>
    </div>
  );
};

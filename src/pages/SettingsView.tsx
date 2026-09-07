import React, { useState } from 'react';
import { CompanySettings } from '../types';
import { Settings, Save, Building, Phone, Mail, Landmark, FileText, CheckCircle2 } from 'lucide-react';

interface SettingsViewProps {
  company: CompanySettings;
  onSaveCompany: (updated: CompanySettings) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  company,
  onSaveCompany,
}) => {
  const [formData, setFormData] = useState<CompanySettings>(company);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await onSaveCompany(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la mise à jour des paramètres');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Paramètres de l'Entreprise</h2>
          <p className="text-xs text-slate-500">
            Coordonnées légales, en-tête et pied de page des documents officiels (Devis, BL, Factures).
          </p>
        </div>

        {saved && (
          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-4 w-4" /> Paramètres enregistrés !
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Identity */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building className="h-4 w-4 text-teal-700" />
            <h3 className="font-bold text-slate-800 text-sm">
              Identité de l'Entreprise & Données Fiscales
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Raison Sociale *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-md border border-slate-300 p-2 font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Slogan / Sous-titre
              </label>
              <input
                type="text"
                value={formData.tagline || ''}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full rounded-md border border-slate-300 p-2"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Matricule Fiscal (MF) *
              </label>
              <input
                type="text"
                required
                value={formData.matricule_fiscal}
                onChange={(e) =>
                  setFormData({ ...formData, matricule_fiscal: e.target.value })
                }
                className="w-full rounded-md border border-slate-300 p-2 font-mono font-bold text-teal-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Registre de Commerce (RC)
              </label>
              <input
                type="text"
                value={formData.registre_commerce}
                onChange={(e) =>
                  setFormData({ ...formData, registre_commerce: e.target.value })
                }
                className="w-full rounded-md border border-slate-300 p-2 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Code en Douane (CD)
              </label>
              <input
                type="text"
                value={formData.code_tva || ''}
                onChange={(e) => setFormData({ ...formData, code_tva: e.target.value })}
                className="w-full rounded-md border border-slate-300 p-2 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Timbre Fiscal Unitaire (DT) *
              </label>
              <input
                type="number"
                step="0.100"
                min="0"
                required
                value={formData.timbre_fiscal}
                onChange={(e) =>
                  setFormData({ ...formData, timbre_fiscal: parseFloat(e.target.value) || 0 })
                }
                className="w-full rounded-md border border-slate-300 p-2 font-mono font-bold text-amber-800"
              />
              <span className="text-[10px] text-slate-400">
                Législation tunisienne en vigueur : 1.000 DT par facture
              </span>
            </div>
          </div>
        </div>

        {/* Contact & Address */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Phone className="h-4 w-4 text-teal-700" />
            <h3 className="font-bold text-slate-800 text-sm">Coordonnées & Siège Social</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Adresse Siège *
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full rounded-md border border-slate-300 p-2"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Ville / Gouvernorat
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full rounded-md border border-slate-300 p-2"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Téléphone commercial *
              </label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-md border border-slate-300 p-2"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                E-mail officiel *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-md border border-slate-300 p-2"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Site Web
              </label>
              <input
                type="text"
                value={formData.website || ''}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full rounded-md border border-slate-300 p-2"
              />
            </div>
          </div>
        </div>

        {/* Bank & Payment Information */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Landmark className="h-4 w-4 text-teal-700" />
            <h3 className="font-bold text-slate-800 text-sm">
              Coordonnées Bancaires (RIB pour Virement)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nom de la Banque
              </label>
              <input
                type="text"
                value={formData.bank_name || ''}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                placeholder="Ex: BIAT Agence Bir Mchargua"
                className="w-full rounded-md border border-slate-300 p-2"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Numéro de RIB (20 chiffres)
              </label>
              <input
                type="text"
                value={formData.bank_rib || ''}
                onChange={(e) => setFormData({ ...formData, bank_rib: e.target.value })}
                placeholder="Ex: 08 100 0001234567890 45"
                className="w-full rounded-md border border-slate-300 p-2 font-mono font-bold text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Legal Footer for Documents */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText className="h-4 w-4 text-teal-700" />
            <h3 className="font-bold text-slate-800 text-sm">
              Mentions Légales de Bas de Page
            </h3>
          </div>

          <div className="text-xs">
            <label className="block font-semibold text-slate-700 mb-1">
              Texte imprimé en bas des devis et factures
            </label>
            <textarea
              rows={3}
              value={formData.footer_notes || ''}
              onChange={(e) => setFormData({ ...formData, footer_notes: e.target.value })}
              className="w-full rounded-md border border-slate-300 p-2 font-mono text-[11px]"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-teal-700 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-teal-800 transition disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Enregistrement...' : 'Enregistrer les Modifications'}
          </button>
        </div>
      </form>
    </div>
  );
};

import React, { useState } from 'react';
import { Client, ClientType } from '../types';
import { X, Save, User, Building } from 'lucide-react';

interface ClientModalProps {
  initialClient?: Client | null;
  onClose: () => void;
  onSave: (clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
}

const TUNISIAN_GOVERNORATES = [
  'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa', 'Jendouba',
  'Kairouan', 'Kasserine', 'Kébili', 'Le Kef', 'Mahdia', 'La Manouba',
  'Médenine', 'Monastir', 'Nabeul', 'Sfax', 'Sidi Bouzid', 'Siliana',
  'Sousse', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan'
];

export const ClientModal: React.FC<ClientModalProps> = ({
  initialClient,
  onClose,
  onSave,
}) => {
  const [clientType, setClientType] = useState<ClientType>(
    initialClient?.client_type || 'entreprise'
  );
  const [name, setName] = useState(initialClient?.name || '');
  const [companyName, setCompanyName] = useState(initialClient?.company_name || '');
  const [matriculeFiscal, setMatriculeFiscal] = useState(initialClient?.matricule_fiscal || '');
  const [registreCommerce, setRegistreCommerce] = useState(initialClient?.registre_commerce || '');
  const [cin, setCin] = useState(initialClient?.cin || '');
  const [phone, setPhone] = useState(initialClient?.phone || '');
  const [email, setEmail] = useState(initialClient?.email || '');
  const [address, setAddress] = useState(initialClient?.address || '');
  const [city, setCity] = useState(initialClient?.city || 'Tunis');
  const [governorate, setGovernorate] = useState(initialClient?.governorate || 'Tunis');
  const [postalCode, setPostalCode] = useState(initialClient?.postal_code || '');
  const [notes, setNotes] = useState(initialClient?.notes || '');
  const [status, setStatus] = useState<'actif' | 'inactif'>(initialClient?.status || 'actif');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    try {
      setSaving(true);
      await onSave({
        client_type: clientType,
        name,
        company_name: companyName,
        matricule_fiscal: matriculeFiscal,
        registre_commerce: registreCommerce,
        cin,
        phone,
        email,
        address,
        city,
        governorate,
        postal_code: postalCode,
        notes,
        status,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la sauvegarde du client');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-5">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-teal-100 p-2 text-teal-800">
              <Building className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">
              {initialClient ? `Modifier la fiche client : ${initialClient.name}` : 'Nouveau Client'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Type Switcher */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Type de client
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="clientType"
                  checked={clientType === 'entreprise'}
                  onChange={() => setClientType('entreprise')}
                  className="text-teal-700 focus:ring-teal-600"
                />
                <span className="font-medium text-slate-800">Entreprise / Professionnel / Société</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="clientType"
                  checked={clientType === 'particulier'}
                  onChange={() => setClientType('particulier')}
                  className="text-teal-700 focus:ring-teal-600"
                />
                <span className="font-medium text-slate-800">Particulier</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {clientType === 'entreprise' ? 'Nom du contact / Gérant *' : 'Nom et Prénom *'}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: M. Mohamed Ben Salem"
                className="w-full rounded-md border border-slate-300 p-2 font-medium"
              />
            </div>

            {clientType === 'entreprise' ? (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Raison sociale / Nom entreprise
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex: Domaine Agricole El Amen SARL"
                  className="w-full rounded-md border border-slate-300 p-2 font-medium"
                />
              </div>
            ) : (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  N° CIN (Carte d'Identité Nationale)
                </label>
                <input
                  type="text"
                  value={cin}
                  onChange={(e) => setCin(e.target.value)}
                  placeholder="Ex: 04879612"
                  className="w-full rounded-md border border-slate-300 p-2 font-mono"
                />
              </div>
            )}
          </div>

          {clientType === 'entreprise' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Matricule Fiscal (MF)
                </label>
                <input
                  type="text"
                  value={matriculeFiscal}
                  onChange={(e) => setMatriculeFiscal(e.target.value)}
                  placeholder="Ex: 1458923/B/N/000"
                  className="w-full rounded-md border border-slate-300 p-2 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Registre de Commerce (RC)
                </label>
                <input
                  type="text"
                  value={registreCommerce}
                  onChange={(e) => setRegistreCommerce(e.target.value)}
                  placeholder="Ex: B1245892021"
                  className="w-full rounded-md border border-slate-300 p-2 font-mono"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Numéro de téléphone *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 28 057 771 / 72 680 120"
                className="w-full rounded-md border border-slate-300 p-2"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Adresse e-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex: contact@client.tn"
                className="w-full rounded-md border border-slate-300 p-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block font-semibold text-slate-700 mb-1">
                Gouvernorat
              </label>
              <select
                value={governorate}
                onChange={(e) => {
                  setGovernorate(e.target.value);
                  setCity(e.target.value);
                }}
                className="w-full rounded-md border border-slate-300 p-2"
              >
                {TUNISIAN_GOVERNORATES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-1">
              <label className="block font-semibold text-slate-700 mb-1">
                Ville / Délégation
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: Bir Mchargua"
                className="w-full rounded-md border border-slate-300 p-2"
              />
            </div>

            <div className="col-span-1">
              <label className="block font-semibold text-slate-700 mb-1">
                Code Postal
              </label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="Ex: 1141"
                className="w-full rounded-md border border-slate-300 p-2 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Adresse physique complète
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex: Route de Pont du Fahs, Bir Mchargua"
              className="w-full rounded-md border border-slate-300 p-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Notes commerciales
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Chantier agricole, contact technique..."
                className="w-full rounded-md border border-slate-300 p-2"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Statut
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full rounded-md border border-slate-300 p-2"
              >
                <option value="actif">Actif</option>
                <option value="inactif">Inactif / Archivé</option>
              </select>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-teal-700 px-5 py-2 text-xs font-semibold text-white hover:bg-teal-800 transition shadow-xs disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Enregistrement...' : 'Enregistrer le client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

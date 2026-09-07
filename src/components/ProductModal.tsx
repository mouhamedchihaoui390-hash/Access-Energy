import React, { useState } from 'react';
import { Product } from '../types';
import { X, Save, Package } from 'lucide-react';

interface ProductModalProps {
  initialProduct?: Product | null;
  onClose: () => void;
  onSave: (productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
}

const UNITS = [
  'Pièce',
  'Unité',
  'Mètre',
  'Forfait',
  'Kit',
  'Heure',
  'Jour',
  'Rouleau',
  'Kg',
];

const CATEGORIES = [
  'Panneaux Photovoltaïques',
  'Onduleurs',
  'Pompage Solaire',
  'Stockage & Batteries',
  'Protection Électrique',
  'Câblage & Accessoires',
  'Structure & Fixation',
  'Services & Main d\'œuvre',
  'Autre',
];

export const ProductModal: React.FC<ProductModalProps> = ({
  initialProduct,
  onClose,
  onSave,
}) => {
  const [reference, setReference] = useState(initialProduct?.reference || '');
  const [designation, setDesignation] = useState(initialProduct?.designation || '');
  const [description, setDescription] = useState(initialProduct?.description || '');
  const [category, setCategory] = useState(initialProduct?.category || CATEGORIES[0]);
  const [unit, setUnit] = useState(initialProduct?.unit || 'Pièce');
  const [purchasePriceHT, setPurchasePriceHT] = useState(
    initialProduct?.purchase_price_ht?.toString() || '0'
  );
  const [salePriceHT, setSalePriceHT] = useState(
    initialProduct?.sale_price_ht?.toString() || '0'
  );
  const [tva, setTva] = useState(initialProduct?.tva ?? 19);
  const [stock, setStock] = useState(initialProduct?.stock?.toString() || '0');
  const [active, setActive] = useState(initialProduct?.active ?? true);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reference || !designation || !salePriceHT) return;

    try {
      setSaving(true);
      await onSave({
        reference,
        designation,
        description,
        category,
        unit,
        purchase_price_ht: parseFloat(purchasePriceHT) || 0,
        sale_price_ht: parseFloat(salePriceHT) || 0,
        tva: Number(tva),
        stock: parseInt(stock) || 0,
        active,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la sauvegarde de l\'article');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-5">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-teal-100 p-2 text-teal-800">
              <Package className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">
              {initialProduct ? `Modifier l'article : ${initialProduct.reference}` : 'Nouvel Article / Service'}
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
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block font-semibold text-slate-700 mb-1">
                Référence code *
              </label>
              <input
                type="text"
                required
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ex: PV-550W"
                className="w-full rounded-md border border-slate-300 p-2 font-mono font-bold text-teal-900"
              />
            </div>

            <div className="col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Désignation produit / service *
              </label>
              <input
                type="text"
                required
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="Ex: Panneau Solaire Monocristallin 550W Tier 1"
                className="w-full rounded-md border border-slate-300 p-2 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Catégorie
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Unité de mesure
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Prix Vente H.T. (DT) *
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                required
                value={salePriceHT}
                onChange={(e) => setSalePriceHT(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2 font-mono font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Taux TVA (%)
              </label>
              <select
                value={tva}
                onChange={(e) => setTva(Number(e.target.value))}
                className="w-full rounded-md border border-slate-300 p-2 font-mono"
              >
                <option value={19}>19% (Standard)</option>
                <option value={7}>7% (Services/Études)</option>
                <option value={13}>13% (Intermédiaire)</option>
                <option value={0}>0% (Exonéré)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Prix Achat H.T. (DT)
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={purchasePriceHT}
                onChange={(e) => setPurchasePriceHT(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2 font-mono text-slate-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Stock disponible
              </label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Statut
              </label>
              <select
                value={active ? 'true' : 'false'}
                onChange={(e) => setActive(e.target.value === 'true')}
                className="w-full rounded-md border border-slate-300 p-2"
              >
                <option value="true">Actif (disponible pour vente)</option>
                <option value="false">Inactif / Masqué</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Description technique détaillée
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Caractéristiques techniques, garantie constructeur, normes..."
              className="w-full rounded-md border border-slate-300 p-2"
            />
          </div>

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
              {saving ? 'Enregistrement...' : 'Enregistrer le produit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

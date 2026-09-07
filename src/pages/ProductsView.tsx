import React, { useState } from 'react';
import { Product } from '../types';
import { formatTND } from '../utils/calculations';
import { Package, Search, Plus, Edit, Trash2, Tag, Layers, CheckCircle2 } from 'lucide-react';

interface ProductsViewProps {
  products: Product[];
  onNewProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => Promise<void>;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  onNewProduct,
  onEditProduct,
  onDeleteProduct,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDelete = async (product: Product) => {
    if (
      window.confirm(
        `Désactiver l'article [${product.reference}] "${product.designation}" ?`
      )
    ) {
      await onDeleteProduct(product.id);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Catalogue Produits & Prestations</h2>
          <p className="text-xs text-slate-500">
            Articles solaires, onduleurs, pompage, câblages et forfaits d'installation avec TVA tunisienne.
          </p>
        </div>

        <button
          onClick={onNewProduct}
          className="flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800 transition"
        >
          <Plus className="h-4 w-4" />
          Nouvel Article / Service
        </button>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par référence, désignation, mots-clés..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-xs placeholder:text-slate-400 focus:border-teal-600 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-teal-600 focus:outline-hidden"
          >
            <option value="all">Toutes les catégories ({products.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-4">Référence</th>
                <th className="py-3 px-4">Désignation & Caractéristiques</th>
                <th className="py-3 px-4">Catégorie</th>
                <th className="py-3 px-4 text-center">Unité</th>
                <th className="py-3 px-4 text-right">Prix Vente HT</th>
                <th className="py-3 px-4 text-center">TVA %</th>
                <th className="py-3 px-4 text-right">Prix TTC (Calculé)</th>
                <th className="py-3 px-4 text-center">Stock</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const ttc = p.sale_price_ht * (1 + p.tva / 100);
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-teal-800">
                      {p.reference}
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900">{p.designation}</div>
                      {p.description && (
                        <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {p.description}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                        <Tag className="h-3 w-3 text-slate-400" />
                        {p.category}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center text-slate-600 font-medium">
                      {p.unit}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                      {formatTND(p.sale_price_ht)}
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-semibold text-slate-600">
                      {p.tva}%
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-black text-amber-700">
                      {formatTND(ttc)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
                          (p.stock || 0) > 10
                            ? 'bg-emerald-100 text-emerald-800'
                            : (p.stock || 0) > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {p.stock}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onEditProduct(p)}
                          title="Modifier l'article"
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          title="Désactiver"
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 text-xs">
                    Aucun article trouvé dans le catalogue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

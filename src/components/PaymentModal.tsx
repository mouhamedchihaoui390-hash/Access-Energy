import React, { useState } from 'react';
import { CommercialDocument, PaymentMethod } from '../types';
import { formatTND } from '../utils/calculations';
import { X, CheckCircle, CreditCard, AlertCircle } from 'lucide-react';

interface PaymentModalProps {
  invoice: CommercialDocument;
  onClose: () => void;
  onSubmit: (paymentData: {
    invoice_id: string;
    invoice_number: string;
    client_id: string;
    client_name: string;
    amount: number;
    method: PaymentMethod;
    reference?: string;
    bank?: string;
    date: string;
    notes?: string;
  }) => Promise<void>;
}

const TUNISIAN_BANKS = [
  'BIAT',
  'Attijari Bank',
  'BNA (Banque Nationale Agricole)',
  'STB (Société Tunisienne de Banque)',
  'Amen Bank',
  'BH Bank',
  'UIB',
  'BT (Banque de Tunisie)',
  'ATB (Arab Tunisian Bank)',
  'Zitouna Bank',
  'Poste Tunisienne',
  'Autre',
];

export const PaymentModal: React.FC<PaymentModalProps> = ({
  invoice,
  onClose,
  onSubmit,
}) => {
  const remaining = invoice.amount_remaining ?? invoice.totals?.total_ttc ?? 0;
  const [amount, setAmount] = useState<number>(remaining);
  const [method, setMethod] = useState<PaymentMethod>('cheque');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState<string>('');
  const [bank, setBank] = useState<string>('BIAT');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setErrorMsg('Veuillez spécifier un montant positif supérieur à 0 DT.');
      return;
    }

    if (amount > remaining + 0.001) {
      if (
        !window.confirm(
          `Attention : Le montant saisi (${amount.toFixed(
            3
          )} DT) est supérieur au reliquat dû (${remaining.toFixed(
            3
          )} DT). Voulez-vous continuer ?`
        )
      ) {
        return;
      }
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      await onSubmit({
        invoice_id: invoice.id,
        invoice_number: invoice.number,
        client_id: invoice.client_id,
        client_name: invoice.client_snapshot.name,
        amount: Number(amount),
        method,
        reference,
        bank: method === 'cheque' || method === 'virement' || method === 'traite' ? bank : undefined,
        date,
        notes,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de l\'enregistrement du paiement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl border border-slate-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Enregistrer un Règlement
              </h3>
              <p className="text-xs text-slate-500">
                Facture <span className="font-mono font-semibold text-slate-800">{invoice.number}</span> —{' '}
                {invoice.client_snapshot.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Invoice Summary Card */}
        <div className="mb-5 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-xs border border-slate-200">
          <div>
            <div className="text-slate-500">Total TTC :</div>
            <div className="font-mono font-bold text-slate-800">
              {formatTND(invoice.totals?.total_ttc)}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Déjà Payé :</div>
            <div className="font-mono font-bold text-emerald-700">
              {formatTND(invoice.amount_paid || 0)}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Reste à Payer :</div>
            <div className="font-mono font-bold text-rose-700">
              {formatTND(remaining)}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Montant à encaisser (DT) *
              </label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                required
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm font-mono font-bold text-emerald-800 focus:border-emerald-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Date du règlement *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-800 focus:border-teal-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Mode de règlement *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['cheque', 'virement', 'especes', 'traite'] as PaymentMethod[]).map(
                (m) => (
                  <button
                    type="button"
                    key={m}
                    onClick={() => setMethod(m)}
                    className={`py-2 px-2 rounded-md font-medium capitalize border text-center transition ${
                      method === m
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {m}
                  </button>
                )
              )}
            </div>
          </div>

          {(method === 'cheque' || method === 'virement' || method === 'traite') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Banque émettrice
                </label>
                <select
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-800"
                >
                  {TUNISIAN_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  N° de Chèque / Réf Virement
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ex: CHQ 78945612"
                  className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs font-mono"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Observations / Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Reçu par le commercial à l'agence..."
              className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs"
            />
          </div>

          {/* Actions */}
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
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-xs disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              {loading ? 'Validation...' : 'Valider l\'Encaissement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

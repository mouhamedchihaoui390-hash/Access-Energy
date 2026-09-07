import * as XLSX from 'xlsx';
import { CommercialDocument, CompanySettings } from '../types';

export function exportDocumentToExcel(doc: CommercialDocument, company: CompanySettings) {
  const isDevis = doc.type === 'devis';
  const isBL = doc.type === 'bl' || doc.type === 'bon_livraison';
  const title = isDevis ? 'DEVIS' : isBL ? 'BON DE LIVRAISON' : 'FACTURE';

  const rows: any[][] = [];

  // Header / Company
  rows.push([company.name || 'ACCESS ENERGY']);
  rows.push([company.subtitle || 'ÉNERGIE SOLAIRE • PV BT • POMPAGE • MT']);
  rows.push([`${company.address_line1 || ''} ${company.address_line2 || ''}`]);
  rows.push([`Tél: ${company.phone || ''}`, `Email: ${company.email || ''}`, `MF/RC: ${company.matricule_fiscal || ''}`]);
  rows.push([]);

  // Document details
  rows.push([title, doc.number]);
  rows.push(['Date', doc.date]);
  if (doc.description) {
    rows.push(['Description', doc.description]);
  }
  rows.push([]);

  // Client Details
  rows.push(['INFORMATIONS CLIENT']);
  rows.push(['Nom', doc.client_snapshot.name]);
  rows.push(['Téléphone', doc.client_snapshot.phone]);
  rows.push(['Adresse', doc.client_snapshot.address]);
  rows.push(['Email', doc.client_snapshot.email]);
  rows.push(['CIN / Matricule Fiscale', doc.client_snapshot.matricule_fiscal || doc.client_snapshot.cin || '']);
  rows.push([]);

  // Product table header
  if (doc.has_remise) {
    rows.push(['Désignation', 'Quantité', 'P.U. H.T. (TND)', 'Remise %', 'Total H.T. (TND)', 'TVA %', 'Total TTC (TND)']);
    doc.lines.forEach((l) => {
      rows.push([
        l.designation,
        Number(l.quantity),
        Number(l.unit_price_ht),
        Number(l.discount_percent || 0),
        Number(l.total_ht),
        `${l.tva_percent}%`,
        Number(l.total_ttc),
      ]);
    });
  } else {
    rows.push(['Désignation', 'Quantité', 'P.U. H.T. (TND)', 'Total H.T. (TND)', 'TVA %', 'Total TTC (TND)']);
    doc.lines.forEach((l) => {
      rows.push([
        l.designation,
        Number(l.quantity),
        Number(l.unit_price_ht),
        Number(l.total_ht),
        `${l.tva_percent}%`,
        Number(l.total_ttc),
      ]);
    });
  }

  rows.push([]);
  // Totals
  rows.push(['', '', 'Montant Total HT', Number(doc.totals.subtotal_net_ht)]);
  (doc.totals.tva_details || []).forEach((t) => {
    rows.push(['', '', `TVA ${t.rate}%`, Number(t.amount_tva)]);
  });
  rows.push(['', '', 'TOTAL TTC (TND)', Number(doc.totals.total_ttc)]);
  rows.push([]);
  rows.push(['Arrêté à la somme de :', doc.arrete_somme || '']);
  rows.push([]);
  rows.push(['Merci pour votre confiance.']);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  ws['!cols'] = [
    { wch: 38 }, // Désignation / Label
    { wch: 12 }, // Qté
    { wch: 18 }, // PU HT
    { wch: 18 }, // Remise or Total HT
    { wch: 12 }, // TVA %
    { wch: 18 }, // Total TTC
  ];

  XLSX.utils.book_append_sheet(wb, ws, title);
  XLSX.writeFile(wb, `${doc.number}.xlsx`);
}

import React, { useRef, useState } from 'react';
import { CommercialDocument, CompanySettings } from '../types';
import { formatTND, numberToWordsTunisianTND } from '../utils/calculations';
import { printElementViaIframe } from '../utils/printIframe';
import { AccessEnergyLogo } from './AccessEnergyLogo';
import { exportDocumentToWord } from '../utils/exportWord';
import { exportDocumentToExcel } from '../utils/exportExcel';
import {
  Printer,
  Download,
  FileText,
  FileSpreadsheet,
  Share2,
  X,
  Edit,
  ArrowRightCircle,
  Zap,
  CheckSquare,
  Square,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  FileCheck,
  Calendar,
  PenTool,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

interface DocumentPreviewProps {
  document: CommercialDocument;
  company: CompanySettings;
  onClose: () => void;
  onEdit?: () => void;
  onConvertToBL?: () => void;
  onConvertToFacture?: () => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  document: doc,
  company,
  onClose,
  onEdit,
  onConvertToBL,
  onConvertToFacture,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  // Format dates: DD / MM / YYYY
  const formatDateFR = (dStr?: string) => {
    if (!dStr) return '__ / __ / ______';
    if (dStr.includes('/')) return dStr;
    const parts = dStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]} / ${parts[1]} / ${parts[0]}`;
    }
    return dStr;
  };

  const handlePrint = async () => {
    if (!printRef.current) {
      window.print();
      return;
    }
    await printElementViaIframe(printRef.current, `${titleText} ${doc.number || ''}`.trim());
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    try {
      setIsExporting(true);
      setExportError(null);

      // Using html2canvas-pro with desktop window simulation for exact A4 rendering
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 5) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${doc.number || 'document'}.pdf`);
    } catch (err: any) {
      console.error('Erreur lors de la génération du PDF:', err);
      setExportError(
        err?.message ||
          'Une erreur est survenue lors de la génération du PDF. Vous pouvez également cliquer sur "Imprimer" pour sauvegarder directement en PDF.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${titleText} ${doc.number} - ACCESS ENERGY`,
          text: `Document commercial ${doc.number} pour ${doc.client_snapshot.name}`,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback to copy link
      }
    }
    navigator.clipboard.writeText(window.location.href);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2500);
  };

  const isDevis = doc.type === 'devis';
  const isBL = doc.type === 'bl' || doc.type === 'bon_livraison';
  const titleText = isDevis ? 'DEVIS' : isBL ? 'BON DE LIVRAISON' : 'FACTURE';

  const arreteText =
    doc.arrete_somme ||
    `Arrêté le présent ${titleText.toLowerCase()} à la somme de : ${numberToWordsTunisianTND(
      doc.totals?.total_ttc || 0
    )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      {/* Container Dialog */}
      <div className="relative flex flex-col max-h-[98vh] w-full max-w-5xl rounded-2xl bg-slate-100 shadow-2xl print:max-h-none print:w-full print:rounded-none print:shadow-none print:bg-white">
        
        {/* Top Control Bar (Hidden when printing) */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-white px-5 py-3 rounded-t-2xl print:hidden gap-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-700/20 uppercase tracking-wider">
              {titleText}
            </span>
            <span className="font-bold text-slate-800 text-sm">{doc.number}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onConvertToBL && isDevis && (
              <button
                onClick={onConvertToBL}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
              >
                <ArrowRightCircle className="h-4 w-4" />
                <span>Convertir en BL</span>
              </button>
            )}

            {onConvertToFacture && (isDevis || isBL) && (
              <button
                onClick={onConvertToFacture}
                className="flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition"
              >
                <ArrowRightCircle className="h-4 w-4" />
                <span>Convertir en Facture</span>
              </button>
            )}

            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <Edit className="h-3.5 w-3.5" />
                <span>Modifier</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              title="Imprimer directement le document A4"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              <span>Imprimer</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isExporting ? 'Génération...' : 'Télécharger PDF'}</span>
            </button>

            <button
              onClick={() => exportDocumentToWord(doc, company)}
              className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Word</span>
            </button>

            <button
              onClick={() => exportDocumentToExcel(doc, company)}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Excel</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <Share2 className="h-3.5 w-3.5 text-slate-500" />
              <span>{shareCopied ? 'Lien copié !' : 'Partager'}</span>
            </button>

            <button
              onClick={onClose}
              className="ml-1 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {exportError && (
          <div className="mx-6 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between print:hidden">
            <span>{exportError}</span>
            <button
              onClick={() => setExportError(null)}
              className="text-red-500 hover:text-red-800 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Scrollable Printable A4 Canvas */}
        <div className="overflow-y-auto p-3 sm:p-6 flex justify-center print:overflow-visible print:p-0">
          <div
            ref={printRef}
            id="printable-document"
            className="w-full max-w-[210mm] min-h-[297mm] bg-white p-7 sm:p-9 text-slate-800 shadow-md border border-slate-200 print:border-none print:shadow-none print:p-6 print:min-h-0 print:w-full relative flex flex-col justify-between"
            style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
          >
            {/* Top Main Section */}
            <div>
              {/* HEADER SECTION (EXACT REFERENCE MATCH) */}
              <div className="flex justify-between items-start gap-4 mb-4">
                {/* Left Side: ACCESS ENERGY Identity & Contact */}
                <div className="max-w-[55%]">
                  <div className="mb-2">
                    <AccessEnergyLogo className="h-14 sm:h-16 w-auto" />
                  </div>
                  
                  <div className="text-[11px] leading-[1.45] text-slate-600 space-y-0.5">
                    <p className="font-bold text-slate-700 tracking-wide text-[10.5px]">
                      {company.subtitle || 'ÉNERGIE SOLAIRE • PV BT • POMPAGE • MT'}
                    </p>
                    <p className="uppercase">{company.address_line1 || 'AV FARHAD HACHET - BIR MCHARGUA - ZAGHOUAN'}</p>
                    {company.address_line2 && <p className="uppercase">{company.address_line2}</p>}
                    
                    <div className="pt-1 space-y-0.5">
                      <p className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span><strong className="text-slate-700">Tél :</strong> {company.phone || '28 057 771 / 29256084'}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span><strong className="text-slate-700">Identifiant unique / RC :</strong> {company.matricule_fiscal || '1954656YAM000'}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span><strong className="text-slate-700">E-mail :</strong> {company.email || 'solution.accessenergy@gmail.com'}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Side: Blue Solar Panel Banner & Date */}
                <div className="w-[42%] flex flex-col items-end">
                  {/* Solar Curved Banner */}
                  <div className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 p-4 text-white shadow-md border border-blue-500/30">
                    {/* Background Decorative Solar Cells Pattern */}
                    <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />
                    
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-xs">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h2 className="text-xl sm:text-2xl font-black tracking-wider text-white leading-none">
                            {titleText}
                          </h2>
                          <div className="text-xs font-bold text-blue-100 tracking-wide mt-1">
                            N° {doc.number}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Date badge directly below banner */}
                  <div className="mt-2.5 flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Date : {formatDateFR(doc.date)}</span>
                  </div>
                </div>
              </div>

              {/* CLIENT SECTION (Rounded Card Matching Reference) */}
              <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/30 p-3.5 shadow-xs">
                <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-blue-100/70">
                  <div className="w-2 h-2 rounded-full bg-blue-600" />
                  <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                    Informations Client
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                  {/* Left Column */}
                  <div className="space-y-1">
                    <p>
                      <strong className="text-slate-700">Nom :</strong>{' '}
                      <span className="font-semibold text-slate-900">
                        {doc.client_snapshot.company_name
                          ? `${doc.client_snapshot.name} (${doc.client_snapshot.company_name})`
                          : doc.client_snapshot.name}
                      </span>
                    </p>
                    <p>
                      <strong className="text-slate-700">Téléphone :</strong>{' '}
                      <span className="text-slate-800">{doc.client_snapshot.phone || 'Non spécifié'}</span>
                    </p>
                    <p>
                      <strong className="text-slate-700">Adresse :</strong>{' '}
                      <span className="text-slate-800">
                        {doc.client_snapshot.address}
                        {doc.client_snapshot.city ? `, ${doc.client_snapshot.city}` : ''}
                      </span>
                    </p>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-1">
                    <p>
                      <strong className="text-slate-700">E-mail :</strong>{' '}
                      <span className="text-slate-800">{doc.client_snapshot.email || 'Non spécifié'}</span>
                    </p>
                    <p>
                      <strong className="text-slate-700">CIN/Matricule fiscale :</strong>{' '}
                      <span className="font-mono text-slate-900 font-medium">
                        {doc.client_snapshot.matricule_fiscal ||
                          doc.client_snapshot.cin ||
                          doc.client_snapshot.cin_matricule_fiscale ||
                          'Non spécifié'}
                      </span>
                    </p>
                    <p>
                      <strong className="text-slate-700">Référence client :</strong>{' '}
                      <span className="text-slate-800">{doc.client_snapshot.reference_client || '-'}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* PHOTOVOLTAIC DESCRIPTION SECTION (Dedicated Highlighted Rounded Section) */}
              {doc.description && (
                <div className="mb-4 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/90 to-sky-50/70 p-3 shadow-2xs flex items-center gap-2.5">
                  <div className="p-1 bg-blue-600 text-white rounded-md shrink-0">
                    <Zap className="w-4 h-4 fill-white" />
                  </div>
                  <p className="text-xs font-bold text-blue-950 tracking-tight">
                    {doc.description}
                  </p>
                </div>
              )}

              {/* PRODUCT TABLE (SOLID BLUE HEADER & PRECISE ALIGNMENT) */}
              <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-blue-700 text-white">
                      <th className="py-2.5 px-3 font-bold text-[11px] uppercase tracking-wider">
                        Désignation
                      </th>
                      <th className="py-2.5 px-2 text-center font-bold text-[11px] uppercase tracking-wider w-12">
                        Qté
                      </th>
                      <th className="py-2.5 px-3 text-right font-bold text-[11px] uppercase tracking-wider w-24">
                        P.U. H.T.
                      </th>
                      {doc.has_remise && (
                        <th className="py-2.5 px-2 text-center font-bold text-[11px] uppercase tracking-wider w-16">
                          Remise %
                        </th>
                      )}
                      <th className="py-2.5 px-3 text-right font-bold text-[11px] uppercase tracking-wider w-24">
                        Total H.T.
                      </th>
                      <th className="py-2.5 px-2 text-center font-bold text-[11px] uppercase tracking-wider w-16">
                        TVA %
                      </th>
                      <th className="py-2.5 px-3 text-right font-bold text-[11px] uppercase tracking-wider w-28">
                        Total TTC
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {doc.lines.map((line, idx) => (
                      <tr
                        key={line.id || idx}
                        className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}
                      >
                        <td className="py-2 px-3 font-medium text-slate-800">
                          {line.designation}
                        </td>
                        <td className="py-2 px-2 text-center font-semibold text-slate-700">
                          {line.quantity}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          {formatTND(line.unit_price_ht, false)}
                        </td>
                        {doc.has_remise && (
                          <td className="py-2 px-2 text-center font-mono text-slate-700">
                            {line.discount_percent ? `${line.discount_percent}%` : '-'}
                          </td>
                        )}
                        <td className="py-2 px-3 text-right font-mono font-medium text-slate-800">
                          {formatTND(line.total_ht, false)}
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-slate-700">
                          {line.tva_percent}%
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                          {formatTND(line.total_ttc, false)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* TOTALS & PAYMENT SECTION (Side by side cards) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 items-stretch">
                {/* Left Card: MODE DE RÈGLEMENT */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 flex flex-col justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-1.5 mb-2.5 pb-1.5 border-b border-slate-200">
                      <div className="p-1 bg-blue-600 text-white rounded">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                        MODE DE RÈGLEMENT
                      </span>
                    </div>

                    <div className="space-y-2 mt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-700 font-medium">Comptant</span>
                        <div className="w-4 h-4 rounded border border-slate-400 bg-white flex items-center justify-center">
                          <div className="w-2 h-2 bg-blue-600 rounded-xs" />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">Référence :</span>
                        <span className="border-b border-dotted border-slate-400 flex-1 font-mono text-slate-800">
                          {doc.payment_reference || '___________________'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">Date :</span>
                        <span className="font-mono text-slate-800">
                          {formatDateFR(doc.payment_date || doc.date)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Card: TOTALS WITH BLUE HIGHLIGHT */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs flex flex-col justify-between shadow-2xs">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="font-medium">Montant Total HT</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatTND(doc.totals.subtotal_net_ht)}
                      </span>
                    </div>

                    {/* Breakdown of TVA 7% and TVA 19% */}
                    {doc.totals.tva_details && doc.totals.tva_details.length > 0 ? (
                      doc.totals.tva_details.map((t) => (
                        <div key={t.rate} className="flex justify-between items-center text-slate-700">
                          <span className="font-medium">TVA {t.rate}%</span>
                          <span className="font-mono font-bold text-slate-900">
                            {formatTND(t.amount_tva)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="flex justify-between items-center text-slate-700">
                        <span className="font-medium">Total TVA</span>
                        <span className="font-mono font-bold text-slate-900">
                          {formatTND(doc.totals.total_tva)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* TOTAL TTC PROMINENT BLUE CARD */}
                  <div className="mt-3 rounded-lg bg-blue-700 text-white p-2.5 flex justify-between items-center shadow-xs">
                    <span className="font-black text-sm tracking-wider uppercase">
                      TOTAL TTC
                    </span>
                    <span className="font-mono font-black text-base sm:text-lg">
                      {formatTND(doc.totals.total_ttc)}
                    </span>
                  </div>
                </div>
              </div>

              {/* TOTAL IN WORDS SECTION */}
              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs flex items-center gap-2">
                <PenTool className="w-4 h-4 text-blue-600 shrink-0" />
                <p className="font-medium text-slate-800 italic">
                  {arreteText}
                </p>
              </div>

              {/* TWO SIGNATURE AREAS (Side by Side) */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Client Signature Card */}
                <div className="rounded-xl border border-slate-200 p-3 text-xs bg-white min-h-[90px] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-blue-800 font-bold mb-1">
                      <User className="w-3.5 h-3.5" />
                      <span>Client</span>
                    </div>
                    <p className="text-slate-500 text-[11px]">Date : _____ / _____ / _________</p>
                  </div>
                  <p className="text-slate-400 text-[10px] mt-4">Signature / Cachet :</p>
                </div>

                {/* ACCESS ENERGY Signature Card */}
                <div className="rounded-xl border border-slate-200 p-3 text-xs bg-white min-h-[90px] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-blue-800 font-bold mb-1">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>ACCESS ENERGY</span>
                    </div>
                    <p className="text-slate-500 text-[11px]">Date : _____ / _____ / _________</p>
                  </div>
                  <p className="text-slate-400 text-[10px] mt-4">Signature / Cachet :</p>
                </div>
              </div>
            </div>

            {/* BOTTOM FOOTER SECTION (SCRIPT + BLUE SOLAR WAVE VISUAL) */}
            <div className="pt-2">
              <div className="text-center font-serif italic text-sm text-slate-700 mb-2">
                Merci pour votre confiance.
              </div>

              {/* Decorative Blue Solar Waves Vector Graphic */}
              <div className="w-full h-8 overflow-hidden rounded-t-xl">
                <svg
                  viewBox="0 0 1000 60"
                  className="w-full h-full object-cover"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="footerBlueGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#0284c7" />
                      <stop offset="50%" stopColor="#1d4ed8" />
                      <stop offset="100%" stopColor="#1e3a8a" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0 30 Q 250 0 500 30 T 1000 30 L 1000 60 L 0 60 Z"
                    fill="url(#footerBlueGrad)"
                    opacity="0.9"
                  />
                  <path
                    d="M 0 45 Q 250 15 500 45 T 1000 45 L 1000 60 L 0 60 Z"
                    fill="#1e3a8a"
                  />
                </svg>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

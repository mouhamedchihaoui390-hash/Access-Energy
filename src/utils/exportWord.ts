import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  ImageRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  VerticalAlign,
  TableLayoutType,
  convertInchesToTwip,
} from 'docx';
import { CommercialDocument, CompanySettings } from '../types';
import { formatTND, numberToWordsTunisianTND } from './calculations';

// Helper to convert SVG to PNG Uint8Array in the browser using HTML5 Canvas
async function getLogoPngBytes(): Promise<Uint8Array | null> {
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return null;
    }

    // Load the logo SVG as an image
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const loadPromise = new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });

    img.src = '/access-energy-logo.svg';
    const success = await loadPromise;
    if (!success) return null;

    const canvas = document.createElement('canvas');
    const scale = 2; // high-res
    canvas.width = 500 * scale;
    canvas.height = 150 * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png')
    );
    if (!blob) return null;

    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (e) {
    console.warn('Could not rasterize logo for Word export:', e);
    return null;
  }
}

// Format dates: DD / MM / YYYY
function formatDateFR(dStr?: string): string {
  if (!dStr) return '__ / __ / ______';
  if (dStr.includes('/')) return dStr;
  const parts = dStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]} / ${parts[1]} / ${parts[0]}`;
  }
  return dStr;
}

export async function exportDocumentToWord(doc: CommercialDocument, company: CompanySettings) {
  const isDevis = doc.type === 'devis';
  const isBL = doc.type === 'bl' || doc.type === 'bon_livraison';
  const title = isDevis ? 'DEVIS' : isBL ? 'BON DE LIVRAISON' : 'FACTURE';

  // Attempt to acquire rasterized logo
  const logoBytes = await getLogoPngBytes();

  // Reusable border styles
  const noBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  };

  const subtleBorder = {
    top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
  };

  const blueBorder = {
    top: { style: BorderStyle.SINGLE, size: 1, color: '93C5FD' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: '93C5FD' },
    left: { style: BorderStyle.SINGLE, size: 1, color: '93C5FD' },
    right: { style: BorderStyle.SINGLE, size: 1, color: '93C5FD' },
  };

  // -------------------------------------------------------------
  // 1. HEADER SECTION (Table with 2 columns)
  // Left: Logo + Company Info
  // Right: Solar Dark-Blue Banner + Date Pill
  // -------------------------------------------------------------
  const leftHeaderParagraphs: Paragraph[] = [];

  if (logoBytes) {
    leftHeaderParagraphs.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: logoBytes,
            type: 'png',
            transformation: {
              width: 190,
              height: 57,
            },
          }),
        ],
        spacing: { after: 100 },
      })
    );
  } else {
    leftHeaderParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'ACCESS ', bold: true, size: 28, color: '0F172A' }),
          new TextRun({ text: 'ENERGY', bold: true, size: 28, color: 'EA580C' }),
        ],
      })
    );
  }

  leftHeaderParagraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: company.subtitle || 'ÉNERGIE SOLAIRE • PV BT • POMPAGE • MT',
          bold: true,
          size: 15,
          color: '334155',
        }),
      ],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: company.address_line1 || 'AV FARHAD HACHET - BIR MCHARGUA - ZAGHOUAN',
          size: 14,
          color: '475569',
        }),
      ],
      spacing: { after: 20 },
    }),
    ...(company.address_line2
      ? [
          new Paragraph({
            children: [
              new TextRun({
                text: company.address_line2,
                size: 14,
                color: '475569',
              }),
            ],
            spacing: { after: 40 },
          }),
        ]
      : []),
    new Paragraph({
      children: [
        new TextRun({ text: 'Tél : ', bold: true, size: 14, color: '1E293B' }),
        new TextRun({ text: company.phone || '28 057 771 / 29256084', size: 14, color: '334155' }),
      ],
      spacing: { after: 20 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Identifiant unique / RC : ', bold: true, size: 14, color: '1E293B' }),
        new TextRun({ text: company.matricule_fiscal || '1954656YAM000', size: 14, color: '334155' }),
      ],
      spacing: { after: 20 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'E-mail : ', bold: true, size: 14, color: '1E293B' }),
        new TextRun({ text: company.email || 'solution.accessenergy@gmail.com', size: 14, color: '334155' }),
      ],
      spacing: { after: 40 },
    })
  );

  // Right Header Solar Banner Table
  const headerRightTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorder,
    rows: [
      // Dark Blue Solar Title Card
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: { fill: '1E3A8A' }, // Deep Blue
            margins: { top: 160, bottom: 160, left: 200, right: 200 },
            borders: noBorder,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: title,
                    bold: true,
                    size: 32,
                    color: 'FFFFFF',
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 40 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `N° ${doc.number}`,
                    bold: true,
                    size: 19,
                    color: 'BFDBFE', // Light blue accent
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        ],
      }),
      // Spacing row
      new TableRow({
        children: [
          new TableCell({
            borders: noBorder,
            children: [new Paragraph({ text: '', spacing: { before: 80, after: 80 } })],
          }),
        ],
      }),
      // Date Pill Box
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC' },
            borders: subtleBorder,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Date : ', bold: true, size: 16, color: '1E293B' }),
                  new TextRun({ text: formatDateFR(doc.date), bold: true, size: 16, color: '0F172A' }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorder,
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 58, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: leftHeaderParagraphs,
            verticalAlign: VerticalAlign.TOP,
          }),
          new TableCell({
            width: { size: 4, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [new Paragraph({ text: '' })],
          }),
          new TableCell({
            width: { size: 38, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [headerRightTable],
            verticalAlign: VerticalAlign.TOP,
          }),
        ],
      }),
    ],
  });

  // -------------------------------------------------------------
  // 2. CLIENT INFORMATIONS CARD (Rounded Card Look)
  // -------------------------------------------------------------
  const clientSnapshot = (doc.client_snapshot || {}) as any;
  const clientCardTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: blueBorder,
    margins: { top: 120, bottom: 120, left: 160, right: 160 },
    rows: [
      // Title Row
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            shading: { fill: 'F0F7FF' },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'BFDBFE' },
              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            },
            margins: { bottom: 80 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: '● ', color: '1D4ED8', size: 16 }),
                  new TextRun({
                    text: 'INFORMATIONS CLIENT',
                    bold: true,
                    size: 16,
                    color: '1E3A8A',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      // Content Row
      new TableRow({
        children: [
          // Left Column
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { fill: 'F0F7FF' },
            borders: noBorder,
            margins: { top: 80, right: 80 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Nom : ', bold: true, size: 15, color: '1E293B' }),
                  new TextRun({
                    text: clientSnapshot.name || clientSnapshot.nom || 'Client Particulier',
                    bold: true,
                    size: 15,
                    color: '0F172A',
                  }),
                ],
                spacing: { after: 30 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Téléphone : ', bold: true, size: 15, color: '1E293B' }),
                  new TextRun({ text: clientSnapshot.phone || clientSnapshot.telephone || 'Non spécifié', size: 15, color: '334155' }),
                ],
                spacing: { after: 30 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Adresse : ', bold: true, size: 15, color: '1E293B' }),
                  new TextRun({
                    text: `${clientSnapshot.address || clientSnapshot.adresse || ''}${
                      clientSnapshot.city ? ', ' + clientSnapshot.city : ''
                    }`,
                    size: 15,
                    color: '334155',
                  }),
                ],
              }),
            ],
          }),
          // Right Column
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { fill: 'F0F7FF' },
            borders: noBorder,
            margins: { top: 80, left: 80 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'E-mail : ', bold: true, size: 15, color: '1E293B' }),
                  new TextRun({ text: clientSnapshot.email || 'Non spécifié', size: 15, color: '334155' }),
                ],
                spacing: { after: 30 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'CIN/Matricule fiscale : ', bold: true, size: 15, color: '1E293B' }),
                  new TextRun({
                    text:
                      clientSnapshot.matricule_fiscal ||
                      clientSnapshot.cin ||
                      clientSnapshot.cin_matricule_fiscale ||
                      'Non spécifié',
                    bold: true,
                    size: 15,
                    color: '0F172A',
                  }),
                ],
                spacing: { after: 30 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Référence client : ', bold: true, size: 15, color: '1E293B' }),
                  new TextRun({ text: clientSnapshot.reference_client || '-', size: 15, color: '334155' }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // -------------------------------------------------------------
  // 3. DESCRIPTION CARD
  // -------------------------------------------------------------
  const descriptionTable = doc.description
    ? new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: blueBorder,
        margins: { top: 100, bottom: 100, left: 140, right: 140 },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                shading: { fill: 'EFF6FF' },
                borders: noBorder,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: '⚡  ', size: 16 }),
                      new TextRun({
                        text: doc.description,
                        bold: true,
                        size: 16,
                        color: '172554',
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    : null;

  // -------------------------------------------------------------
  // 4. PRODUCT TABLE (Blue Header + Alternating Rows)
  // -------------------------------------------------------------
  const tableRows: TableRow[] = [];

  const th = (text: string, align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT, widthPct: number) =>
    new TableCell({
      width: { size: widthPct, type: WidthType.PERCENTAGE },
      shading: { fill: '1D4ED8' }, // ACCESS ENERGY Blue
      borders: noBorder,
      margins: { top: 100, bottom: 100, left: 100, right: 100 },
      children: [
        new Paragraph({
          children: [new TextRun({ text, bold: true, size: 15, color: 'FFFFFF' })],
          alignment: align,
        }),
      ],
    });

  const td = (
    text: string,
    align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT,
    isBold = false,
    bg = 'FFFFFF'
  ) =>
    new TableCell({
      shading: { fill: bg },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      },
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      children: [
        new Paragraph({
          children: [new TextRun({ text, bold: isBold, size: 14, color: isBold ? '0F172A' : '334155' })],
          alignment: align,
        }),
      ],
    });

  // Table Header Row
  if (doc.has_remise) {
    tableRows.push(
      new TableRow({
        children: [
          th('Désignation', AlignmentType.LEFT, 36),
          th('Qté', AlignmentType.CENTER, 8),
          th('P.U. H.T.', AlignmentType.RIGHT, 14),
          th('Remise %', AlignmentType.CENTER, 10),
          th('Total H.T.', AlignmentType.RIGHT, 14),
          th('TVA %', AlignmentType.CENTER, 8),
          th('Total TTC', AlignmentType.RIGHT, 15),
        ],
      })
    );
  } else {
    tableRows.push(
      new TableRow({
        children: [
          th('Désignation', AlignmentType.LEFT, 42),
          th('Qté', AlignmentType.CENTER, 8),
          th('P.U. H.T.', AlignmentType.RIGHT, 15),
          th('Total H.T.', AlignmentType.RIGHT, 15),
          th('TVA %', AlignmentType.CENTER, 8),
          th('Total TTC', AlignmentType.RIGHT, 17),
        ],
      })
    );
  }

  // Table Content Rows
  doc.lines.forEach((line, idx) => {
    const rowBg = idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF';
    if (doc.has_remise) {
      tableRows.push(
        new TableRow({
          children: [
            td(line.designation, AlignmentType.LEFT, false, rowBg),
            td(String(line.quantity), AlignmentType.CENTER, true, rowBg),
            td(formatTND(line.unit_price_ht, false), AlignmentType.RIGHT, false, rowBg),
            td(line.discount_percent ? `${line.discount_percent}%` : '-', AlignmentType.CENTER, false, rowBg),
            td(formatTND(line.total_ht, false), AlignmentType.RIGHT, false, rowBg),
            td(`${line.tva_percent}%`, AlignmentType.CENTER, false, rowBg),
            td(formatTND(line.total_ttc, false), AlignmentType.RIGHT, true, rowBg),
          ],
        })
      );
    } else {
      tableRows.push(
        new TableRow({
          children: [
            td(line.designation, AlignmentType.LEFT, false, rowBg),
            td(String(line.quantity), AlignmentType.CENTER, true, rowBg),
            td(formatTND(line.unit_price_ht, false), AlignmentType.RIGHT, false, rowBg),
            td(formatTND(line.total_ht, false), AlignmentType.RIGHT, false, rowBg),
            td(`${line.tva_percent}%`, AlignmentType.CENTER, false, rowBg),
            td(formatTND(line.total_ttc, false), AlignmentType.RIGHT, true, rowBg),
          ],
        })
      );
    }
  });

  const productTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: subtleBorder,
    rows: tableRows,
  });

  // -------------------------------------------------------------
  // 5. PAYMENT SECTION & TOTALS (2 Columns Side by Side)
  // -------------------------------------------------------------
  // Left: Mode de règlement
  const paymentCard = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: subtleBorder,
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: 'F8FAFC' },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            },
            margins: { bottom: 60 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'MODE DE RÈGLEMENT',
                    bold: true,
                    size: 15,
                    color: '1E293B',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: 'F8FAFC' },
            borders: noBorder,
            margins: { top: 60 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Comptant  ', bold: true, size: 14, color: '334155' }),
                  new TextRun({ text: '☑', bold: true, size: 16, color: '1D4ED8' }),
                ],
                spacing: { after: 40 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Référence : ', size: 14, color: '64748B' }),
                  new TextRun({
                    text: doc.payment_reference || '_______________________',
                    bold: true,
                    size: 14,
                    color: '1E293B',
                  }),
                ],
                spacing: { after: 40 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Date : ', size: 14, color: '64748B' }),
                  new TextRun({
                    text: formatDateFR(doc.payment_date || doc.date),
                    bold: true,
                    size: 14,
                    color: '1E293B',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Right: Totals
  const totalsCardRows: TableRow[] = [
    // Subtotal HT
    new TableRow({
      children: [
        new TableCell({
          borders: noBorder,
          margins: { top: 40, bottom: 40 },
          children: [
            new Paragraph({
              children: [new TextRun({ text: 'Montant Total HT', size: 14, color: '475569' })],
            }),
          ],
        }),
        new TableCell({
          borders: noBorder,
          margins: { top: 40, bottom: 40 },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: formatTND(doc.totals.subtotal_net_ht),
                  bold: true,
                  size: 14,
                  color: '0F172A',
                }),
              ],
              alignment: AlignmentType.RIGHT,
            }),
          ],
        }),
      ],
    }),
  ];

  // TVA Details Breakdown
  (doc.totals.tva_details || []).forEach((t) => {
    totalsCardRows.push(
      new TableRow({
        children: [
          new TableCell({
            borders: noBorder,
            margins: { top: 30, bottom: 30 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: `TVA ${t.rate}%`, size: 14, color: '475569' })],
              }),
            ],
          }),
          new TableCell({
            borders: noBorder,
            margins: { top: 30, bottom: 30 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: formatTND(t.amount_tva),
                    bold: true,
                    size: 14,
                    color: '0F172A',
                  }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        ],
      })
    );
  });

  // TOTAL TTC Row in Solid Blue Banner
  totalsCardRows.push(
    new TableRow({
      children: [
        new TableCell({
          shading: { fill: '1D4ED8' },
          borders: noBorder,
          margins: { top: 80, bottom: 80, left: 100, right: 60 },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: 'TOTAL TTC',
                  bold: true,
                  size: 16,
                  color: 'FFFFFF',
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          shading: { fill: '1D4ED8' },
          borders: noBorder,
          margins: { top: 80, bottom: 80, left: 60, right: 100 },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: formatTND(doc.totals.total_ttc),
                  bold: true,
                  size: 17,
                  color: 'FFFFFF',
                }),
              ],
              alignment: AlignmentType.RIGHT,
            }),
          ],
        }),
      ],
    })
  );

  const totalsCard = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: subtleBorder,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    rows: totalsCardRows,
  });

  // Combine Payment and Totals side by side
  const middleSectionTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorder,
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 48, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [paymentCard],
            verticalAlign: VerticalAlign.TOP,
          }),
          new TableCell({
            width: { size: 4, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [new Paragraph({ text: '' })],
          }),
          new TableCell({
            width: { size: 48, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [totalsCard],
            verticalAlign: VerticalAlign.TOP,
          }),
        ],
      }),
    ],
  });

  // -------------------------------------------------------------
  // 6. AMOUNT IN WORDS SECTION
  // -------------------------------------------------------------
  const arreteText =
    doc.arrete_somme ||
    `Arrêté le présent ${title.toLowerCase()} à la somme de : ${numberToWordsTunisianTND(
      doc.totals.total_ttc
    )}`;

  const amountInWordsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: subtleBorder,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: 'F8FAFC' },
            borders: noBorder,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: '✍  ', size: 14 }),
                  new TextRun({
                    text: arreteText,
                    italics: true,
                    bold: true,
                    size: 14,
                    color: '1E293B',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // -------------------------------------------------------------
  // 7. SIGNATURES SECTION (Side by Side)
  // -------------------------------------------------------------
  const signaturesTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorder,
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        children: [
          // Client Signature Cell
          new TableCell({
            width: { size: 48, type: WidthType.PERCENTAGE },
            shading: { fill: 'FFFFFF' },
            borders: subtleBorder,
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: '👤 Client', bold: true, size: 15, color: '1E3A8A' }),
                ],
                spacing: { after: 30 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Date : _____ / _____ / _________', size: 13, color: '64748B' }),
                ],
                spacing: { after: 200 }, // Space for physical stamp
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Signature / Cachet :', size: 13, color: '94A3B8' }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 4, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [new Paragraph({ text: '' })],
          }),
          // ACCESS ENERGY Signature Cell
          new TableCell({
            width: { size: 48, type: WidthType.PERCENTAGE },
            shading: { fill: 'FFFFFF' },
            borders: subtleBorder,
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: '🏢 ACCESS ENERGY', bold: true, size: 15, color: '1E3A8A' }),
                ],
                spacing: { after: 30 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Date : _____ / _____ / _________', size: 13, color: '64748B' }),
                ],
                spacing: { after: 200 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Signature / Cachet :', size: 13, color: '94A3B8' }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // -------------------------------------------------------------
  // 8. ASSEMBLE WORD DOCUMENT (A4 Portrait, exact margins)
  // -------------------------------------------------------------
  const wordDoc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // 210 mm in twips
              height: 16838, // 297 mm in twips
            },
            margin: {
              top: 576, // 0.4 in
              bottom: 576,
              left: 576,
              right: 576,
            },
          },
        },
        children: [
          headerTable,
          new Paragraph({ text: '', spacing: { before: 80, after: 80 } }),

          clientCardTable,
          new Paragraph({ text: '', spacing: { before: 60, after: 60 } }),

          ...(descriptionTable
            ? [descriptionTable, new Paragraph({ text: '', spacing: { before: 60, after: 60 } })]
            : []),

          productTable,
          new Paragraph({ text: '', spacing: { before: 80, after: 80 } }),

          middleSectionTable,
          new Paragraph({ text: '', spacing: { before: 80, after: 80 } }),

          amountInWordsTable,
          new Paragraph({ text: '', spacing: { before: 80, after: 80 } }),

          signaturesTable,
          new Paragraph({ text: '', spacing: { before: 100, after: 60 } }),

          // Footer Quote
          new Paragraph({
            children: [
              new TextRun({
                text: 'Merci pour votre confiance.',
                italics: true,
                size: 17,
                color: '334155',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
          }),

          // Subtle Bottom Blue Divider Bar
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorder,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: '1D4ED8' },
                    borders: noBorder,
                    children: [new Paragraph({ text: '', spacing: { before: 20, after: 20 } })],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  // Pack and trigger download in the browser
  const blob = await Packer.toBlob(wordDoc);
  if (!blob || blob.size === 0) {
    throw new Error('Échec de la génération du fichier Word: taille nulle.');
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.number || 'document'}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

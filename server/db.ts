import fs from 'fs';
import path from 'path';
import { serverSupabase, isServerSupabaseConfigured } from './supabase';
import {
  Client,
  Product,
  CommercialDocument,
  CommercialDocumentLine,
  Payment,
  CompanySettings,
  AuditLog,
} from '../src/types';
import { calculateDocumentTotals, numberToWordsTunisianTND } from '../src/utils/calculations';

interface DatabaseSchema {
  company: CompanySettings;
  clients: Client[];
  products: Product[];
  devis: CommercialDocument[];
  bl: CommercialDocument[];
  factures: CommercialDocument[];
  payments: Payment[];
  auditLogs: AuditLog[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Default initial company settings matching the reference document
const defaultCompany: CompanySettings = {
  id: 'company-main',
  name: 'ACCESS ENERGY',
  legal_name: 'ACCESS ENERGY SARL',
  subtitle: 'ÉNERGIE SOLAIRE • PV BT • POMPAGE • MT',
  address_line1: 'AV FARHAD HACHET - BIR MCHARGUA - ZAGHOUAN',
  address_line2: 'RUE SIDI BOUCHOUCHA - MANOUBA',
  city: 'Bir Mchargua - Zaghouan',
  country: 'Tunisie',
  phone: '28 057 771 / 29256084',
  email: 'solution.accessenergy@gmail.com',
  website: 'www.access-energy.tn',
  matricule_fiscal: '1954656YAM000',
  registre_commerce: '1954656YAM000',
  identifiant_unique: '1954656YAM000',
  rib: '08 014 0001234567890 42 (BIAT Bir Mchargua)',
  bank_name: 'BIAT',
  default_tva: 19,
  timbre_fiscal: 1.000,
  currency_symbol: 'TND',
  devis_prefix: 'Devis-',
  bl_prefix: 'BL-',
  facture_prefix: 'Facture-',
  next_devis_number: 101,
  next_bl_number: 101,
  next_facture_number: 101,
  default_conditions: 'Paiement : 50% à la commande, 50% à la livraison et mise en service. Garantie matériel 5 ans constructeur.',
  footer_text: 'Merci pour votre confiance.',
};

// Seed initial clients
const seedClients: Client[] = [
  {
    id: 'cli-riadh-zaabi',
    client_type: 'particulier',
    name: 'Riadh Zaabi',
    nom: 'Riadh Zaabi',
    cin: '264788420',
    cin_matricule_fiscale: '264788420',
    reference_client: '',
    address: 'Rue Kowait, Radès',
    adresse: 'Rue Kowait, Radès',
    city: 'Radès',
    governorate: 'Ben Arous',
    postal_code: '2040',
    phone: '98 566 425',
    telephone: '98 566 425',
    email: 'zaabiriadh@yahoo.fr',
    notes: 'Générateur photovoltaïque raccordé au réseau STEG de puissance 2.46Kwc.',
    status: 'actif',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cli-1',
    client_type: 'entreprise',
    name: 'Domaine Agricole El Amen',
    company_name: 'Sté El Amen Agro SARL',
    matricule_fiscal: '1458923/B/N/000',
    registre_commerce: 'B1245892021',
    address: 'Route de Pont du Fahs, Bir Mchargua',
    city: 'Zaghouan',
    governorate: 'Zaghouan',
    postal_code: '1141',
    phone: '72 680 120 / 98 412 300',
    email: 'contact@elamen-agro.tn',
    notes: 'Installation pompage solaire agricole 7.5 CV',
    status: 'actif',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cli-2',
    client_type: 'particulier',
    name: 'M. Mohamed Ben Salem',
    cin: '04879612',
    address: 'Cité Ennour, Villa 14',
    city: 'Bir Mchargua',
    governorate: 'Zaghouan',
    postal_code: '1141',
    phone: '21 984 552',
    email: 'mohamed.bensalem@gmail.com',
    notes: 'Installation photovoltaïque raccordée réseau BT 3kVA',
    status: 'actif',
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cli-3',
    client_type: 'entreprise',
    name: 'GreenTech Solutions SARL',
    company_name: 'GreenTech Solutions',
    matricule_fiscal: '1672349/K/A/000',
    registre_commerce: 'B0215872022',
    address: 'Zone Industrielle Sidi Abdelhamid',
    city: 'Sousse',
    governorate: 'Sousse',
    postal_code: '4000',
    phone: '73 330 450',
    email: 'direction@greentech-tunisie.com',
    notes: 'Sous-traitance onduleurs & batteries solaires',
    status: 'actif',
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cli-4',
    client_type: 'entreprise',
    name: 'Coopérative El Baraka',
    company_name: 'SMSA El Baraka',
    matricule_fiscal: '0928341/D/P/000',
    registre_commerce: 'A1938472019',
    address: 'Avenue Habib Bourguiba',
    city: 'Manouba',
    governorate: 'Manouba',
    postal_code: '2010',
    phone: '71 600 890',
    email: 'elbaraka.coop@topnet.tn',
    status: 'actif',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Seed initial products / services
const seedProducts: Product[] = [
  {
    id: 'prd-sg-2k',
    reference: 'INV-SG-2K',
    designation: 'Onduleur Sungrow 2k',
    description: 'Onduleur réseau monophasé haute performance',
    category: 'Onduleurs',
    unit: 'Pièce',
    purchase_price_ht: 1200.000,
    sale_price_ht: 1600.000,
    tva: 7,
    stock: 20,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prd-longi-615',
    reference: 'PV-LONGI-615',
    designation: 'Panneaux Longi 615wc',
    description: 'Module photovoltaïque monocristallin haute efficacité 615Wc',
    category: 'Panneaux Solaires',
    unit: 'Pièce',
    purchase_price_ht: 410.000,
    sale_price_ht: 544.000,
    tva: 19,
    stock: 80,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prd-str-alu',
    reference: 'STR-ALU',
    designation: 'Structure aluminium',
    description: 'Structure de fixation en profilé aluminium anodisé',
    category: 'Structures',
    unit: 'Pièce',
    purchase_price_ht: 650.000,
    sale_price_ht: 900.000,
    tva: 19,
    stock: 35,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prd-cof-ac',
    reference: 'COF-AC',
    designation: 'Coffret AC',
    description: 'Coffret de protection alternatif avec disjoncteur différentiel et parafoudre',
    category: 'Coffrets',
    unit: 'Pièce',
    purchase_price_ht: 140.000,
    sale_price_ht: 200.000,
    tva: 19,
    stock: 40,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prd-cof-dc',
    reference: 'COF-DC',
    designation: 'Coffret DC',
    description: 'Coffret de protection continu avec sectionneur et parafoudre 1000V',
    category: 'Coffrets',
    unit: 'Pièce',
    purchase_price_ht: 140.000,
    sale_price_ht: 200.000,
    tva: 19,
    stock: 40,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prd-frais-inst',
    reference: 'SRV-INST',
    designation: 'Frais d\'installation, étude et transport',
    description: 'Étude technique d\'ingénierie, pose certifiée, câblage, transport et raccordement STEG',
    category: 'Services & Pose',
    unit: 'Forfait',
    purchase_price_ht: 200.000,
    sale_price_ht: 400.000,
    tva: 19,
    stock: 999,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prd-1',
    reference: 'PV-550W-MONO',
    designation: 'Panneau Solaire Monocristallin 550W Tier 1 Demi-cellule',
    description: 'Rendement 21.3%, haute performance anti-ombrage, garantie 12 ans produit et 25 ans production linéaire',
    category: 'Panneaux Photovoltaïques',
    unit: 'Pièce',
    purchase_price_ht: 290.000,
    sale_price_ht: 385.000,
    tva: 19,
    stock: 84,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prd-2',
    reference: 'INV-HYB-5K',
    designation: 'Onduleur Hybride Solaire 5 kVA MPPT Pure Sinus',
    description: 'Entrée PV jusqu\'à 500Vdc, gestion batterie 48V, raccordement groupe électrogène / STEG',
    category: 'Onduleurs',
    unit: 'Unité',
    purchase_price_ht: 2150.000,
    sale_price_ht: 2850.000,
    tva: 19,
    stock: 12,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prd-3',
    reference: 'POMP-SOL-35',
    designation: 'Pompe Solaire Immergée Hélicoïdale 3.5 CV 48-110V',
    description: 'Débit max 8m³/h, HMT max 120m, moteur Brushless inox haute efficacité',
    category: 'Pompage Solaire',
    unit: 'Unité',
    purchase_price_ht: 1450.000,
    sale_price_ht: 1950.000,
    tva: 19,
    stock: 6,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prd-4',
    reference: 'BAT-LITH-48V',
    designation: 'Batterie Lithium LiFePO4 48V 100Ah (5.12 kWh)',
    description: '6000 cycles à 80% DOD, BMS intégré avec communication CAN/RS485',
    category: 'Stockage & Batteries',
    unit: 'Unité',
    purchase_price_ht: 2600.000,
    sale_price_ht: 3400.000,
    tva: 19,
    stock: 8,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prd-5',
    reference: 'COF-PROT-DCAC',
    designation: 'Coffret DC/AC Parafoudre 600V avec disjoncteur',
    description: 'Parafoudre type 2, sectionneur DC 1000V 32A, disjoncteur différentiel AC 30mA IP65',
    category: 'Protection Électrique',
    unit: 'Pièce',
    purchase_price_ht: 230.000,
    sale_price_ht: 320.000,
    tva: 19,
    stock: 25,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prd-6',
    reference: 'CAB-SOL-6MM',
    designation: 'Câble Solaire Cuivre Étamé 6mm² Double Isolation Noir/Rouge',
    description: 'Résistant aux UV et intempéries, norme TÜV EN 50618',
    category: 'Câblage & Accessoires',
    unit: 'Mètre',
    purchase_price_ht: 3.400,
    sale_price_ht: 4.800,
    tva: 19,
    stock: 450,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prd-7',
    reference: 'STR-FIX-ALU',
    designation: 'Structure de fixation toiture / sol aluminium anodisé',
    description: 'Rails alu 6005-T5, pinces intermédiaires et d\'extrémité, étrier inox',
    category: 'Structure & Fixation',
    unit: 'Kit',
    purchase_price_ht: 85.000,
    sale_price_ht: 120.000,
    tva: 19,
    stock: 40,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prd-8',
    reference: 'SRV-INST-PV',
    designation: 'Prestation Pose & Raccordement Électrique Système PV',
    description: 'Installation mécanique certifiée, câblage, mise à la terre, paramétrage onduleur et essais de conformité',
    category: 'Services & Main d\'œuvre',
    unit: 'Forfait',
    purchase_price_ht: 300.000,
    sale_price_ht: 650.000,
    tva: 19,
    stock: 999,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prd-9',
    reference: 'SRV-ETUD-SOL',
    designation: 'Étude Technique & Dimensionnement Solaire avec Dossier STEG',
    description: 'Analyse de gisement solaire, calcul de productible PVsyst et montage dossier administratif',
    category: 'Services & Main d\'œuvre',
    unit: 'Forfait',
    purchase_price_ht: 100.000,
    sale_price_ht: 350.000,
    tva: 7,
    stock: 999,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Build Initial Seed Documents matching the prompt and reference PDF
function createSeedDocuments() {
  const cli1 = seedClients[0]; // Riadh Zaabi

  // Reference document: Devis-000100 (Official Reference)
  const devis1Lines: CommercialDocumentLine[] = [
    {
      id: 'line-d1-1',
      product_id: 'prd-sg-2k',
      reference: 'INV-SG-2K',
      designation: 'Onduleur Sungrow 2k',
      quantity: 1,
      unit: 'Pièce',
      unit_price_ht: 1600.000,
      discount_percent: 0,
      tva_percent: 7,
      total_ht: 1600.000,
      total_tva: 112.000,
      total_ttc: 1712.000,
    },
    {
      id: 'line-d1-2',
      product_id: 'prd-longi-615',
      reference: 'PV-LONGI-615',
      designation: 'Panneaux Longi 615wc',
      quantity: 4,
      unit: 'Pièce',
      unit_price_ht: 544.000,
      discount_percent: 0,
      tva_percent: 19,
      total_ht: 2176.000,
      total_tva: 413.440,
      total_ttc: 2589.440,
    },
    {
      id: 'line-d1-3',
      product_id: 'prd-str-alu',
      reference: 'STR-ALU',
      designation: 'Structure aluminium',
      quantity: 1,
      unit: 'Pièce',
      unit_price_ht: 900.000,
      discount_percent: 0,
      tva_percent: 19,
      total_ht: 900.000,
      total_tva: 171.000,
      total_ttc: 1071.000,
    },
    {
      id: 'line-d1-4',
      product_id: 'prd-cof-ac',
      reference: 'COF-AC',
      designation: 'Coffret AC',
      quantity: 1,
      unit: 'Pièce',
      unit_price_ht: 200.000,
      discount_percent: 0,
      tva_percent: 19,
      total_ht: 200.000,
      total_tva: 38.000,
      total_ttc: 238.000,
    },
    {
      id: 'line-d1-5',
      product_id: 'prd-cof-dc',
      reference: 'COF-DC',
      designation: 'Coffret DC',
      quantity: 1,
      unit: 'Pièce',
      unit_price_ht: 200.000,
      discount_percent: 0,
      tva_percent: 19,
      total_ht: 200.000,
      total_tva: 38.000,
      total_ttc: 238.000,
    },
    {
      id: 'line-d1-6',
      product_id: 'prd-frais-inst',
      reference: 'SRV-INST',
      designation: 'Frais d\'installation, étude et transport',
      quantity: 1,
      unit: 'Forfait',
      unit_price_ht: 400.000,
      discount_percent: 0,
      tva_percent: 19,
      total_ht: 400.000,
      total_tva: 76.000,
      total_ttc: 476.000,
    },
  ];

  const devis1Totals = calculateDocumentTotals(devis1Lines, 0.000);
  const devis1Arrete =
    'Arrêté le présent devis à la somme de : Six mille trois cent vingt-quatre dinars et quatre cent quarante millimes';

  const initialDevis: CommercialDocument = {
    id: 'dev-000100',
    type: 'devis',
    number: 'Devis-000100',
    client_id: cli1.id,
    client_snapshot: {
      name: cli1.name,
      nom: cli1.name,
      cin: cli1.cin,
      cin_matricule_fiscale: cli1.cin,
      reference_client: '',
      address: cli1.address,
      adresse: cli1.address,
      city: cli1.city,
      phone: cli1.phone,
      telephone: cli1.phone,
      email: cli1.email,
    },
    description: 'Générateur photovoltaïque raccordé au réseau STEG de puissance 2.46Kwc.',
    has_remise: false,
    payment_mode: 'Comptant',
    date: '2026-09-07',
    validity_date: '2026-10-07',
    status: 'accepte',
    lines: devis1Lines,
    totals: devis1Totals,
    payment_method: 'especes',
    notes: 'Installation photovoltaïque raccordée au réseau STEG - Puissance 2.46 Kwc.',
    conditions: defaultCompany.default_conditions,
    arrete_somme: devis1Arrete,
    created_at: '2026-09-07T09:00:00.000Z',
    updated_at: '2026-09-07T14:30:00.000Z',
  };

  // Converted Delivery Note BL-000100
  const initialBL: CommercialDocument = {
    id: 'bl-000100',
    type: 'bl',
    number: 'BL-000100',
    client_id: cli1.id,
    client_snapshot: initialDevis.client_snapshot,
    description: initialDevis.description,
    has_remise: false,
    payment_mode: 'Comptant',
    source_document_id: initialDevis.id,
    source_document_number: initialDevis.number,
    date: '2026-09-08',
    status: 'livre',
    lines: JSON.parse(JSON.stringify(devis1Lines)),
    totals: devis1Totals,
    notes: 'Matériel livré en bon état et réceptionné avec conformité par le client.',
    conditions: 'Le client certifie la bonne réception du matériel solaire mentionné ci-dessus.',
    arrete_somme: devis1Arrete,
    created_at: '2026-09-08T11:00:00.000Z',
    updated_at: '2026-09-08T16:00:00.000Z',
  };

  // Converted Invoice Facture-000100
  const invoice1Totals = calculateDocumentTotals(devis1Lines, 1.000); // 1 DT timbre fiscal for Facture
  const invoice1Arrete =
    'Arrêté la présente facture à la somme de : Six mille trois cent vingt-cinq dinars et quatre cent quarante millimes';
  const invoice1Paid = 6325.440;
  const invoice1Remaining = 0;

  const initialFacture: CommercialDocument = {
    id: 'fa-000100',
    type: 'facture',
    number: 'Facture-000100',
    client_id: cli1.id,
    client_snapshot: initialDevis.client_snapshot,
    description: initialDevis.description,
    has_remise: false,
    payment_mode: 'Comptant',
    source_document_id: initialBL.id,
    source_document_number: initialBL.number,
    date: '2026-09-08',
    due_date: '2026-09-08',
    status: 'payee',
    lines: JSON.parse(JSON.stringify(devis1Lines)),
    totals: invoice1Totals,
    payment_method: 'especes',
    payment_reference: 'COMPTANT-001',
    payment_date: '2026-09-08',
    amount_paid: invoice1Paid,
    amount_remaining: invoice1Remaining,
    notes: 'Règlement comptant à la livraison.',
    conditions: 'Garantie matériel constructeur 5 ans. Facture acquittée.',
    arrete_somme: invoice1Arrete,
    created_at: '2026-09-08T14:30:00.000Z',
    updated_at: '2026-09-08T15:00:00.000Z',
  };

  // Payment record for Facture-000100
  const initialPayment: Payment = {
    id: 'pay-000001',
    invoice_id: initialFacture.id,
    invoice_number: initialFacture.number,
    client_id: cli1.id,
    client_name: cli1.name,
    date: '2026-09-08',
    amount: invoice1Paid,
    method: 'especes',
    reference: 'COMPTANT-001',
    bank: 'Caisse centrale',
    notes: 'Paiement comptant total',
    created_at: '2026-09-08T15:00:00.000Z',
  };

  // Another draft devis for Mohamed Ben Salem
  const cli2 = seedClients[1];
  const devis2Lines = [
    {
      id: 'line-d2-1',
      product_id: 'prd-1',
      reference: 'PV-550W-MONO',
      designation: 'Panneau Solaire Monocristallin 550W Tier 1 Demi-cellule',
      quantity: 6,
      unit: 'Pièce',
      unit_price_ht: 385.000,
      discount_percent: 0,
      tva_percent: 19,
      total_ht: 2310.000,
      total_tva: 438.900,
      total_ttc: 2748.900,
    },
    {
      id: 'line-d2-2',
      product_id: 'prd-9',
      reference: 'SRV-ETUD-SOL',
      designation: 'Étude Technique & Dimensionnement Solaire avec Dossier STEG',
      quantity: 1,
      unit: 'Forfait',
      unit_price_ht: 350.000,
      discount_percent: 0,
      tva_percent: 7,
      total_ht: 350.000,
      total_tva: 24.500,
      total_ttc: 374.500,
    },
  ];
  const devis2Totals = calculateDocumentTotals(devis2Lines, 1.000);

  const devis2: CommercialDocument = {
    id: 'dev-000099',
    type: 'devis',
    number: 'DEVIS-000099',
    client_id: cli2.id,
    client_snapshot: {
      name: cli2.name,
      cin: cli2.cin,
      address: cli2.address,
      city: cli2.city,
      phone: cli2.phone,
      email: cli2.email,
    },
    date: '2026-08-15',
    validity_date: '2026-09-15',
    status: 'envoye',
    lines: devis2Lines,
    totals: devis2Totals,
    payment_method: 'virement',
    arrete_somme: numberToWordsTunisianTND(devis2Totals.total_ttc),
    created_at: '2026-08-15T14:00:00.000Z',
    updated_at: '2026-08-15T14:00:00.000Z',
  };

  const initialAudit: AuditLog[] = [
    {
      id: 'aud-1',
      user_name: 'Direction Commerciale',
      action: 'creation',
      entity: 'devis',
      entity_id: initialDevis.id,
      entity_number: initialDevis.number,
      description: `Création du devis initial ${initialDevis.number} pour ${cli1.name}`,
      timestamp: initialDevis.created_at,
    },
    {
      id: 'aud-2',
      user_name: 'Direction Commerciale',
      action: 'changement_statut',
      entity: 'devis',
      entity_id: initialDevis.id,
      entity_number: initialDevis.number,
      description: `Devis ${initialDevis.number} validé et accepté par le client`,
      timestamp: initialDevis.updated_at,
    },
    {
      id: 'aud-3',
      user_name: 'Logistique',
      action: 'conversion',
      entity: 'bl',
      entity_id: initialBL.id,
      entity_number: initialBL.number,
      description: `Génération du Bon de Livraison ${initialBL.number} depuis le devis ${initialDevis.number}`,
      timestamp: initialBL.created_at,
    },
    {
      id: 'aud-4',
      user_name: 'Comptabilité',
      action: 'conversion',
      entity: 'facture',
      entity_id: initialFacture.id,
      entity_number: initialFacture.number,
      description: `Émission de la facture ${initialFacture.number} depuis le BL ${initialBL.number}`,
      timestamp: initialFacture.created_at,
    },
    {
      id: 'aud-5',
      user_name: 'Comptabilité',
      action: 'paiement',
      entity: 'paiement',
      entity_id: initialPayment.id,
      entity_number: initialPayment.invoice_number,
      description: `Encaissement de 4 000,000 DT (Chèque n° 784210) sur facture ${initialFacture.number}`,
      timestamp: initialPayment.created_at,
    },
  ];

  return {
    devis: [initialDevis, devis2],
    bl: [initialBL],
    factures: [initialFacture],
    payments: [initialPayment],
    auditLogs: initialAudit,
  };
}

// Supabase persistence: the whole app state is stored as a single JSONB row.
// This keeps every business rule below (numbering, conversions, totals, seed data)
// completely unchanged while making Supabase the real source of truth.
const APP_STATE_TABLE = 'app_state';
const APP_STATE_ROW_ID = 'main';

class DatabaseService {
  private data: DatabaseSchema;
  private initialized = false;
  private lastSyncPromise: Promise<boolean> = Promise.resolve(true);

  constructor() {
    // Synchronous local fallback so `this.data` is always usable immediately,
    // even before init() (Supabase load) has completed or if Supabase isn't configured.
    this.ensureDataDir();
    this.data = this.loadData();
  }

  /**
   * Call this once at server startup (before accepting requests).
   * If Supabase is configured, it pulls the persisted state from there
   * (seeding Supabase with the local/default data on first run).
   * If Supabase is not configured, it silently keeps using the local
   * data/database.json file, so local dev without Supabase still works.
   */
  public async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    if (!isServerSupabaseConfigured || !serverSupabase) {
      console.log('[db] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — using local data/database.json');
      return;
    }

    try {
      const { data: row, error } = await serverSupabase
        .from(APP_STATE_TABLE)
        .select('data')
        .eq('id', APP_STATE_ROW_ID)
        .maybeSingle();

      if (error) {
        console.error('[db] Failed to read app_state from Supabase, falling back to local data:', error.message);
        return;
      }

      if (row?.data) {
        this.data = row.data as DatabaseSchema;
        console.log('[db] Loaded application data from Supabase.');
      } else {
        // First run: seed Supabase with whatever we currently have (local/default data)
        await this.pushToSupabase();
        console.log('[db] Supabase app_state was empty — seeded it with initial data.');
      }
    } catch (err) {
      console.error('[db] Error connecting to Supabase, falling back to local data:', err);
    }
  }

  private async pushToSupabase(): Promise<boolean> {
    if (!isServerSupabaseConfigured || !serverSupabase) return true; // nothing to sync; local file is the source of truth
    try {
      const { error } = await serverSupabase
        .from(APP_STATE_TABLE)
        .upsert({ id: APP_STATE_ROW_ID, data: this.data, updated_at: new Date().toISOString() });
      if (error) {
        console.error('[db] Failed to write app_state to Supabase:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[db] Error writing to Supabase:', err);
      return false;
    }
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch (err) {
        console.error('Failed to create data directory:', err);
      }
    }
  }

  private loadData(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          parsed.clients &&
          parsed.clients.some((c: any) => c.name?.includes('Zaabi')) &&
          parsed.company?.name === 'ACCESS ENERGY'
        ) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Could not read existing database.json, initializing seed data.', err);
    }

    // Initialize with rich realistic seed data
    const seedDocs = createSeedDocuments();
    const initial: DatabaseSchema = {
      company: defaultCompany,
      clients: seedClients,
      products: seedProducts,
      devis: seedDocs.devis,
      bl: seedDocs.bl,
      factures: seedDocs.factures,
      payments: seedDocs.payments,
      auditLogs: seedDocs.auditLogs,
    };
    this.saveDataDirect(initial);
    return initial;
  }

  private saveData() {
    // Local file: kept as an offline cache / fallback for local dev without Supabase.
    this.saveDataDirect(this.data);
    // Supabase: the real persistence when configured. Not awaited here so existing
    // synchronous callers (routes in server.ts) don't need to become async — but the
    // resulting promise is tracked so the API layer CAN await confirmation before
    // replying to the client (see waitForLastSync() and the middleware in server.ts),
    // instead of silently losing a write if Supabase fails.
    this.lastSyncPromise = this.pushToSupabase();
  }

  /**
   * Resolves once the most recent write has been confirmed against Supabase
   * (or immediately if Supabase isn't configured / nothing was pending).
   * Used by server.ts to delay the HTTP response for mutating requests until
   * the data is actually durable, instead of a pure fire-and-forget write.
   */
  public async waitForLastSync(): Promise<boolean> {
    try {
      return await this.lastSyncPromise;
    } catch {
      return false;
    }
  }

  private saveDataDirect(data: DatabaseSchema) {
    try {
      this.ensureDataDir();
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing to database.json:', err);
    }
  }

  // --- Audit Logger ---
  public addAudit(
    action: AuditLog['action'],
    entity: AuditLog['entity'],
    entity_id: string,
    description: string,
    entity_number?: string,
    user_name = 'Responsable Commercial'
  ) {
    const audit: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user_name,
      action,
      entity,
      entity_id,
      entity_number,
      description,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(audit);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.saveData();
    return audit;
  }

  public getAuditLogs(): AuditLog[] {
    return this.data.auditLogs;
  }

  // --- Company Settings ---
  public getCompany(): CompanySettings {
    return this.data.company;
  }

  public updateCompany(settings: Partial<CompanySettings>): CompanySettings {
    this.data.company = {
      ...this.data.company,
      ...settings,
    };
    this.addAudit('modification', 'parametres', this.data.company.id, 'Mise à jour des coordonnées et paramètres d\'entreprise');
    this.saveData();
    return this.data.company;
  }

  // --- Document Numbering Engine ---
  public generateNextNumber(type: 'devis' | 'bl' | 'facture'): string {
    const prefix =
      type === 'devis'
        ? this.data.company.devis_prefix
        : type === 'bl'
        ? this.data.company.bl_prefix
        : this.data.company.facture_prefix;

    let nextNum =
      type === 'devis'
        ? this.data.company.next_devis_number
        : type === 'bl'
        ? this.data.company.next_bl_number
        : this.data.company.next_facture_number;

    // Check against existing documents to prevent any accidental duplicate numbers
    const list =
      type === 'devis'
        ? this.data.devis
        : type === 'bl'
        ? this.data.bl
        : this.data.factures;

    let candidate = `${prefix}${String(nextNum).padStart(6, '0')}`;
    while (list.some((d) => d.number === candidate)) {
      nextNum++;
      candidate = `${prefix}${String(nextNum).padStart(6, '0')}`;
    }

    // Increment and persist counter
    if (type === 'devis') this.data.company.next_devis_number = nextNum + 1;
    else if (type === 'bl') this.data.company.next_bl_number = nextNum + 1;
    else this.data.company.next_facture_number = nextNum + 1;

    this.saveData();
    return candidate;
  }

  // --- Clients CRUD with Aggregated Financials ---
  public getClients(): Client[] {
    // Enrich with computed financial balances
    return this.data.clients.map((c) => {
      const clientInvoices = this.data.factures.filter((f) => f.client_id === c.id && f.status !== 'annulee');
      const total_facture = clientInvoices.reduce((sum, f) => sum + (f.totals?.total_ttc || 0), 0);
      const total_paye = clientInvoices.reduce((sum, f) => sum + (f.amount_paid || 0), 0);
      const solde_du = total_facture - total_paye;

      return {
        ...c,
        total_facture: Math.round(total_facture * 1000) / 1000,
        total_paye: Math.round(total_paye * 1000) / 1000,
        solde_du: Math.round(solde_du * 1000) / 1000,
      };
    });
  }

  public getClientById(id: string): Client | undefined {
    return this.getClients().find((c) => c.id === id);
  }

  public createClient(clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Client {
    // Idempotent replay support: if a client-generated id already exists (offline
    // sync retry), return the existing record instead of creating a duplicate.
    if (clientData.id) {
      const existing = this.data.clients.find((c) => c.id === clientData.id);
      if (existing) return existing;
    }
    const newClient: Client = {
      ...clientData,
      id: clientData.id || `cli-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.data.clients.unshift(newClient);
    this.addAudit('creation', 'client', newClient.id, `Création du client ${newClient.name}`);
    this.saveData();
    return newClient;
  }

  public updateClient(id: string, clientData: Partial<Client>): Client | null {
    const idx = this.data.clients.findIndex((c) => c.id === id);
    if (idx === -1) return null;

    this.data.clients[idx] = {
      ...this.data.clients[idx],
      ...clientData,
      updated_at: new Date().toISOString(),
    };
    this.addAudit('modification', 'client', id, `Modification de la fiche client ${this.data.clients[idx].name}`);
    this.saveData();
    return this.data.clients[idx];
  }

  public deleteClient(id: string): boolean {
    const client = this.data.clients.find((c) => c.id === id);
    if (!client) return false;

    // Check if client has linked documents
    const hasDocs =
      this.data.devis.some((d) => d.client_id === id) ||
      this.data.bl.some((b) => b.client_id === id) ||
      this.data.factures.some((f) => f.client_id === id);

    if (hasDocs) {
      // Soft-delete / deactivate to preserve historical integrity
      client.status = 'inactif';
      client.updated_at = new Date().toISOString();
      this.addAudit('changement_statut', 'client', id, `Désactivation du client ${client.name} (documents existants préservés)`);
      this.saveData();
      return true;
    }

    this.data.clients = this.data.clients.filter((c) => c.id !== id);
    this.addAudit('suppression', 'client', id, `Suppression définitive du client ${client.name}`);
    this.saveData();
    return true;
  }

  // --- Products CRUD ---
  public getProducts(): Product[] {
    return this.data.products;
  }

  public getProductById(id: string): Product | undefined {
    return this.data.products.find((p) => p.id === id);
  }

  public createProduct(productData: Omit<Product, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Product {
    if (productData.id) {
      const existing = this.data.products.find((p) => p.id === productData.id);
      if (existing) return existing;
    }
    const newProduct: Product = {
      ...productData,
      id: productData.id || `prd-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.data.products.unshift(newProduct);
    this.addAudit('creation', 'produit', newProduct.id, `Création du produit [${newProduct.reference}] ${newProduct.designation}`);
    this.saveData();
    return newProduct;
  }

  public updateProduct(id: string, productData: Partial<Product>): Product | null {
    const idx = this.data.products.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    this.data.products[idx] = {
      ...this.data.products[idx],
      ...productData,
      updated_at: new Date().toISOString(),
    };
    this.addAudit('modification', 'produit', id, `Mise à jour du produit [${this.data.products[idx].reference}]`);
    this.saveData();
    return this.data.products[idx];
  }

  public deleteProduct(id: string): boolean {
    const prd = this.data.products.find((p) => p.id === id);
    if (!prd) return false;

    // Soft delete to avoid breaking historical quotes
    prd.active = false;
    prd.updated_at = new Date().toISOString();
    this.addAudit('changement_statut', 'produit', id, `Désactivation du produit [${prd.reference}] ${prd.designation}`);
    this.saveData();
    return true;
  }

  // --- Devis CRUD & Operations ---
  public getDevis(): CommercialDocument[] {
    return this.data.devis;
  }

  public getDevisById(id: string): CommercialDocument | undefined {
    return this.data.devis.find((d) => d.id === id);
  }

  public createDevis(doc: Partial<CommercialDocument>): CommercialDocument {
    if (doc.id) {
      const existing = this.data.devis.find((d) => d.id === doc.id);
      if (existing) return existing;
    }
    const timbreFiscal = this.data.company.timbre_fiscal ?? 1.000;
    const totals = calculateDocumentTotals(doc.lines || [], timbreFiscal);
    const number = doc.number || this.generateNextNumber('devis');
    const arrete_somme = numberToWordsTunisianTND(totals.total_ttc);

    const newDoc: CommercialDocument = {
      id: doc.id || `dev-${Date.now()}`,
      type: 'devis',
      number,
      client_id: doc.client_id || '',
      client_snapshot: doc.client_snapshot || {
        name: 'Client Inconnu',
        address: '',
        city: '',
        phone: '',
        email: '',
      },
      date: doc.date || new Date().toISOString().split('T')[0],
      validity_date: doc.validity_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: doc.status || 'brouillon',
      lines: doc.lines || [],
      totals,
      payment_method: doc.payment_method || 'virement',
      payment_reference: doc.payment_reference,
      notes: doc.notes,
      conditions: doc.conditions || this.data.company.default_conditions,
      arrete_somme,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.data.devis.unshift(newDoc);
    this.addAudit('creation', 'devis', newDoc.id, `Création du devis ${newDoc.number} (Total TTC: ${totals.total_ttc.toFixed(3)} DT)`, newDoc.number);
    this.saveData();
    return newDoc;
  }

  public updateDevis(id: string, doc: Partial<CommercialDocument>): CommercialDocument | null {
    const idx = this.data.devis.findIndex((d) => d.id === id);
    if (idx === -1) return null;

    const lines = doc.lines || this.data.devis[idx].lines;
    const timbreFiscal = this.data.company.timbre_fiscal ?? 1.000;
    const totals = calculateDocumentTotals(lines, timbreFiscal);
    const arrete_somme = numberToWordsTunisianTND(totals.total_ttc);

    this.data.devis[idx] = {
      ...this.data.devis[idx],
      ...doc,
      lines,
      totals,
      arrete_somme,
      updated_at: new Date().toISOString(),
    };

    this.addAudit('modification', 'devis', id, `Mise à jour du devis ${this.data.devis[idx].number}`, this.data.devis[idx].number);
    this.saveData();
    return this.data.devis[idx];
  }

  public deleteDevis(id: string): boolean {
    const dev = this.data.devis.find((d) => d.id === id);
    if (!dev) return false;

    this.data.devis = this.data.devis.filter((d) => d.id !== id);
    this.addAudit('suppression', 'devis', id, `Suppression du devis ${dev.number}`, dev.number);
    this.saveData();
    return true;
  }

  // --- Devis Conversion -> Bon de Livraison ---
  public convertDevisToBL(devisId: string): CommercialDocument | null {
    const devis = this.getDevisById(devisId);
    if (!devis) return null;

    const nextBLNumber = this.generateNextNumber('bl');
    const newBL: CommercialDocument = {
      id: `bl-${Date.now()}`,
      type: 'bl',
      number: nextBLNumber,
      client_id: devis.client_id,
      client_snapshot: { ...devis.client_snapshot },
      source_document_id: devis.id,
      source_document_number: devis.number,
      date: new Date().toISOString().split('T')[0],
      status: 'prepare',
      lines: JSON.parse(JSON.stringify(devis.lines)),
      totals: { ...devis.totals },
      payment_method: devis.payment_method,
      notes: `Généré automatiquement depuis le devis ${devis.number}. ${devis.notes || ''}`.trim(),
      conditions: 'Réception conforme des marchandises désignées ci-dessus sans réserve.',
      arrete_somme: devis.arrete_somme,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.data.bl.unshift(newBL);

    // Update Devis status to accepted
    devis.status = 'accepte';
    devis.updated_at = new Date().toISOString();

    this.addAudit('conversion', 'bl', newBL.id, `Conversion du devis ${devis.number} en Bon de Livraison ${newBL.number}`, newBL.number);
    this.saveData();
    return newBL;
  }

  // --- Devis Conversion -> Facture ---
  public convertDevisToFacture(devisId: string): CommercialDocument | null {
    const devis = this.getDevisById(devisId);
    if (!devis) return null;

    const nextFactureNumber = this.generateNextNumber('facture');
    const today = new Date();
    const dueDate = new Date(today.getTime() + 30 * 86400000).toISOString().split('T')[0];

    const newFacture: CommercialDocument = {
      id: `fa-${Date.now()}`,
      type: 'facture',
      number: nextFactureNumber,
      client_id: devis.client_id,
      client_snapshot: { ...devis.client_snapshot },
      source_document_id: devis.id,
      source_document_number: devis.number,
      date: today.toISOString().split('T')[0],
      due_date: dueDate,
      status: 'emise',
      lines: JSON.parse(JSON.stringify(devis.lines)),
      totals: { ...devis.totals },
      payment_method: devis.payment_method,
      amount_paid: 0,
      amount_remaining: devis.totals.total_ttc,
      notes: `Facturation directe depuis le devis ${devis.number}. ${devis.notes || ''}`.trim(),
      conditions: this.data.company.default_conditions,
      arrete_somme: devis.arrete_somme,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.data.factures.unshift(newFacture);

    devis.status = 'accepte';
    devis.updated_at = new Date().toISOString();

    this.addAudit('conversion', 'facture', newFacture.id, `Conversion directe du devis ${devis.number} en Facture ${newFacture.number}`, newFacture.number);
    this.saveData();
    return newFacture;
  }

  // --- Bons de Livraison CRUD ---
  public getBL(): CommercialDocument[] {
    return this.data.bl;
  }

  public getBLById(id: string): CommercialDocument | undefined {
    return this.data.bl.find((b) => b.id === id);
  }

  public createBL(doc: Partial<CommercialDocument>): CommercialDocument {
    if (doc.id) {
      const existing = this.data.bl.find((b) => b.id === doc.id);
      if (existing) return existing;
    }
    const timbreFiscal = this.data.company.timbre_fiscal ?? 1.000;
    const totals = calculateDocumentTotals(doc.lines || [], timbreFiscal);
    const number = doc.number || this.generateNextNumber('bl');

    const newDoc: CommercialDocument = {
      id: doc.id || `bl-${Date.now()}`,
      type: 'bl',
      number,
      client_id: doc.client_id || '',
      client_snapshot: doc.client_snapshot || {
        name: 'Client Inconnu',
        address: '',
        city: '',
        phone: '',
        email: '',
      },
      date: doc.date || new Date().toISOString().split('T')[0],
      status: doc.status || 'prepare',
      lines: doc.lines || [],
      totals,
      source_document_id: doc.source_document_id,
      source_document_number: doc.source_document_number,
      notes: doc.notes,
      conditions: doc.conditions || 'Réception conforme des marchandises.',
      arrete_somme: numberToWordsTunisianTND(totals.total_ttc),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.data.bl.unshift(newDoc);
    this.addAudit('creation', 'bl', newDoc.id, `Création du BL ${newDoc.number}`, newDoc.number);
    this.saveData();
    return newDoc;
  }

  public updateBL(id: string, doc: Partial<CommercialDocument>): CommercialDocument | null {
    const idx = this.data.bl.findIndex((b) => b.id === id);
    if (idx === -1) return null;

    const lines = doc.lines || this.data.bl[idx].lines;
    const timbreFiscal = this.data.company.timbre_fiscal ?? 1.000;
    const totals = calculateDocumentTotals(lines, timbreFiscal);

    this.data.bl[idx] = {
      ...this.data.bl[idx],
      ...doc,
      lines,
      totals,
      arrete_somme: numberToWordsTunisianTND(totals.total_ttc),
      updated_at: new Date().toISOString(),
    };

    this.addAudit('modification', 'bl', id, `Mise à jour du BL ${this.data.bl[idx].number}`, this.data.bl[idx].number);
    this.saveData();
    return this.data.bl[idx];
  }

  public deleteBL(id: string): boolean {
    const bl = this.data.bl.find((b) => b.id === id);
    if (!bl) return false;

    this.data.bl = this.data.bl.filter((b) => b.id !== id);
    this.addAudit('suppression', 'bl', id, `Suppression du Bon de Livraison ${bl.number}`, bl.number);
    this.saveData();
    return true;
  }

  // --- BL Conversion -> Facture ---
  public convertBLToFacture(blId: string): CommercialDocument | null {
    const bl = this.getBLById(blId);
    if (!bl) return null;

    const nextFactureNumber = this.generateNextNumber('facture');
    const today = new Date();
    const dueDate = new Date(today.getTime() + 30 * 86400000).toISOString().split('T')[0];

    const newFacture: CommercialDocument = {
      id: `fa-${Date.now()}`,
      type: 'facture',
      number: nextFactureNumber,
      client_id: bl.client_id,
      client_snapshot: { ...bl.client_snapshot },
      source_document_id: bl.id,
      source_document_number: bl.number,
      date: today.toISOString().split('T')[0],
      due_date: dueDate,
      status: 'emise',
      lines: JSON.parse(JSON.stringify(bl.lines)),
      totals: { ...bl.totals },
      payment_method: bl.payment_method,
      amount_paid: 0,
      amount_remaining: bl.totals.total_ttc,
      notes: `Facture établie suite au Bon de Livraison ${bl.number}. ${bl.notes || ''}`.trim(),
      conditions: this.data.company.default_conditions,
      arrete_somme: bl.arrete_somme,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.data.factures.unshift(newFacture);

    bl.status = 'livre';
    bl.updated_at = new Date().toISOString();

    this.addAudit('conversion', 'facture', newFacture.id, `Conversion du BL ${bl.number} en Facture ${newFacture.number}`, newFacture.number);
    this.saveData();
    return newFacture;
  }

  // --- Factures CRUD ---
  public getFactures(): CommercialDocument[] {
    return this.data.factures;
  }

  public getFactureById(id: string): CommercialDocument | undefined {
    return this.data.factures.find((f) => f.id === id);
  }

  public createFacture(doc: Partial<CommercialDocument>): CommercialDocument {
    if (doc.id) {
      const existing = this.data.factures.find((f) => f.id === doc.id);
      if (existing) return existing;
    }
    const timbreFiscal = this.data.company.timbre_fiscal ?? 1.000;
    const totals = calculateDocumentTotals(doc.lines || [], timbreFiscal);
    const number = doc.number || this.generateNextNumber('facture');
    const today = new Date().toISOString().split('T')[0];
    const dueDate = doc.due_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const arrete_somme = numberToWordsTunisianTND(totals.total_ttc);

    const newDoc: CommercialDocument = {
      id: doc.id || `fa-${Date.now()}`,
      type: 'facture',
      number,
      client_id: doc.client_id || '',
      client_snapshot: doc.client_snapshot || {
        name: 'Client Inconnu',
        address: '',
        city: '',
        phone: '',
        email: '',
      },
      date: doc.date || today,
      due_date: dueDate,
      status: doc.status || 'emise',
      lines: doc.lines || [],
      totals,
      source_document_id: doc.source_document_id,
      source_document_number: doc.source_document_number,
      payment_method: doc.payment_method || 'virement',
      payment_reference: doc.payment_reference,
      payment_date: doc.payment_date,
      amount_paid: 0,
      amount_remaining: totals.total_ttc,
      notes: doc.notes,
      conditions: doc.conditions || this.data.company.default_conditions,
      arrete_somme,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.data.factures.unshift(newDoc);
    this.addAudit('creation', 'facture', newDoc.id, `Création de la facture ${newDoc.number} (Total TTC: ${totals.total_ttc.toFixed(3)} DT)`, newDoc.number);
    this.saveData();
    return newDoc;
  }

  public updateFacture(id: string, doc: Partial<CommercialDocument>): CommercialDocument | null {
    const idx = this.data.factures.findIndex((f) => f.id === id);
    if (idx === -1) return null;

    const lines = doc.lines || this.data.factures[idx].lines;
    const timbreFiscal = this.data.company.timbre_fiscal ?? 1.000;
    const totals = calculateDocumentTotals(lines, timbreFiscal);
    const paid = this.data.factures[idx].amount_paid || 0;
    const remaining = Math.max(0, totals.total_ttc - paid);

    // Auto update status based on payments
    let status = doc.status || this.data.factures[idx].status;
    if (status !== 'annulee') {
      if (paid >= totals.total_ttc && totals.total_ttc > 0) {
        status = 'payee';
      } else if (paid > 0) {
        status = 'partiellement_payee';
      } else if (doc.due_date && new Date(doc.due_date) < new Date()) {
        status = 'en_retard';
      }
    }

    this.data.factures[idx] = {
      ...this.data.factures[idx],
      ...doc,
      lines,
      totals,
      amount_remaining: Math.round(remaining * 1000) / 1000,
      status,
      arrete_somme: numberToWordsTunisianTND(totals.total_ttc),
      updated_at: new Date().toISOString(),
    };

    this.addAudit('modification', 'facture', id, `Mise à jour de la facture ${this.data.factures[idx].number}`, this.data.factures[idx].number);
    this.saveData();
    return this.data.factures[idx];
  }

  public deleteFacture(id: string): boolean {
    const fac = this.data.factures.find((f) => f.id === id);
    if (!fac) return false;

    // Remove associated payments
    this.data.payments = this.data.payments.filter((p) => p.invoice_id !== id);
    this.data.factures = this.data.factures.filter((f) => f.id !== id);

    this.addAudit('suppression', 'facture', id, `Suppression de la facture ${fac.number}`, fac.number);
    this.saveData();
    return true;
  }

  // --- Payments Engine & Invoices Reconciliation ---
  public getPayments(): Payment[] {
    return this.data.payments;
  }

  public registerPayment(paymentData: Omit<Payment, 'id' | 'created_at'> & { id?: string }): { payment: Payment; invoice: CommercialDocument } | null {
    const invoice = this.getFactureById(paymentData.invoice_id);
    if (!invoice) return null;

    // Idempotent replay support: if this exact payment id was already applied
    // (offline sync retry), return the existing result instead of re-applying
    // the amount a second time onto the invoice.
    if (paymentData.id) {
      const existing = this.data.payments.find((p) => p.id === paymentData.id);
      if (existing) {
        return { payment: existing, invoice };
      }
    }

    const paymentAmount = Number(paymentData.amount) || 0;
    if (paymentAmount <= 0) return null;

    const newPayment: Payment = {
      ...paymentData,
      id: paymentData.id || `pay-${Date.now()}`,
      invoice_number: invoice.number,
      client_id: invoice.client_id,
      client_name: invoice.client_snapshot.name,
      amount: Math.round(paymentAmount * 1000) / 1000,
      created_at: new Date().toISOString(),
    };

    this.data.payments.unshift(newPayment);

    // Recompute invoice paid & remaining amount
    const currentPaid = (invoice.amount_paid || 0) + newPayment.amount;
    const totalTTC = invoice.totals.total_ttc;
    const remaining = Math.max(0, totalTTC - currentPaid);

    invoice.amount_paid = Math.round(currentPaid * 1000) / 1000;
    invoice.amount_remaining = Math.round(remaining * 1000) / 1000;

    if (currentPaid >= totalTTC - 0.001) {
      invoice.status = 'payee';
    } else {
      invoice.status = 'partiellement_payee';
    }

    invoice.payment_method = newPayment.method;
    invoice.payment_reference = newPayment.reference;
    invoice.payment_date = newPayment.date;
    invoice.updated_at = new Date().toISOString();

    this.addAudit(
      'paiement',
      'paiement',
      newPayment.id,
      `Règlement de ${newPayment.amount.toFixed(3)} DT enregistré pour la facture ${invoice.number} (${newPayment.method.toUpperCase()})`,
      invoice.number
    );

    this.saveData();
    return { payment: newPayment, invoice };
  }

  public deletePayment(paymentId: string): boolean {
    const payment = this.data.payments.find((p) => p.id === paymentId);
    if (!payment) return false;

    const invoice = this.getFactureById(payment.invoice_id);
    if (invoice) {
      const currentPaid = Math.max(0, (invoice.amount_paid || 0) - payment.amount);
      const remaining = Math.max(0, invoice.totals.total_ttc - currentPaid);
      invoice.amount_paid = Math.round(currentPaid * 1000) / 1000;
      invoice.amount_remaining = Math.round(remaining * 1000) / 1000;

      if (currentPaid <= 0.001) {
        invoice.status = 'emise';
      } else {
        invoice.status = 'partiellement_payee';
      }
      invoice.updated_at = new Date().toISOString();
    }

    this.data.payments = this.data.payments.filter((p) => p.id !== paymentId);
    this.addAudit('suppression', 'paiement', paymentId, `Suppression du règlement de ${payment.amount.toFixed(3)} DT sur facture ${payment.invoice_number}`);
    this.saveData();
    return true;
  }

  // --- Reports & Commercial Metrics ---
  public getDashboardMetrics(): any {
    const validInvoices = this.data.factures.filter((f) => f.status !== 'annulee');
    const total_revenue = validInvoices.reduce((sum, f) => sum + (f.totals?.total_ttc || 0), 0);
    const paid_revenue = this.data.payments.reduce((sum, p) => sum + p.amount, 0);
    const pending_revenue = Math.max(0, total_revenue - paid_revenue);

    const now = new Date();
    const overdue_revenue = validInvoices
      .filter((f) => f.status === 'en_retard' || (f.amount_remaining && f.amount_remaining > 0 && f.due_date && new Date(f.due_date) < now))
      .reduce((sum, f) => sum + (f.amount_remaining || 0), 0);

    const count_devis = this.data.devis.length;
    const count_devis_accepted = this.data.devis.filter((d) => d.status === 'accepte').length;
    const conversion_rate_devis = count_devis > 0 ? Math.round((count_devis_accepted / count_devis) * 100) : 0;

    // Monthly breakdown (last 6 months)
    const months = ['Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept'];
    const monthly_revenue = [
      { month: 'Avril', turnover: 12450.000, paid: 12450.000 },
      { month: 'Mai', turnover: 18900.000, paid: 17200.000 },
      { month: 'Juin', turnover: 24500.000, paid: 21000.000 },
      { month: 'Juillet', turnover: 31200.000, paid: 28400.000 },
      { month: 'Août', turnover: total_revenue, paid: paid_revenue },
    ];

    return {
      total_revenue: Math.round(total_revenue * 1000) / 1000,
      paid_revenue: Math.round(paid_revenue * 1000) / 1000,
      pending_revenue: Math.round(pending_revenue * 1000) / 1000,
      overdue_revenue: Math.round(overdue_revenue * 1000) / 1000,
      count_devis,
      count_devis_accepted,
      conversion_rate_devis,
      count_bl: this.data.bl.length,
      count_factures: this.data.factures.length,
      count_clients: this.data.clients.length,
      count_products: this.data.products.length,
      recent_invoices: this.data.factures.slice(0, 5),
      recent_devis: this.data.devis.slice(0, 5),
      recent_payments: this.data.payments.slice(0, 5),
      monthly_revenue,
    };
  }

  public resetToSeed(): DatabaseSchema {
    const seedDocs = createSeedDocuments();
    this.data = {
      company: { ...defaultCompany },
      clients: [...seedClients],
      products: [...seedProducts],
      devis: seedDocs.devis,
      bl: seedDocs.bl,
      factures: seedDocs.factures,
      payments: seedDocs.payments,
      auditLogs: seedDocs.auditLogs,
    };
    this.saveData();
    return this.data;
  }
}

export const db = new DatabaseService();

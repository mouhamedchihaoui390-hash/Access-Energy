/**
 * Types and Domain Models for the Commercial Management ERP (Tunisia)
 */

export type ClientType = 'entreprise' | 'particulier';

export interface Client {
  id: string;
  client_type?: ClientType;
  name: string;
  nom?: string;
  company_name?: string;
  matricule_fiscal?: string;
  registre_commerce?: string;
  cin?: string;
  cin_matricule_fiscale?: string;
  reference_client?: string;
  address: string;
  adresse?: string;
  city?: string;
  governorate?: string;
  postal_code?: string;
  phone: string;
  telephone?: string;
  email: string;
  notes?: string;
  status?: 'actif' | 'inactif';
  created_at?: string;
  updated_at?: string;
  // Computed summary
  total_facture?: number;
  total_paye?: number;
  solde_du?: number;
}

export interface Product {
  id: string;
  reference: string;
  designation: string;
  description?: string;
  category: string;
  unit: string; // e.g. "Pièce", "Unité", "Mètre", "Forfait", "Kit"
  purchase_price_ht?: number;
  sale_price_ht: number;
  tva: number; // e.g. 19, 7, 13, 0
  stock?: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentLine {
  id: string;
  product_id?: string;
  reference: string;
  designation: string;
  quantity: number;
  unit: string;
  unit_price_ht: number;
  discount_percent: number; // 0 - 100
  tva_percent: number; // e.g. 19, 7, 13, 0
  total_ht: number; // computed
  total_tva: number; // computed
  total_ttc: number; // computed
}

export type CommercialDocumentLine = DocumentLine;

export type DevisStatus = 'brouillon' | 'envoye' | 'accepte' | 'refuse' | 'expire';
export type BLStatus = 'brouillon' | 'prepare' | 'livre' | 'annule';
export type FactureStatus = 'brouillon' | 'emise' | 'partiellement_payee' | 'payee' | 'en_retard' | 'annulee';

export type PaymentMethod = 'especes' | 'virement' | 'cheque' | 'traite' | 'autre';

export interface DocumentTotals {
  subtotal_brut_ht: number;
  total_remise: number;
  subtotal_net_ht: number;
  tva_details: { rate: number; base_ht: number; amount_tva: number }[];
  total_tva: number;
  timbre_fiscal: number;
  total_ttc: number;
}

export type CommercialDocumentType = 'devis' | 'bl' | 'bon_livraison' | 'facture' | 'avoir';

export interface CommercialDocument {
  id: string;
  type: CommercialDocumentType;
  number: string;
  client_id: string;
  client_snapshot: {
    name: string;
    nom?: string;
    company_name?: string;
    matricule_fiscal?: string;
    registre_commerce?: string;
    cin?: string;
    cin_matricule_fiscale?: string;
    reference_client?: string;
    address: string;
    adresse?: string;
    city?: string;
    phone: string;
    telephone?: string;
    email: string;
  };
  description?: string;
  has_remise?: boolean;
  source_document_id?: string; // e.g. Devis ID if created from Devis, or BL ID if from BL
  source_document_number?: string;
  date: string; // YYYY-MM-DD
  due_date?: string; // for invoices
  validity_date?: string; // for devis
  status: DevisStatus | BLStatus | FactureStatus;
  lines: DocumentLine[];
  totals: DocumentTotals;
  payment_mode?: string;
  payment_method?: PaymentMethod;
  payment_reference?: string;
  payment_date?: string;
  notes?: string;
  conditions?: string;
  arrete_somme?: string; // "Arrêté le présent document à la somme de..."
  // For invoices
  amount_paid?: number;
  amount_remaining?: number;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  invoice_number: string;
  client_id: string;
  client_name: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  bank?: string;
  notes?: string;
  created_at: string;
}

export interface CompanySettings {
  id: string;
  name: string;
  legal_name: string;
  subtitle: string; // e.g. "ÉNERGIE SOLAIRE • PV BT • POMPAGE • MT"
  logo_url?: string;
  address_line1: string; // "AV FARHAD HACHET - BIR MCHARGUA - Zaghouan"
  address_line2?: string; // "Rue sidi bouchoucha - Manouba"
  city: string;
  country: string;
  phone: string;
  email: string;
  website?: string;
  matricule_fiscal: string; // "1954656YAM000"
  registre_commerce: string; // "Y1954656"
  identifiant_unique?: string;
  rib?: string;
  bank_name?: string;
  default_tva: number; // 19
  timbre_fiscal: number; // 1.000
  currency_symbol: string; // "DT"
  devis_prefix: string; // "DEVIS-"
  bl_prefix: string; // "BL-"
  facture_prefix: string; // "FA-"
  next_devis_number: number;
  next_bl_number: number;
  next_facture_number: number;
  default_conditions?: string;
  footer_text: string; // "Merci pour votre confiance."
}

export interface AuditLog {
  id: string;
  user_name: string;
  action: 'creation' | 'modification' | 'conversion' | 'paiement' | 'suppression' | 'changement_statut';
  entity: 'client' | 'produit' | 'devis' | 'bl' | 'facture' | 'paiement' | 'parametres';
  entity_id: string;
  entity_number?: string;
  description: string;
  timestamp: string;
}

export interface DashboardMetrics {
  total_revenue: number;
  paid_revenue: number;
  pending_revenue: number;
  overdue_revenue: number;
  count_devis: number;
  count_devis_accepted: number;
  conversion_rate_devis: number;
  count_bl: number;
  count_factures: number;
  count_clients: number;
  count_products: number;
  recent_invoices: CommercialDocument[];
  recent_devis: CommercialDocument[];
  recent_payments: Payment[];
  monthly_revenue: { month: string; turnover: number; paid: number }[];
}

export interface FinancialReport {
  total_ca_ht: number;
  total_tva: number;
  total_timbre: number;
  total_ttc: number;
  total_encaisse: number;
  total_solde_du: number;
  tva_by_rate: { rate: number; base: number; amount: number }[];
  top_clients: { client_id: string; client_name: string; total_ttc: number; invoices_count: number }[];
  payments_by_method: { method: string; count: number; amount: number }[];
}

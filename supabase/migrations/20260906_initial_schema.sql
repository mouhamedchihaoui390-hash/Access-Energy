-- ====================================================================
-- ACCESS ENERGY - ERP COMMERCIAL & FACTURATION
-- Supabase PostgreSQL Relational Schema & Concurrency-Safe Sequence Engine
-- Migration: 20260906_initial_schema.sql
-- ====================================================================

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. COMPANIES TABLE
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL DEFAULT 'ACCESS ENERGY',
    legal_name VARCHAR(255) DEFAULT 'ACCESS ENERGY SARL',
    subtitle VARCHAR(255) DEFAULT 'ÉNERGIE SOLAIRE • PV BT • POMPAGE • MT',
    address_line1 VARCHAR(255) DEFAULT 'AV FARHAD HACHET - BIR MCHARGUA - ZAGHOUAN',
    address_line2 VARCHAR(255) DEFAULT 'RUE SIDI BOUCHOUCHA - MANOUBA',
    city VARCHAR(100) DEFAULT 'Bir Mchargua - Zaghouan',
    country VARCHAR(100) DEFAULT 'Tunisie',
    phone VARCHAR(100) DEFAULT '28 057 771 / 29256084',
    email VARCHAR(255) DEFAULT 'solution.accessenergy@gmail.com',
    website VARCHAR(255) DEFAULT 'www.access-energy.tn',
    matricule_fiscal VARCHAR(100) DEFAULT '1954656YAM000',
    registre_commerce VARCHAR(100) DEFAULT '1954656YAM000',
    identifiant_unique VARCHAR(100) DEFAULT '1954656YAM000',
    rib VARCHAR(150) DEFAULT '08 014 0001234567890 42 (BIAT Bir Mchargua)',
    bank_name VARCHAR(100) DEFAULT 'BIAT',
    default_tva NUMERIC(5, 2) DEFAULT 19.00,
    timbre_fiscal NUMERIC(10, 3) DEFAULT 1.000,
    currency_symbol VARCHAR(10) DEFAULT 'TND',
    footer_text VARCHAR(255) DEFAULT 'Merci pour votre confiance.',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CLIENTS TABLE
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    nom VARCHAR(255),
    client_type VARCHAR(50) DEFAULT 'particulier', -- 'particulier' | 'entreprise'
    company_name VARCHAR(255),
    phone VARCHAR(100) NOT NULL,
    telephone VARCHAR(100),
    address TEXT NOT NULL,
    adresse TEXT,
    city VARCHAR(100) DEFAULT 'Radès',
    governorate VARCHAR(100) DEFAULT 'Ben Arous',
    postal_code VARCHAR(20) DEFAULT '2040',
    email VARCHAR(255),
    tax_id VARCHAR(100),
    cin VARCHAR(100),
    cin_matricule_fiscale VARCHAR(100),
    reference VARCHAR(100),
    reference_client VARCHAR(100),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'actif',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    designation VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'Général',
    unit VARCHAR(50) DEFAULT 'Pièce',
    default_unit_price_ht NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
    purchase_price_ht NUMERIC(15, 3) DEFAULT 0.000,
    default_vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 19.00,
    tva NUMERIC(5, 2) DEFAULT 19.00,
    stock INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. DOCUMENT SEQUENCES (Concurrency-safe counter)
CREATE TABLE IF NOT EXISTS document_sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_type VARCHAR(50) UNIQUE NOT NULL, -- 'devis', 'bl', 'facture'
    prefix VARCHAR(20) NOT NULL,               -- 'Devis-', 'BL-', 'Facture-'
    next_number INTEGER NOT NULL DEFAULT 100,  -- First number is 100
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed initial sequences if not present
INSERT INTO document_sequences (document_type, prefix, next_number)
VALUES 
    ('devis', 'Devis-', 100),
    ('bl', 'BL-', 100),
    ('facture', 'Facture-', 100)
ON CONFLICT (document_type) DO NOTHING;

-- ATOMIC CONCURRENCY-SAFE RPC FUNCTION FOR DOCUMENT NUMBER GENERATION
CREATE OR REPLACE FUNCTION get_next_document_number(doc_type VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    seq_prefix VARCHAR;
    cur_val INTEGER;
    formatted_num VARCHAR;
BEGIN
    -- Atomic row-level lock (FOR UPDATE) guarantees zero collisions during concurrent creations
    SELECT prefix, next_number INTO seq_prefix, cur_val
    FROM document_sequences
    WHERE document_type = doc_type
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Document sequence type not found: %', doc_type;
    END IF;

    -- Update sequence immediately
    UPDATE document_sequences
    SET next_number = next_number + 1,
        updated_at = NOW()
    WHERE document_type = doc_type;

    -- Format formatted number with 6 digits padding: e.g. Devis-000100
    formatted_num := seq_prefix || LPAD(cur_val::TEXT, 6, '0');
    RETURN formatted_num;
END;
$$ LANGUAGE plpgsql;

-- 5. DOCUMENTS TABLE (Unified Relational Document Entity)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL, -- 'devis', 'bl', 'facture'
    number VARCHAR(50) UNIQUE NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    validity_date DATE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    client_snapshot JSONB NOT NULL,
    description TEXT DEFAULT 'Générateur photovoltaïque raccordé au réseau STEG de puissance 2.46Kwc.',
    status VARCHAR(50) DEFAULT 'brouillon',
    has_remise BOOLEAN DEFAULT FALSE,
    payment_mode VARCHAR(100) DEFAULT 'Comptant',
    payment_method VARCHAR(100) DEFAULT 'especes',
    payment_reference VARCHAR(100),
    payment_date DATE,
    subtotal_ht NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
    total_remise NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
    vat_7 NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
    vat_19 NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
    timbre_fiscal NUMERIC(10, 3) DEFAULT 0.000,
    total_ttc NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
    amount_in_words TEXT,
    arrete_somme TEXT,
    source_document_id UUID,
    source_document_type VARCHAR(50),
    source_document_number VARCHAR(50),
    amount_paid NUMERIC(15, 3) DEFAULT 0.000,
    amount_remaining NUMERIC(15, 3) DEFAULT 0.000,
    notes TEXT,
    conditions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. DOCUMENT ITEMS TABLE
CREATE TABLE IF NOT EXISTS document_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    reference VARCHAR(100),
    designation VARCHAR(255) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
    unit VARCHAR(50) DEFAULT 'Pièce',
    unit_price_ht NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
    remise NUMERIC(15, 3) DEFAULT 0.000,
    discount_percent NUMERIC(5, 2) DEFAULT 0.00,
    vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 19.00,
    total_ht NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
    total_ttc NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
    sort_order INTEGER DEFAULT 0
);

-- 7. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    invoice_number VARCHAR(50),
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    client_name VARCHAR(255),
    amount NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
    payment_method VARCHAR(100) DEFAULT 'especes',
    method VARCHAR(100) DEFAULT 'especes',
    reference VARCHAR(100),
    bank VARCHAR(100),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. DOCUMENT FILES TABLE (Supabase Storage associations)
CREATE TABLE IF NOT EXISTS document_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    file_type VARCHAR(50) NOT NULL, -- 'pdf', 'docx', 'xlsx', 'image'
    storage_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. DOCUMENT EVENTS / HISTORY TABLE
CREATE TABLE IF NOT EXISTS document_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL, -- 'created', 'updated', 'status_changed', 'converted_to_bl', 'converted_to_facture', 'payment_received', 'exported_pdf', 'exported_word'
    user_email VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEXES FOR FREQUENTLY QUERIED FIELDS
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_number ON documents(number);
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_date ON documents(date);
CREATE INDEX IF NOT EXISTS idx_document_items_document_id ON document_items(document_id);
CREATE INDEX IF NOT EXISTS idx_payments_document_id ON payments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_files_document_id ON document_files(document_id);
CREATE INDEX IF NOT EXISTS idx_document_events_document_id ON document_events(document_id);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select companies" ON companies FOR SELECT USING (true);
CREATE POLICY "Allow authenticated manage companies" ON companies FOR ALL USING (true);

CREATE POLICY "Allow read clients" ON clients FOR SELECT USING (true);
CREATE POLICY "Allow manage clients" ON clients FOR ALL USING (true);

CREATE POLICY "Allow read products" ON products FOR SELECT USING (true);
CREATE POLICY "Allow manage products" ON products FOR ALL USING (true);

CREATE POLICY "Allow read sequences" ON document_sequences FOR SELECT USING (true);
CREATE POLICY "Allow manage sequences" ON document_sequences FOR ALL USING (true);

CREATE POLICY "Allow read documents" ON documents FOR SELECT USING (true);
CREATE POLICY "Allow manage documents" ON documents FOR ALL USING (true);

CREATE POLICY "Allow read items" ON document_items FOR SELECT USING (true);
CREATE POLICY "Allow manage items" ON document_items FOR ALL USING (true);

CREATE POLICY "Allow read payments" ON payments FOR SELECT USING (true);
CREATE POLICY "Allow manage payments" ON payments FOR ALL USING (true);

CREATE POLICY "Allow read files" ON document_files FOR SELECT USING (true);
CREATE POLICY "Allow manage files" ON document_files FOR ALL USING (true);

CREATE POLICY "Allow read events" ON document_events FOR SELECT USING (true);
CREATE POLICY "Allow manage events" ON document_events FOR ALL USING (true);

-- SEED INITIAL COMPANY
INSERT INTO companies (
    id, name, legal_name, subtitle, address_line1, address_line2, city, country, phone, email, website, matricule_fiscal, registre_commerce, identifiant_unique, rib, bank_name
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'ACCESS ENERGY',
    'ACCESS ENERGY SARL',
    'ÉNERGIE SOLAIRE • PV BT • POMPAGE • MT',
    'AV FARHAD HACHET - BIR MCHARGUA - ZAGHOUAN',
    'RUE SIDI BOUCHOUCHA - MANOUBA',
    'Bir Mchargua - Zaghouan',
    'Tunisie',
    '28 057 771 / 29256084',
    'solution.accessenergy@gmail.com',
    'www.access-energy.tn',
    '1954656YAM000',
    '1954656YAM000',
    '1954656YAM000',
    '08 014 0001234567890 42 (BIAT Bir Mchargua)',
    'BIAT'
) ON CONFLICT (id) DO NOTHING;

-- SEED CLIENT (M. Riadh Zaabi)
INSERT INTO clients (
    id, name, nom, client_type, phone, telephone, address, adresse, city, governorate, postal_code, email, cin, cin_matricule_fiscale, reference_client, notes
) VALUES (
    '10000000-0000-0000-0000-000000000001',
    'Riadh Zaabi',
    'Riadh Zaabi',
    'particulier',
    '98 566 425',
    '98 566 425',
    'Rue Kowait, Radès',
    'Rue Kowait, Radès',
    'Radès',
    'Ben Arous',
    '2040',
    'zaabiriadh@yahoo.fr',
    '264788420',
    '264788420',
    '',
    'Générateur photovoltaïque raccordé au réseau STEG de puissance 2.46Kwc.'
) ON CONFLICT (id) DO NOTHING;

-- SEED APPROVED REFERENCE PRODUCTS
INSERT INTO products (id, reference, name, designation, description, category, unit, default_unit_price_ht, purchase_price_ht, default_vat_rate, tva, stock, active)
VALUES
    ('20000000-0000-0000-0000-000000000001', 'INV-SG-2K', 'Onduleur Sungrow 2k', 'Onduleur Sungrow 2k', 'Onduleur réseau monophasé haute performance', 'Onduleurs', 'Pièce', 1600.000, 1200.000, 7.00, 7.00, 20, TRUE),
    ('20000000-0000-0000-0000-000000000002', 'PV-LONGI-615', 'Panneaux Longi 615wc', 'Panneaux Longi 615wc', 'Module photovoltaïque monocristallin haute efficacité 615Wc', 'Panneaux Solaires', 'Pièce', 544.000, 410.000, 19.00, 19.00, 80, TRUE),
    ('20000000-0000-0000-0000-000000000003', 'STR-ALU', 'Structure aluminium', 'Structure aluminium', 'Structure de fixation en profilé aluminium anodisé', 'Structures', 'Pièce', 900.000, 650.000, 19.00, 19.00, 35, TRUE),
    ('20000000-0000-0000-0000-000000000004', 'COF-AC', 'Coffret AC', 'Coffret AC', 'Coffret de protection alternatif avec disjoncteur différentiel et parafoudre', 'Coffrets', 'Pièce', 200.000, 140.000, 19.00, 19.00, 40, TRUE),
    ('20000000-0000-0000-0000-000000000005', 'COF-DC', 'Coffret DC', 'Coffret DC', 'Coffret de protection continu avec sectionneur et parafoudre 1000V', 'Coffrets', 'Pièce', 200.000, 140.000, 19.00, 19.00, 40, TRUE),
    ('20000000-0000-0000-0000-000000000006', 'SRV-INST', 'Frais d''installation, étude et transport', 'Frais d''installation, étude et transport', 'Étude technique d''ingénierie, pose certifiée, câblage, transport et raccordement STEG', 'Services & Pose', 'Forfait', 400.000, 200.000, 19.00, 19.00, 999, TRUE)
ON CONFLICT (id) DO NOTHING;

-- SEED APPROVED REFERENCE DEVIS (Devis-000100)
INSERT INTO documents (
    id, type, number, date, validity_date, client_id, client_snapshot, description, status, has_remise,
    payment_mode, payment_method, payment_reference, payment_date, subtotal_ht, total_remise, vat_7, vat_19, total_ttc,
    amount_in_words, arrete_somme, notes
) VALUES (
    '30000000-0000-0000-0000-000000000001',
    'devis',
    'Devis-000100',
    '2026-09-07',
    '2026-10-07',
    '10000000-0000-0000-0000-000000000001',
    '{
        "name": "Riadh Zaabi",
        "nom": "Riadh Zaabi",
        "phone": "98 566 425",
        "telephone": "98 566 425",
        "address": "Rue Kowait, Radès",
        "adresse": "Rue Kowait, Radès",
        "city": "Radès",
        "email": "zaabiriadh@yahoo.fr",
        "cin": "264788420",
        "cin_matricule_fiscale": "264788420",
        "reference_client": ""
    }'::jsonb,
    'Générateur photovoltaïque raccordé au réseau STEG de puissance 2.46Kwc.',
    'accepte',
    FALSE,
    'Comptant',
    'especes',
    'COMPTANT-001',
    '2026-09-07',
    5476.000,
    0.000,
    112.000,
    736.440,
    6324.440,
    'Arrêté le présent devis à la somme de : Six mille trois cent vingt-quatre dinars et quatre cent quarante millimes',
    'Arrêté le présent devis à la somme de : Six mille trois cent vingt-quatre dinars et quatre cent quarante millimes',
    'Installation photovoltaïque raccordée au réseau STEG - Puissance 2.46 Kwc.'
) ON CONFLICT (id) DO NOTHING;

-- SEED ITEMS FOR Devis-000100
INSERT INTO document_items (id, document_id, product_id, reference, designation, quantity, unit, unit_price_ht, remise, discount_percent, vat_rate, total_ht, total_ttc, sort_order)
VALUES
    ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'INV-SG-2K', 'Onduleur Sungrow 2k', 1, 'Pièce', 1600.000, 0, 0, 7.00, 1600.000, 1712.000, 1),
    ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'PV-LONGI-615', 'Panneaux Longi 615wc', 4, 'Pièce', 544.000, 0, 0, 19.00, 2176.000, 2589.440, 2),
    ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'STR-ALU', 'Structure aluminium', 1, 'Pièce', 900.000, 0, 0, 19.00, 900.000, 1071.000, 3),
    ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', 'COF-AC', 'Coffret AC', 1, 'Pièce', 200.000, 0, 0, 19.00, 200.000, 238.000, 4),
    ('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', 'COF-DC', 'Coffret DC', 1, 'Pièce', 200.000, 0, 0, 19.00, 200.000, 238.000, 5),
    ('40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000006', 'SRV-INST', 'Frais d''installation, étude et transport', 1, 'Forfait', 400.000, 0, 0, 19.00, 400.000, 476.000, 6)
ON CONFLICT (id) DO NOTHING;

-- UPDATE SEQUENCE NEXT VALUE TO 101
UPDATE document_sequences SET next_number = 101 WHERE document_type = 'devis';

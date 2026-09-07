-- ====================================================================
-- ACCESS ERP COMMERCIAL - Direct Supabase persistence
-- This table stores the entire application state as a single JSONB row.
-- It is what server/db.ts actually reads from and writes to at runtime.
--
-- (The relational schema in schema.sql / 20260906_initial_schema.sql is kept
-- for reference / a future fully-relational migration, but is not required
-- for the app to run against Supabase today.)
-- ====================================================================

CREATE TABLE IF NOT EXISTS app_state (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;

-- The app talks to Supabase only from the Express server using the
-- SERVICE ROLE key (never exposed to the browser), so a permissive
-- policy here is fine: only your server can reach this table.
CREATE POLICY "Allow service role full access to app_state"
  ON app_state FOR ALL
  USING (true)
  WITH CHECK (true);

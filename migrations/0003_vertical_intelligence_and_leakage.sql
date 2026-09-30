-- Lead Machine vertical intelligence + hot lead leakage alerts.
-- Vertical packs are derived from the org industry; no extra pack column is required.
-- Leakage alerts are claimed once per lead and may be delivered via WhatsApp and/or SMS.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS hot_lead_alerted_at timestamptz;

CREATE INDEX IF NOT EXISTS leads_hot_leakage_idx
  ON leads(org_id, ai_temperature, status, created_at);

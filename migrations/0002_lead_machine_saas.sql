-- Lead Machine SaaS completion migration
-- Apply to the production Neon/Postgres database before enabling the new workflows.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS whatsapp_account_id varchar(120);

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS opted_out_at timestamptz;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS provider varchar(30) NOT NULL DEFAULT 'payfast';

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS provider_payment_id varchar(120);

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS provider_token varchar(160);

CREATE TABLE IF NOT EXISTS follow_up_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  channel varchar(20) NOT NULL DEFAULT 'whatsapp',
  message text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS follow_up_jobs_org_scheduled_idx
  ON follow_up_jobs(org_id, scheduled_at);

CREATE INDEX IF NOT EXISTS follow_up_jobs_status_scheduled_idx
  ON follow_up_jobs(status, scheduled_at);

CREATE INDEX IF NOT EXISTS follow_up_jobs_lead_id_idx
  ON follow_up_jobs(lead_id);

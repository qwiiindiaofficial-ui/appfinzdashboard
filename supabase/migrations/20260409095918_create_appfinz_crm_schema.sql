/*
  # AppFinz CRM - Complete Database Schema

  ## Overview
  Full CRM schema for AppFinz IT company including:
  - Lead management with pipeline stages and activity timeline
  - Client management with portal access
  - Project tracking with updates feed
  - Invoice builder with line items
  - Tasks system (linked to leads/clients/projects)
  - Client requests inbox from portal submissions
  - Communications log
  - Client portal token system for shared access links

  ## Tables Created
  1. profiles - CRM team members (linked to auth.users)
  2. leads - Lead pipeline with full contact and status data
  3. lead_activities - Immutable activity timeline per lead
  4. clients - Converted leads and manually added clients
  5. client_portal_tokens - Token-based portal URL generation
  6. projects - Services/projects per client
  7. project_updates - Milestone/progress posts per project
  8. invoices - Invoice headers
  9. invoice_items - Line items per invoice
  10. tasks - Internal tasks linked to leads/clients/projects
  11. client_requests - Portal submissions from clients
  12. communications - Log of all client communications

  ## Security
  - RLS enabled on all tables
  - Authenticated users can access all CRM data (internal tool)
  - Anon users can only access portal-safe public data
  - Portal tokens, visible project updates, invoices, and client_requests insert are anon-accessible
*/

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff')),
  avatar_url text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all profiles"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- LEADS
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  company_name text,
  email text,
  phone text,
  website text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','proposal_sent','negotiation','won','lost')),
  source text NOT NULL DEFAULT 'other' CHECK (source IN ('website','referral','linkedin','cold_call','email_campaign','social_media','event','other')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  industry text,
  estimated_value numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  expected_close date,
  lost_reason text,
  tags text[] NOT NULL DEFAULT '{}',
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  converted_at timestamptz,
  converted_to_client_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all leads"
  ON leads FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert leads"
  ON leads FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update leads"
  ON leads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete leads"
  ON leads FOR DELETE TO authenticated USING (true);

-- ============================================================
-- LEAD ACTIVITIES
-- ============================================================
CREATE TABLE IF NOT EXISTS lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  activity_type text NOT NULL DEFAULT 'note' CHECK (activity_type IN ('note','call','email','meeting','status_change','task','other')),
  title text,
  content text NOT NULL DEFAULT '',
  old_status text,
  new_status text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all lead activities"
  ON lead_activities FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert lead activities"
  ON lead_activities FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete lead activities"
  ON lead_activities FOR DELETE TO authenticated USING (true);

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  website text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  country text NOT NULL DEFAULT 'India',
  postal_code text,
  industry text,
  company_size text CHECK (company_size IN ('1-10','11-50','51-200','201-500','500+')),
  annual_revenue numeric,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','churned')),
  account_manager uuid REFERENCES profiles(id) ON DELETE SET NULL,
  tags text[] NOT NULL DEFAULT '{}',
  notes text,
  portal_enabled boolean NOT NULL DEFAULT false,
  source_lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all clients"
  ON clients FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert clients"
  ON clients FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update clients"
  ON clients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete clients"
  ON clients FOR DELETE TO authenticated USING (true);

-- ============================================================
-- CLIENT PORTAL TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS client_portal_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  label text,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  last_accessed timestamptz,
  access_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE client_portal_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all portal tokens"
  ON client_portal_tokens FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert portal tokens"
  ON client_portal_tokens FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update portal tokens"
  ON client_portal_tokens FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete portal tokens"
  ON client_portal_tokens FOR DELETE TO authenticated USING (true);

CREATE POLICY "Anon users can read active portal tokens"
  ON client_portal_tokens FOR SELECT TO anon
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  project_type text NOT NULL DEFAULT 'development' CHECK (project_type IN ('development','design','consulting','maintenance','seo','marketing','other')),
  status text NOT NULL DEFAULT 'planning' CHECK (status IN ('planning','in_progress','on_hold','review','completed','cancelled')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  start_date date,
  end_date date,
  actual_end_date date,
  budget numeric,
  spent numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  progress_pct integer NOT NULL DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  project_manager uuid REFERENCES profiles(id) ON DELETE SET NULL,
  team_members uuid[] NOT NULL DEFAULT '{}',
  visible_on_portal boolean NOT NULL DEFAULT true,
  tags text[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all projects"
  ON projects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert projects"
  ON projects FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update projects"
  ON projects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete projects"
  ON projects FOR DELETE TO authenticated USING (true);

-- ============================================================
-- PROJECT UPDATES
-- ============================================================
CREATE TABLE IF NOT EXISTS project_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  update_type text NOT NULL DEFAULT 'progress' CHECK (update_type IN ('progress','milestone','blocker','design','delivery','note')),
  title text NOT NULL,
  body text,
  attachments jsonb NOT NULL DEFAULT '[]',
  progress_snapshot integer CHECK (progress_snapshot >= 0 AND progress_snapshot <= 100),
  is_client_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE project_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all project updates"
  ON project_updates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert project updates"
  ON project_updates FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update project updates"
  ON project_updates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete project updates"
  ON project_updates FOR DELETE TO authenticated USING (true);

CREATE POLICY "Anon users can read client-visible project updates"
  ON project_updates FOR SELECT TO anon
  USING (is_client_visible = true);

-- ============================================================
-- INVOICES
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  invoice_number text NOT NULL UNIQUE,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  discount_type text NOT NULL DEFAULT 'none' CHECK (discount_type IN ('none','percentage','fixed')),
  discount_value numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  amount_paid numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','viewed','partially_paid','paid','overdue','cancelled','refunded')),
  notes text,
  terms text,
  footer_text text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all invoices"
  ON invoices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert invoices"
  ON invoices FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update invoices"
  ON invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete invoices"
  ON invoices FOR DELETE TO authenticated USING (true);

CREATE POLICY "Anon users can read invoices for portal"
  ON invoices FOR SELECT TO anon USING (true);

-- ============================================================
-- INVOICE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'item',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all invoice items"
  ON invoice_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert invoice items"
  ON invoice_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update invoice items"
  ON invoice_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete invoice items"
  ON invoice_items FOR DELETE TO authenticated USING (true);

CREATE POLICY "Anon users can read invoice items for portal"
  ON invoice_items FOR SELECT TO anon USING (true);

-- ============================================================
-- TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  task_type text NOT NULL DEFAULT 'follow_up' CHECK (task_type IN ('follow_up','call','email','meeting','demo','proposal','review','other')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled','deferred')),
  due_date timestamptz,
  reminder_at timestamptz,
  completed_at timestamptz,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all tasks"
  ON tasks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert tasks"
  ON tasks FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update tasks"
  ON tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tasks"
  ON tasks FOR DELETE TO authenticated USING (true);

-- ============================================================
-- CLIENT REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS client_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  portal_token_id uuid REFERENCES client_portal_tokens(id) ON DELETE SET NULL,
  request_type text NOT NULL DEFAULT 'general' CHECK (request_type IN ('general','change_request','bug_report','content_update','question','approval','other')),
  subject text NOT NULL,
  body text NOT NULL DEFAULT '',
  attachments jsonb NOT NULL DEFAULT '[]',
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_review','in_progress','resolved','closed')),
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  resolution_note text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE client_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all client requests"
  ON client_requests FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert client requests"
  ON client_requests FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update client requests"
  ON client_requests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete client requests"
  ON client_requests FOR DELETE TO authenticated USING (true);

CREATE POLICY "Anon users can insert client requests via portal"
  ON client_requests FOR INSERT TO anon WITH CHECK (true);

-- ============================================================
-- COMMUNICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email','phone','meeting','whatsapp','slack','portal','other')),
  direction text NOT NULL DEFAULT 'outbound' CHECK (direction IN ('inbound','outbound')),
  subject text,
  body text NOT NULL DEFAULT '',
  attachments jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all communications"
  ON communications FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert communications"
  ON communications FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete communications"
  ON communications FOR DELETE TO authenticated USING (true);

-- ============================================================
-- TRIGGERS: updated_at auto-update
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['profiles','leads','clients','projects','invoices','tasks','client_requests']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'set_updated_at_' || tbl
    ) THEN
      EXECUTE format('CREATE TRIGGER set_updated_at_%I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', tbl, tbl);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- TRIGGER: auto-create profile on new auth user
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_new_user();
  END IF;
END $$;

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_project_updates_project_id ON project_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_lead_id ON tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_client_requests_client_id ON client_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_client_requests_status ON client_requests(status);
CREATE INDEX IF NOT EXISTS idx_portal_tokens_token ON client_portal_tokens(token);

/*
  # Add anonymous read policies for client portal

  ## Problem
  The client portal is a public page accessed via a token link — no login required.
  On devices where the user is not logged in, Supabase blocks reads on `clients` and
  `projects` tables because there are no anon SELECT policies for those tables.
  This causes "cannot read properties of null (reading 'company_name')" errors.

  ## Changes
  1. `clients` — Add anon SELECT policy so portal token resolution can join client data
  2. `projects` — Add anon SELECT policy so portal can read visible_on_portal projects

  ## Security
  - Clients: anon can only read rows that have an active portal token (via subquery)
  - Projects: anon can only read projects where visible_on_portal = true
*/

-- Allow anon to read clients that have an active portal token
CREATE POLICY "Anon can read clients with active portal token"
  ON clients
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM client_portal_tokens
      WHERE client_portal_tokens.client_id = clients.id
        AND client_portal_tokens.is_active = true
    )
  );

-- Allow anon to read projects that are marked visible on portal
CREATE POLICY "Anon can read portal-visible projects"
  ON projects
  FOR SELECT
  TO anon
  USING (visible_on_portal = true);

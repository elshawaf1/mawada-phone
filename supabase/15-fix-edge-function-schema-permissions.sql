-- ============================================
-- 15-fix-edge-function-schema-permissions.sql
-- Fixes: "permission denied for schema public"
-- when Edge Functions (service_role) try to
-- access tables in the public schema.
--
-- Edge functions use SUPABASE_SERVICE_ROLE_KEY
-- which maps to service_role. This role needs
-- explicit USAGE on the schema and ALL on tables.
-- ============================================

-- Grant schema access to service_role (Edge Functions)
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Also ensure future tables get granted automatically
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;

-- Ensure authenticated role has schema access too (mobile app)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;

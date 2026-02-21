-- ═══════════════════════════════════════════════════════════
-- SALDOBIRRAS PRO — Migration 003: User Permissions
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Add permissions column as JSONB (flexible, no schema change needed for new perms)
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Set owner permissions (all access)
UPDATE users SET permissions = '{
  "dashboard": true,
  "register": true,
  "recharge": true,
  "consume": true,
  "transactions": true,
  "stats": true,
  "export": true,
  "edit_customer": true,
  "send_email": true,
  "manage_users": true
}'::jsonb WHERE role = 'owner';

-- Create helper function to check permissions
CREATE OR REPLACE FUNCTION check_permission(p_user_id UUID, p_permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_role user_role;
  v_perms JSONB;
BEGIN
  SELECT role, permissions INTO v_role, v_perms FROM users WHERE id = p_user_id;
  -- Owner always has all permissions
  IF v_role = 'owner' THEN RETURN true; END IF;
  -- Check specific permission
  RETURN COALESCE((v_perms->>p_permission)::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Migration 003 complete: permissions added' AS status;

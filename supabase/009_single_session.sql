-- 009: Single session enforcement
-- Each non-owner user can only be logged in on one device at a time.
-- When logging in from a new device, the previous session is invalidated.

ALTER TABLE users ADD COLUMN IF NOT EXISTS active_session_id TEXT;

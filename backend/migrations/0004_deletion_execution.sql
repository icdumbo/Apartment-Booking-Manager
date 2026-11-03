-- No automatic activation. Existing authenticated intake remains unchanged.
CREATE TABLE deletion_execution (
 subject TEXT PRIMARY KEY NOT NULL,
 lease TEXT NOT NULL,
 lease_until INTEGER NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('processing','retry','blocked')),
 reason TEXT CHECK(reason IN ('purchase_recovery','trial_policy','owner_configuration','identity_changed','backend_failure')),
 updated_at INTEGER NOT NULL
);
-- Completion evidence deliberately excludes UID, email, token and provider identity.
CREATE TABLE deletion_receipts (
 request_id TEXT PRIMARY KEY NOT NULL,
 completed_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL CHECK(expires_at>completed_at)
);

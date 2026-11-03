-- Approved: repeat trials may occur after retention expiry or Firebase recreation.
-- Deployment flags still default OFF. No extra identity or usage marker is stored.
DROP TRIGGER trial_retention_admission;
-- enrollment_locked is retained only for migration compatibility, no longer read
-- by an admission trigger. The application still requires NEW_TRIALS_ENABLED=true,
-- verified Firebase authentication and explicit 15-day trial consent.

DROP TRIGGER trials_retained;
CREATE TRIGGER trials_retained BEFORE DELETE ON trials
WHEN NOT EXISTS(SELECT 1 FROM trial_retention WHERE subject=OLD.subject
 AND retention_until<=CAST(strftime('%s','now') AS INTEGER)*1000)
 AND NOT EXISTS(SELECT 1 FROM deletion_execution e
 JOIN account_deletion_requests r ON r.subject=e.subject
 WHERE e.subject=OLD.subject AND e.state='processing')
BEGIN SELECT RAISE(ABORT,'Trial deletion requires expiry or authenticated account deletion processing'); END;

CREATE INDEX deletion_receipts_due ON deletion_receipts(expires_at,request_id);
CREATE INDEX deletion_requests_created ON account_deletion_requests(created_at,subject);

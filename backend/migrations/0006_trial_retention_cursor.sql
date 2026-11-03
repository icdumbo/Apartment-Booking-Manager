-- Prepared only. Minimize housekeeping data, without changing admission or rights.
ALTER TABLE trial_retention_control ADD COLUMN backfill_complete INTEGER NOT NULL DEFAULT 0 CHECK(backfill_complete IN (0,1));

-- Older completed backfills may retain the final Firebase UID as their cursor.
-- Clear it without touching trial rows, licenses, purchases or OWNER configuration.
UPDATE trial_retention_control SET backfill_complete=1,backfill_after=''
WHERE singleton=1 AND NOT EXISTS(SELECT 1 FROM trials WHERE subject>backfill_after);

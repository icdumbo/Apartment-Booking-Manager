-- Prepared only: apply remotely only after review. Never touches licenses/purchases.
-- Non-identifying admission fence: purging history must not make a UID eligible again.
CREATE TABLE trial_retention_control (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1),
 enrollment_locked INTEGER NOT NULL CHECK(enrollment_locked=1),
 backfill_after TEXT NOT NULL DEFAULT ''
);
INSERT INTO trial_retention_control(singleton,enrollment_locked) VALUES (1,1);

CREATE TABLE trial_retention (
 subject TEXT PRIMARY KEY NOT NULL,
 retention_until INTEGER NOT NULL CHECK(retention_until>=0)
);
CREATE INDEX trial_retention_due ON trial_retention(retention_until,subject);

-- UTC, original time/milliseconds preserved; clamp to the target month's last day.
-- Six calendar months FROM START, not 180 days or six months after expiry.
-- Undated blocked rows and dates outside SQLite's verifiable range expire at zero.
CREATE VIEW trial_retention_source AS
SELECT subject, COALESCE(CASE WHEN status='used' THEN
 CAST(strftime('%s',started_at/1000,'unixepoch','start of month','+6 months') AS INTEGER)*1000
 +(MIN(CAST(strftime('%d',started_at/1000,'unixepoch') AS INTEGER),
        CAST(strftime('%d',started_at/1000,'unixepoch','start of month','+7 months','-1 day') AS INTEGER))-1)*86400000
 +(started_at%86400000)
 END,0) AS retention_until FROM trials;

CREATE TRIGGER trial_retention_insert AFTER INSERT ON trials
BEGIN
 INSERT INTO trial_retention(subject,retention_until)
 SELECT subject,retention_until FROM trial_retention_source WHERE subject=NEW.subject;
END;

CREATE TRIGGER trial_retention_no_extension BEFORE UPDATE ON trial_retention
BEGIN SELECT RAISE(ABORT,'Trial retention deadlines are immutable'); END;

CREATE TRIGGER trial_retention_admission BEFORE INSERT ON trials
WHEN NEW.status='used' AND NOT EXISTS(SELECT 1 FROM trials WHERE subject=NEW.subject)
 AND COALESCE((SELECT enrollment_locked FROM trial_retention_control WHERE singleton=1),1)=1
BEGIN SELECT RAISE(ABORT,'New trial admission requires a separately approved anti-abuse policy'); END;

DROP TRIGGER trials_retained;
CREATE TRIGGER trials_retained BEFORE DELETE ON trials
WHEN NOT EXISTS(SELECT 1 FROM trial_retention WHERE subject=OLD.subject
 AND retention_until<=CAST(strftime('%s','now') AS INTEGER)*1000)
BEGIN SELECT RAISE(ABORT,'Cannot delete an unexpired or unclassified trial'); END;

CREATE TRIGGER trial_retention_delete AFTER DELETE ON trials
BEGIN DELETE FROM trial_retention WHERE subject=OLD.subject; END;

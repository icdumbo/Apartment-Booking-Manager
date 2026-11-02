-- Intake journal only. No existing account, trial, license or purchase is changed.
CREATE TABLE account_deletion_requests (
 subject TEXT PRIMARY KEY NOT NULL CHECK(length(subject) BETWEEN 1 AND 128),
 request_id TEXT UNIQUE NOT NULL,
 status TEXT NOT NULL CHECK(status='pending_review'),
 created_at INTEGER NOT NULL CHECK(typeof(created_at)='integer' AND created_at>=0),
 language TEXT NOT NULL CHECK(language IN ('ro','en'))
);

-- Entitlements only: never store apartments, guests, bookings or photos here.
-- Tokens are AES-256-GCM encrypted with a separate server secret; hashes prevent reuse.
CREATE TABLE play_purchases (
 token_hash TEXT PRIMARY KEY NOT NULL CHECK(length(token_hash)=64),
 subject TEXT NOT NULL CHECK(length(subject) BETWEEN 1 AND 128),
 product_id TEXT NOT NULL,
 encrypted_token TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('pending','active','revoked')),
 verified_at INTEGER NOT NULL DEFAULT 0 CHECK(verified_at>=0)
);
CREATE INDEX play_purchases_subject ON play_purchases(subject);
CREATE TRIGGER play_purchase_owner_immutable BEFORE UPDATE OF token_hash,subject,product_id ON play_purchases
BEGIN SELECT RAISE(ABORT,'Purchase ownership cannot be reassigned'); END;

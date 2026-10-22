# BASIC / PREMIUM and server-backed trial

## Actual status

The optional Android Google/Firebase bridge and centralized access policy are reused. New installations no longer start a local trial automatically. BASIC remains free, offline and anonymous. An explicit RO/EN confirmation explains the 15-day duration, no card, Google/internet requirement, fallback to BASIC, data retention and reboot limitation before requesting activation.

The Cloudflare Worker HTTPS endpoint, atomic D1 trial repository, RSA-signed proofs and native Android verifier/cache are implemented in source. **They are not deployed or live-verified. Firebase Authentication remains on Spark; no Blaze service is used.** `LICENSE_ENDPOINT` is null and the pinned public key is empty. Secure activation fails clearly until both are configured. No real purchase, Billing SDK or APK is introduced. Android remains 1.0.10/versionCode 11 and the existing signing configuration is unchanged.

## Access decisions and data preservation

`src/access.js` remains the policy boundary. BASIC manages the first three stored apartments; all others and their reservations remain visible read-only. Adding over the limit and editing overflow reservations are blocked at writes. Deleting an active apartment makes the next stored apartment manageable. TRIAL/PREMIUM permits unlimited apartments and the existing advanced modules. Payment history and report/statistics data are never removed on expiry. Business storage/schema and Excel/PDF generators are unchanged.

`src/secure-access.js` uses the native `BookingAccess` verifier. It never interprets editable local JSON as a license. Rights distinguish BASIC, SERVER_TRIAL, GOOGLE_PLAY_PURCHASE, OWNER_GRANT and ADMIN_GIFT; only the server determines source. Login alone grants nothing. Paid/owner permanent proofs have no time limit offline, while temporary gifts are bounded by their expiry. Ads are still planned for all tiers; none are implemented.

## Server and proof contract

See [secure-access-setup.md](secure-access-setup.md) for deployment prerequisites. `backend/index.js` is a Cloudflare Worker wrapping the existing `createLicenseHandler`. JOSE verifies the Firebase RS256 signature and claims against cached Google certificates; Firebase Auth REST checks the account and revocation timestamp, and D1 applies server-controlled blocks. No Firebase Admin/Functions dependency remains. Dependency outages return 503 instead of a false authentication revocation. `/access` accepts POST JSON with `action: verify | startTrial`, a native-generated nonce, and `terms: trial-15d-v1` for activation. No client UID, owner flag, date or privilege is accepted.

`backend/trial-handler.js` creates one immutable `trials` record per authenticated Firebase UID in an atomic D1 batch with a unique subject constraint. It uses server time; expiry is exactly activation + 15 × 24 hours. Concurrent requests/retries, clearing client storage and reinstalls cannot renew that server record, even after expiry. Verification never creates a trial. New enrolment defaults to disabled for controlled migration. Do not delete trial tombstones or enable TTL: deletion would permit another trial. This is per Firebase account, not proof that a person owns no other accounts; deleting/recreating the Firebase identity requires an administrative retention/abuse policy.

The sole owner UID is read from encrypted Worker secret configuration. Purchases/gifts are read only from server-owned records. There is no issuer/writer for purchases or gifts here and no Billing implementation. No family relationship grants access.

Proofs contain version, issuer/project, audience/package, authenticated subject, state/source, server issue/start/expiry times and the fresh request nonce. The server signs with RSA-SHA256, RSA 3072+; the client pins only the public SPKI key. No private signing key belongs in source/client configuration. A nonce prevents replaying an old online response as a fresh time anchor.

## Offline and clock policy

`BookingAccessPlugin` verifies the signature and all bindings against the native Firebase session. The signed proof and its elapsed-realtime/boot anchor are encrypted and authenticated together with AES-GCM using a non-exportable Android Keystore key. Neither a JavaScript clock nor an edited preference can supply a trusted anchor. This device-local symmetric key is separate from, and does not change, the APK signing certificate. Cache tampering/key loss fails to BASIC without touching business data.

During the same phone boot, Android `elapsedRealtime()` includes sleep and does not follow wall-clock changes. The anchor is captured before the network request, so transport delay can shorten the remaining trial conservatively, never extend it. The bridge uses monotonic elapsed time for its in-process countdown and discards that snapshot when the app is hidden; resume re-reads native evidence. A process restart in the same boot can restore the encrypted anchor. Expiry returns BASIC with all data intact.

**After a phone reboot, or if boot identity is unavailable, a temporary right requires online time revalidation.** There is no wall-clock fallback. This is a deliberate conservative limitation: uninterrupted offline trial use across reboots with an arbitrary editable wall clock cannot be guaranteed by this implementation. It is not perfect protection against a rooted/modified OS, replaced application or privileged replay of whole device state. Test on real Android before describing the full flow as verified.

Permanent purchased/owner rights remain usable offline after initial signed verification, including restart/reboot, while the same Firebase session and decryptable cache exist. They are rechecked on sign-in/token events, resume, reconnect and periodically when online. Temporary network failure retains the last valid proof; a signed BASIC response replaces it. Logout clears the cache. Changing accounts prevents using the other account's evidence. An offline permanent license cannot learn about a refund/revocation until a successful online check; indefinite offline access necessarily has that tradeoff. Reinstall/new phone needs initial online restoration; it does not restore local bookings.

## Existing trials: explicit migration boundary

Existing access-v1 and business records are retained, not reset or converted into fresh trials. Android's secure provider does not accept unsigned legacy records as proof. Until server-side reconciliation, such Android installations use BASIC and explain that the previous trial must be associated with the account. The activation control refuses to create a new trial when legacy history is present. Reconciliation must preserve an established original deadline or record the account as blocked/used, never automatically grant another 15 days.

There is no reliable way to reconstruct a past anonymous local trial after its data has already been deleted. Before enabling new server trials, reconcile known legacy accounts and choose a cutover policy. The server's default-disabled enrolment prevents accidental blanket issuance. The client check is conservative UX, not the security boundary: server-owned records/eligibility must enforce decisions.

The old local service contract is retained for legacy browser previews and regression fixtures; these unsigned browser trials remain **unsecured** and are not the Android activation route. No new automatic local trial is started in browser or Android. Secure trial activation currently requires the Android native verifier.

## Verification and remaining work

Tests cover authenticated consent, exact server expiry, retries/concurrency, account separation, permanent owner rights, blocked/malformed legacy records, signature tampering, offline fallback, preservation of business data and account-change races. Unit tests use fictional identities and ephemeral RSA fixture keys (never deployment credentials). Firebase/Firestore-style regression mocks do not establish emulator/production correctness. The earlier Java compilation and clock tests remain valid because Android is unchanged. Backend CI now bundles the Worker without deployment and runs real local Workers/D1 checks plus the relevant contract tests. Actual device signature/cache/auth lifecycle and deployed Firebase-auth/Cloudflare D1 integration tests remain mandatory after setup.

Missing configuration: a free Cloudflare account, D1 binding/schema, Firebase Auth REST API configuration, server-only owner setting and signing secret, actual deployment URL, pinned public key, legacy cutover policy and restricted integration testing. No infrastructure has been provisioned; no billing account, card or paid Cloudflare plan is required for this architecture within free quotas. See the setup guide for CPU/quota and deployment limitations. Billing, purchase restoration, acknowledgement, refunds/RTDN and purchase-to-account linking remain a separate authorized stage.

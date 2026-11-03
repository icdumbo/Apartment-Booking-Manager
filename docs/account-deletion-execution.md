# Account deletion processor — NOT activated or production-verified

> Current approved policy and activation instructions: [backend-android-test.md](backend-android-test.md). Migration 0007 supersedes the historical permanent anti-abuse/admission lock and trial-based deletion blocker described below. No production activation has occurred.


The authenticated intake remains `/account-deletion`. Only a recently authenticated
Google/Firebase identity (five minutes) with explicit consent can create its own
request; a client cannot nominate a UID. A scheduled server-side handler processes
only these existing requests. There is no public execution/admin HTTP route.

## Deliberate blockers

- Any purchase row, including revoked/pending purchases, or purchase-backed license
  blocks execution. Firebase and purchase evidence remain intact. Safe recovery
  across a deleted/recreated Firebase UID is not implemented; Billing is unchanged.
- Any trial or identity-policy row blocks execution. Existing immutable history
  is not purged or reset. A stable anti-abuse identity and an approved retention
  procedure are still required. Permanent prevention of repeat trials is NOT
  guaranteed by retaining a former Firebase UID.
- OWNER requires separate removal of its server configuration; the processor
  does not alter OWNER configuration or delete its Firebase identity.
- An identity created after the original request, or an unexpected provider,
  blocks execution. These cases require administrative review, not auto-retry.

Thus execution is currently limited to accounts without these blockers. This is
not a complete production account-deletion service for all users.

## Processing, recovery and evidence

Migration `0004_deletion_execution.sql` adds processing leases and completion
receipts; the existing intake schema and commercial tables are unchanged.
Only one worker claims a request for five minutes. Failures retain the request
and a fixed error category, never raw exceptions, emails, tokens or credentials.
Expired leases can be retried. Firebase lookup checks the UID, Google provider and
creation time. After deletion a second lookup must confirm absence. An ambiguous
network failure is retried; absence on retry is safe and idempotent.

D1 cleanup and a receipt commit atomically, guarded by the processing lease and
rechecking trial/identity/purchase blockers. It removes the account's non-purchase
licenses, request and execution state. It never deletes Google Play rights,
purchase rows or trial history. Completion receipts hold only a random request
reference, completion and expiry times; they expire by the approved configured TTL.
UID-containing failed jobs remain pending until resolved: no finite retention for
these jobs has been approved. Do not publish a retention promise for them.

There is no distributed transaction across Firebase and D1: a Firebase deletion
can succeed before D1 cleanup fails. The processor does NOT count completion then;
it retries cleanup. There is deliberately no client `deleted:true` response or
public completion lookup. Production verification must include interruption at
each boundary and administrative handling of blocked/retry jobs.

No local-storage/photo/booking/payment API is called. Local data stays on the
device under BASIC limits; it is not uploaded or erased by this processor. On the
real device verify Firebase session invalidation, signed access-cache clearing,
and BASIC access after server deletion/restart, including offline transitions.
Do not claim this physical-device behavior verified from mock tests alone.

## Required external configuration — approval required, nothing deployed here

1. Resolve controller/retention/legal details and keep publication/intake disabled
   until approved. Decide separately how to resolve the blockers above.
2. Verify a staging Firebase project/controlled test account and D1 migrations.
   This adapter is bound to the existing project's constant; do not point it at a
   different project by passing arbitrary request input.
3. Provide a dedicated server-only service account credential via Cloudflare secret
   `DELETION_FIREBASE_SERVICE_ACCOUNT_JSON`, with the permissions needed for Firebase
   Authentication lookup/delete in the existing project (`firebaseauth.users.get`
   and `firebaseauth.users.delete`). Use least privilege;
   never use the Play credential or commit credentials. Verify IAM/API availability.
4. Before any execution, stop administrative license writes, confirm maintenance
   isolation and keep `NEW_TRIALS_ENABLED=false` and `PLAY_PRODUCT_ID` unset.
   These gates avoid new commercial writes racing deletion; they are NOT changed
   by this implementation. Existing product-configured deployments fail closed.
5. Only after staging verification and explicit production approval set ALL of
   `DELETION_EXECUTION_ENABLED`, `DELETION_BACKEND_VERIFIED`,
   `DELETION_RETENTION_APPROVED`, `DELETION_MAINTENANCE_VERIFIED` to `true` and
   `DELETION_RECEIPT_TTL_DAYS` to an explicitly approved integer from 1 to 365.
   There is no default TTL; 30 in tests is fictional, not an approved policy.
6. Configure a scheduled trigger only after approval. None is added here. Without
   these flags, secret and trigger the processor does not run in production.
7. Test lookup/delete/confirmation, retries, D1 atomic cleanup, purchase/trial/OWNER
   blockers, local BASIC access and backups with controlled accounts. Check provider
   backup retention separately; active-store deletion is not immediate backup erasure.

The request UI and web page share explicit RO/EN warnings. Their existing legal
and backend-verification gates remain disabled. A queued request is not completion.

REST contracts verified against Google's documentation:
- https://docs.cloud.google.com/identity-platform/docs/reference/rest/v1/projects.accounts/lookup
- https://docs.cloud.google.com/identity-platform/docs/reference/rest/v1/projects.accounts/delete

Local tests: `ABM_LOCAL_SQLITE=1 node --test --test-isolation=none
backend/checks/deletion-execution.check.mjs tests/privacy.test.js` uses SQLite for
the repository SQL and simulated Firebase HTTP responses. CI omits that variable
and uses Miniflare/D1. Neither substitutes for a real, approved staging deletion.

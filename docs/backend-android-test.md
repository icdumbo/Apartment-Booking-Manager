# Backend Android test preparation — approved policy, not activated

This is the current runbook. Earlier anti-abuse/admission-lock proposals are
superseded by the owner's decision: voluntary Google-authenticated 15-day trial,
history for at most six calendar months from start, repeat possible after purge
or Firebase account recreation. No extra permanent identity, HMAC or fingerprint.
BASIC (three apartments, optional authentication), permanent one-time PREMIUM,
server-authorized OWNER and local/manual backup independence are unchanged.

## Prepared implementation

- Apply existing D1 migrations in order through `0007_approved_trial_policy.sql`.
  Do not edit or rerun an already applied migration. 0007 removes the global
  anti-abuse admission trigger; the old enrollment_locked column is inert legacy
  metadata, not an authorization decision. NEW_TRIALS_ENABLED still defaults false.
- A trial requires verified Google/Firebase authentication plus explicit consent.
  Verify/login alone never enrols. Unique UID reservation is atomic: repeat
  activation while history exists cannot extend the 15-day deadline. After
  physical purge a new voluntary trial is allowed; a new Firebase UID can also
  qualify. An outage delaying cleanup can delay that eligibility.
- Retention uses UTC calendar months, bounded batches of 25 and indexed expiry;
  the finished cursor is cleared. No Cron is configured. The account-wide Free
  budget must include index maintenance and other workloads. Run legacy backfill
  to completion before claiming the retention policy operational. Time Travel
  and administrator backups require a separate policy/early-purge margin if the
  six-month promise includes copies; no physical erasure SLA is claimed.
- Deletion intake retains recent authentication (five minutes), consent and
  server-derived UID. Actual execution remains disabled. An active trial no
  longer blocks future verified account deletion: the processor confirms Firebase
  absence before atomically removing trial/retention rows and non-purchase
  licenses. SQL permits early trial removal only for a processing authenticated
  account request. Normal premature deletion/updates remain prohibited.
- Paid accounts, OWNER and identity-security restrictions still block execution.
  The legacy `trial_policy` reason now means identity-policy review, not merely
  an existing trial. Play rights and purchase evidence are never erased.
- Future deletion processing handles at most one account and 25 expired receipts
  per invocation, using expiry/request indexes. Retention scheduling is separate:
  with TRIAL_RETENTION_ENABLED=true the scheduled handler runs retention only.
  Do not treat that Cron as an account-deletion scheduler.

## Owner actions IN ORDER — manual, after approval, never performed by this commit

1. **Confirm the environment and preserve it.** In Cloudflare inspect the existing
   Worker `apartment-booking-access`, D1 binding `DB`, database
   `apartment-booking-licenses`, plan, jurisdiction, deployed version, routes and
   secret names (not values). The public route must continue matching the Android
   `/access` endpoint. Repository `workers_dev:false` is intentional: before any
   deployment explicitly preserve/approve the existing workers.dev route or custom
   route; deploying blindly with no route can make authentication inaccessible.
   Preserve D1 backup/export and the existing server signing-key/public-pin pairing.
   Do NOT create a new Android signing key or silently rotate the access proof key.
2. **Verify Firebase Android auth.** Existing project:
   `apartment-booking-manage-2d218`. Confirm Google provider, support email, Android
   package `ro.icdapps.apartmentbookingmanager`, SHA-1/SHA-256 of the ORIGINAL app
   certificate, matching OAuth web client ID and enabled Identity Toolkit API.
   Check API-key restrictions support Android sign-in AND the Worker Auth REST
   lookup. No Firebase Functions, Firestore or Storage deployment is required.
   Do not enable Blaze solely to run this code; verify the actual project quotas.
3. **Verify existing access secrets.** `FIREBASE_API_KEY` (or the legacy alias
   `FIREBASE_WEB_API_KEY`, never conflicting values), `ACCESS_PRIVATE_KEY` matching
   the already pinned Android public key, and `OWNER_SUBJECT` set only to the
   administratively verified Firebase UID of the owner. OWNER is not selected by
   email or local data. Configure secrets through Cloudflare's secret UI or
   `npx wrangler secret put NAME` from `backend/`; never paste values in Git/chat.
4. **Validate an isolated test setup first.** Use controlled fictional test users
   and an isolated D1 test database/binding; do not load real customer records.
   The Firebase adapter is pinned to the existing project, so using another project
   requires an explicitly reviewed configuration change, not a made-up project ID.
   Inspect pending migrations in the intended environment before applying them.
   For the existing database, these are the exact Wrangler commands, to be run
   ONLY by the owner against the verified intended environment after approval:

   ```text
   npx wrangler whoami
   npx wrangler d1 migrations list apartment-booking-licenses --remote
   npx wrangler d1 migrations apply apartment-booking-licenses --remote
   ```

   The last command changes remote data: do not run it as an audit command or
   against production before isolated testing and a reviewed backup. For a test
   database substitute its real configured name; never invent/reuse a production
   ID in a second environment. Review the irreversible legacy-history cleanup.
5. **Deploy to the reviewed test binding with all activation switches false.**
   Preserve existing routes/secrets/bindings; use `npx wrangler deploy` only after
   approval of the intended configuration. Verify `/access`: unauthenticated
   POST rejected, wrong/expired/revoked identity rejected, authenticated verify
   yields a correctly signed proof accepted by the existing Android verifier.
   OWNER gets permanent PREMIUM; a different UID does not get OWNER. Check BASIC
   without login/offline and all existing local data. No purchase is performed.
6. **Test retention then trial, only after approval.** Configure
   TRIAL_RETENTION_POLICY_APPROVED=true and TRIAL_RETENTION_BACKEND_VERIFIED=true
   only after isolated migration/cleanup checks; then enable
   TRIAL_RETENTION_ENABLED=true with a reviewed hourly Cron (`0 * * * *` in UTC).
   Clear the old backlog in bounded runs, observe row counts and CPU, and ensure
   the schedule keeps up. Only after that enable NEW_TRIALS_ENABLED=true in the
   intended test environment. Test voluntary activation, the fixed 15-day deadline,
   no extension while history exists and the accepted repeat/recreated-UID cases.
   Production enabling is a separate deliberate owner action, not part of this task.
7. **Prepare deletion intake separately, keep execution OFF.** Complete legal
   operator name, remaining non-trial retention/processing details, public HTTPS
   legal URLs and actual web OAuth/API configuration. Set DELETION_WEB_ORIGIN to
   the exact approved HTTPS origin and authorize it in the Google web OAuth setup.
   Complete central privacy settings only with verified public values. After
   testing recent reauthentication and request/status, DELETION_REQUESTS_ENABLED
   may be enabled separately. No deleted:true response is claimed by this intake.
8. **Prepare future Firebase deletion credentials without enabling processing.**
   Dedicated least-privilege service account for this project, with
   `firebaseauth.users.get` and `firebaseauth.users.delete`. Store its JSON only
   as Cloudflare secret DELETION_FIREBASE_SERVICE_ACCOUNT_JSON, not the Play
   service account or a repository file. Approve a receipt TTL and rules for
   blocked/retry jobs; no default value is invented. DELETION_EXECUTION_ENABLED,
   DELETION_BACKEND_VERIFIED, DELETION_RETENTION_APPROVED and
   DELETION_MAINTENANCE_VERIFIED stay false. Execution also requires a maintenance
   window with NEW_TRIALS_ENABLED=false and PLAY_PRODUCT_ID unset. Safe purchased
   entitlement recovery and OWNER/security handling remain separate blockers.

## Android and operational limitations still requiring checks

- The installed Android client has a legacy local trial-record check in
  `src/app.js` before server activation. A device retaining that old key can show
  `legacyTrialReview` even when the server would allow a new trial. This task does
  NOT remove local keys, reset user data or change the protected UI. Use a separate
  controlled test device/profile for trial testing; a compatible client change
  for existing legacy histories requires a separate approved task, never manual
  deletion of the user's whole app storage.
- Account deletion and post-deletion BASIC/session/cache behavior must be tested
  with a real controlled backend before execution approval. Existing data and
  backups are not proof of correct Firebase session invalidation.
- No permanent repeat prevention is promised. All switches are false and no Cron
  exists in this commit. Receipt retention, blocked jobs, legal identity/transfer
  disclosures and public URLs remain incomplete until owner verification.
- Free plan: bounded queries/rows are prepared, but RSA/OAuth/authentication CPU
  must be measured live against the 10 ms budget. Quota exhaustion can delay
  cleanup and deny verification. No paid services or plan changes are configured.

Reference limits: https://developers.cloudflare.com/workers/platform/limits/
and https://developers.cloudflare.com/d1/platform/pricing/

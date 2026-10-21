# Firebase Google Authentication and license verification — preparation only

Status: adapters and pure backend scaffold only. No Firebase SDK dependency, project configuration, login UI, deployment entry point, service account, active backend or Billing implementation has been added. `app.js` does not import these adapters; existing BASIC/TRIAL behavior is unchanged. Do not treat mock tests as Firebase integration tests.

## Existing architecture and future composition

`src/firebase-access.js` exports `createFirebaseAccess`. Inject an Auth bridge, an explicitly configured HTTPS license endpoint and optionally fetch/clock implementations. The bridge contract is:

- `getCurrentUser()` → Firebase user (with `uid`) or null. A restored local Firebase session identifies a candidate account but never itself grants PREMIUM.
- `getIdToken(user)` → Firebase ID token from that SDK user, not a Google OAuth access token or raw Google ID token. Do not write tokens to application storage or logs.
- `signInWithGoogle()` → perform native Google sign-in and exchange the Google credential with Firebase Authentication; resolve only after Firebase has the user.
- `signOut()` → sign out the Firebase/native session.
- `onIdTokenChanged(callback)` → subscribe to Firebase identity/token changes, return an unsubscribe function. Callback invalidates the current license immediately. The future composition root must refresh verification after the settled auth event, and on resume/reconnect, with bounded retry/backoff; no automatic network loop is started here.

For Android/Capacitor, plan a native bridge using Android Credential Manager plus Firebase Auth. Do not use an embedded WebView OAuth popup as the native Google login implementation. The bridge is an interface, not an installed Capacitor plugin. Choose and validate native dependency versions in the actual integration phase. No current Gradle or signing changes are needed for this preparation.

Connect the returned `provider` to the existing `createAccessService` when the real integration is authorized. The composition root should call `start()`, expose optional login/logout separately from BASIC startup and call `dispose()` when removing the integration. Never pass local flags as a trusted verifier.

## Minimal backend contract

One future HTTPS POST endpoint `/v1/license` receives `Authorization: Bearer <Firebase ID token>` and an empty JSON object. The endpoint must not accept a client-selected UID, owner flag, email or source as authorization. `backend/license-handler.js` is a transport-independent factory: no Firebase initialization, HTTP listener or deployable function exists.

A future server wrapper must map method/header to the factory, enforce HTTPS, request/body limits, method handling, no caching, rate limiting and explicit CORS origins if a web client is authorized. CORS is not authentication. App Check may add app attestation later but cannot replace Firebase token authentication. Use consistent sanitized error responses; never log bearer tokens.

Dependencies to provide server-side:

1. `verifyIdToken(token, true)`: bind to Firebase Admin `getAuth().verifyIdToken` for the intended project, with revocation checks. Admin must validate signature, expiry, audience and issuer; never decode JWT without verification, use a custom Firebase token here, or enable Auth emulator acceptance in production. The scaffold also requires a matching nonempty `uid`/`sub` and Google sign-in provider.
2. `readOwnerSubject()`: read one owner Firebase UID from access-controlled server configuration/secret storage. Missing configuration grants no owner privilege. Provision the UID only after verifying the owner's actual Google/Firebase account in an administrative process. Never ship that UID in client configuration, email comparisons or source code. Do not grant the owner's spouse or other accounts the same exception. Administrative assignment/revocation must be audited.
3. `readVerifiedPurchase(subject)`: read only a server-controlled license record `{subject, status: 'active', permanent: true}` backed by a previously verified Google Play purchase. Missing, revoked, mismatched or inactive records grant nothing. No client write permission is allowed. This scaffold does not verify a purchase token and must not be wired to client-submitted records. Play verification, unique token/account binding, acknowledgement and refund/revocation updates remain a later phase.

Response 200 is `{version: 1, subject, entitlement: null}` or `{version: 1, subject, entitlement: {source: 'OWNER_GRANT' | 'GOOGLE_PLAY_PURCHASE', permanent: true, verifiedUntil}}`. The five-minute verification window uses server time; it is not the lifetime of the license. Authentication failure is 401; wrong method 405; unavailable server configuration/repository 503. The client checks schema, account binding, source and expiry and uses only the explicitly configured HTTPS server response. This is an online transport trust boundary, not cryptographically signed offline proof. Configuration and adapters are trusted application code, not user-controlled endpoint settings.

A minimal later deployment can be one HTTPS Cloud Function plus a private owner setting and a server-only purchase collection. Firestore client rules should deny all reads/writes to license records; Admin SDK access is controlled with least-privilege IAM. No apartment, reservation, address or guest data needs to leave the device. No Firestore instance/rules/configuration has been created in this phase.

## Offline behavior

| Situation | Behavior after actual integration |
| --- | --- |
| No login, no network or never verified | BASIC remains usable offline; an existing unexpired local TRIAL remains TRIAL. |
| Verified PREMIUM, connection lost | Existing in-memory grant can remain until its five-minute deadline if no refresh/invalidation occurs. Explicit refresh clears the old grant first and falls back immediately if offline. |
| Verification expires or app restarts offline | No persistent PREMIUM proof: fall back to current TRIAL/BASIC policy, keep all data and extra apartments visible read-only. |
| Logout/account change/token event | Clear the grant immediately. Verify again for the new session; never reuse the old account's license. |
| Reconnect | Future composition root refreshes rights; a verified permanent license can restore PREMIUM without changing local business data. |

First sign-in, fresh token verification and restoring PREMIUM after restart require connectivity. Local trial/device time is not tamper-resistant. Long-term offline paid access requires a separately authorized signed-lease design, server time policy and revocation tradeoffs; it is not implemented here.

## Manual Firebase configuration (future, no action performed)

1. Create/select a dedicated Firebase project. Register the existing Android application ID exactly as it is; do not rename/re-sign the app. Add signing certificate SHA-1 and applicable SHA-256 fingerprints for the stable test key and, later, the Google Play app-signing certificate (not just the upload key).
2. Enable Google in Authentication → Sign-in method and configure support email, OAuth consent/project settings and any required test users. Set Android/Web OAuth client configuration for the chosen native credential flow. Download the updated Android Firebase configuration for the intended environment when integrating; keep Admin/service-account keys out of client bundles and Git. Firebase client configuration is not an authorization secret; protect resources with authentication/IAM/rules.
3. Implement/install the selected native Auth bridge and Firebase dependencies, initialize the SDK once and verify sign-in, token refresh, cancel, logout and account switching on physical Android. Keep a separate opt-in flow so BASIC does not wait for login or network.
4. Before deploying Functions, arrange billing/Blaze, a region, least-privilege service identity and runtime configuration. Prefer platform credentials over downloaded long-lived private keys. Set the sole owner UID privately on the server after identity verification. Provision the private purchase store only when implementing purchase verification.
5. Configure the real HTTPS endpoint in trusted deployment configuration, rate limits, budgets/alerts and logging retention. Test invalid/expired/revoked/wrong-project tokens, cross-account attempts and repository outages with emulators and then a restricted test environment. Never accept emulator tokens in production.

## Costs and limits (official documentation checked 2026-10-21)

Standard Firebase social/Google sign-in is a no-cost Authentication feature, subject to product limits. Enabling Authentication with Identity Platform changes quotas/billing; do not assume its limits are the same as standard Auth. A deployed Cloud Functions backend requires Blaze/Cloud Billing and can incur compute, network, build/artifact storage, secrets, database and logging costs, even when traffic is small. Free allowances do not guarantee a zero bill. Budget alerts notify rather than enforce a spending cap. Nothing in this preparation provisions resources or incurs Firebase usage charges.

Official references:

- https://firebase.google.com/docs/auth/android/google-signin
- https://firebase.google.com/docs/auth/admin/verify-id-tokens
- https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
- https://firebase.google.com/pricing
- https://firebase.google.com/docs/functions/quotas

## Remaining work, only after approval

Configure the Firebase project and native SDK/bridge; wire optional UI and auth lifecycle into the existing service; implement the authenticated server wrapper and Firebase Admin adapters; deploy a restricted backend; test real sign-in and offline lifecycle; separately implement Play Billing and purchase verification. No next phase is started by these files.

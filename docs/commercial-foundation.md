# Commercial foundation — current status

This is a source implementation, not a production certification. Android package
remains `ro.icdapps.apartmentbookingmanager`; Android version and signing settings
are not changed in this stage. No APK/AAB is built, no Play product is published
and no purchase is performed.

## Approved launch model — 5 November 2026

- BASIC: free, anonymous and offline, at most three managed apartments. Returning
  from PREMIUM preserves every apartment, reservation, photo and local record.
- PREMIUM trial: voluntary 15 days without a card, Google sign-in and advance
  confirmation. Server time and signed proofs determine access and expiry;
  expiry returns to BASIC without deleting data.
- PREMIUM purchase: one non-consumable, lifetime buy option, no subscription;
  unlimited apartments and all PREMIUM features. Approved launch price: **99 RON**,
  to be configured in Play Console and changeable there later. The app must
  display Google Play's localized price, never a hardcoded 99 RON or a fallback
  price while Billing is unavailable. Other countries/currencies require owner
  approval of the actual Console price/tax configuration.
- OWNER: permanently free PREMIUM for the sole server-authorized owner identity,
  without an email allowlist or inheritance to other accounts.
- Discreet banner ads remain part of BASIC and PREMIUM when configured and
  consent permits. AdMob is currently disabled; PREMIUM does not promise ad removal.

The code preparation below does not activate any commercial service. See
[google-play-launch-readiness.md](google-play-launch-readiness.md) for release blockers.

## Audit of the existing implementation

| Area | Existing implementation | Remaining external verification |
| --- | --- | --- |
| BASIC | Anonymous/offline, three managed apartments; overflow stays visible/read-only, never deleted. Existing booking/calendar guards are reused. | Confirm the same guards on the Fold after a separately approved build. |
| Google/Firebase | Native Credential Manager Google sign-in exchanges credentials with Firebase Auth. BASIC never requires login. Public endpoint and verification key are already configured. | Google provider, OAuth client and signing certificates must match the Play/test distribution. Authenticated live verification was not performed here. |
| Trial | Explicit confirmation, 15 server-timed days, fixed deadline while the D1 history exists, signed native proof, encrypted cache and monotonic expiry. New enrolment is disabled. | Verify six-calendar-month cleanup and approved enrolment separately; exercise real Firebase accounts and device reboot. Local legacy history no longer vetoes the server decision. |
| OWNER | The sole Firebase UID is read from the server secret OWNER_SUBJECT; no email comparison or family inheritance. Native signature/account binding protects offline evidence. | Confirm the actual owner secret and live signed proof without revealing either in logs. |
| Billing | Previously only an unavailable adapter and server purchase flags, without Google validation. | New implementation below requires Play Console/API configuration and Play test-track verification. |
| Ads | Previously only adsEligible=true and explanatory text; no ad delivery. | New optional SDK/UMP banner is disabled until AdMob is configured. |

The public `/access` endpoint returned 401 to a request without credentials during
this audit. This proves reachability/authentication enforcement only, not that
Google sign-in, OWNER, trial enrolment or production purchase verification works.

## What this change implements

- Play Billing 8.3.0 for one INAPP, non-consumable product. Localized price comes
  from Google Play; there is no subscription, consumption or hardcoded price.
- Purchase and restore controls in Account and access, plus an upgrade shortcut
  inside the existing access details. Existing data editors/layouts are reused.
- `/purchase` authenticates a Google Firebase ID token and validates the receipt
  through Google Play Developer API for the fixed application package and the
  server-configured product. Pending/cancelled/consumed/unbound receipts do not
  grant PREMIUM. Test receipts require an explicit server test switch.
- SHA-256 obfuscated account binding is generated from the actual Firebase UID
  natively and checked server-side. A receipt cannot move to another Firebase
  account. Existing purchases without this binding need manual review; they are
  not automatically adopted by whichever account submits a token.
- Successful purchases are acknowledged on the server, never consumed. Receipt
  hashes reserve ownership atomically in D1. Receipt tokens are encrypted with
  AES-256-GCM and a separate server-only key; no plaintext tokens are stored.
- Only a signed, nonce-bound proof accepted by BookingAccess grants PREMIUM.
  Native purchase results, local flags and backup files cannot grant rights.
- If Play returns no current receipt, a successful server/native refresh of a
  GOOGLE_PLAY_PURCHASE entitlement is reported as restored. OWNER/gift proofs
  do not count as a restored purchase, and an account change aborts the result.
- Restore is available explicitly and queried again for authenticated accounts
  on account refresh/resume/purchase changes, so delayed payments can be verified
  without another charge. Repeated verification/acknowledgement is idempotent.
- Online access checks revalidate retained receipts with Google. Cancellation or
  a definitive missing receipt removes the purchased entitlement on the next
  successful check. Dependency outages preserve existing signed offline evidence.
  Legacy/manual GOOGLE_PLAY_PURCHASE rows alone are no longer accepted as proof.
- Optional AdMob banner and UMP consent/privacy controls. It reserves its own
  space instead of covering navigation. No interstitial, rewarded or app-open
  ads. There is no entitlement check removing ads from PREMIUM or OWNER.
- The trial details display its actual expiry date, alongside remaining days.

Only entitlement/account records are stored on the server. No reservation,
customer, payment-history, apartment, photo, maintenance or draft data is uploaded.

## Defaults and manual setup — Google Play

Purchasing is **disabled**: `play_billing_enabled=false`, with an empty
`play_premium_product_id` in `android/app/src/main/res/values/commerce_config.xml`.
No production product ID has been invented.

1. In Play Console, complete the app/payment profile setup as applicable. Create
   exactly one **one-time product / buy option**, not a subscription or rental.
   Choose its real product ID, localized title/description and countries; set the
   approved launch price to **99 RON** in Romania and review Google's localized
   prices/taxes for other markets;
   keep it inactive until the owner approves activation/testing/publication.
   The current client selects the standard single buy offer; do not configure
   multiple rental/preorder/quantity offers for this lifetime entitlement.
2. Enable the Google Play Android Developer API in the intended Cloud project.
   Authorize a server service account for this app with the least Play Console
   permissions needed to read and acknowledge purchases. Store its credential
   only as Worker secret `PLAY_SERVICE_ACCOUNT_JSON`, never in the app or Git.
3. Set Worker `PLAY_PRODUCT_ID` to the same real product ID. Set a separate
   random 32-byte key encoded as standard Base64 as secret
   `PLAY_TOKEN_ENCRYPTION_KEY`. Keep that key backed up privately; rotating it
   requires a controlled re-encryption of retained tokens. Do not replace the
   existing ACCESS_PRIVATE_KEY or Android signing key.
4. Apply migration `0002_play_purchases.sql` to the existing D1 database through
   the normal approved migration process. It only adds an entitlement table;
   existing trial history and licenses are not deleted. Deploy the updated
   Worker only after review. This stage does not deploy it automatically.
5. Configure Firebase Google authentication/OAuth and register SHA-1/SHA-256 for
   both the current test certificate and the eventual Play App Signing
   certificate. Do not assume the Play signing certificate equals the sideloaded
   test certificate. Keep OWNER_SUBJECT as the verified owner's Firebase UID in
   a server secret, never an email or client value.
6. After the backend is verified, enter the real product ID and enable the native
   Billing flag for a separately approved test build. Use an approved internal
   Play track and license testers with the same Firebase/Google account used to
   buy. `PLAY_TEST_PURCHASES_ENABLED=true` is only for controlled license-tester
   verification in a separate test backend/database/proof-key environment;
   production must omit it or set it to false. Never carry tester proofs or
   test purchase rows into the production entitlement environment.
7. In Play testing, exercise success, cancellation, delayed payment, acknowledgement,
   already-owned restore, reinstall/sign-in, wrong Firebase account, refund and
   offline use. Test purchases and publication require separate approval.

## Defaults and manual setup — AdMob

Ad delivery is **disabled** by default. The default build does not include the
ads plugin or Mobile Ads/UMP dependencies. There are no fake production IDs.

1. Register this Android app in AdMob and create a banner unit. Complete the
   actual publisher/account/app setup and applicable privacy message in AdMob
   Privacy & messaging. Configure the privacy/support information and app-ads.txt
   required by the distribution setup.
2. For a separately approved configured build, supply public Gradle properties
   `abmAdsEnabled=true`, `abmAdMobAppId` (actual AdMob app ID, containing `~`) and
   `abmAdMobBannerId` (actual banner ID, containing `/`). Enabling without valid
   ID syntax fails the build. These public IDs are not service-account keys.
3. Validate UMP consent, refusal and privacy-options reopening with test devices;
   verify no ad request is made without canRequestAds permission. Test a banner
   in BASIC, TRIAL, purchased PREMIUM and OWNER, including Fold orientation and
   narrow/wide displays. Check that navigation/editors are not covered.
4. CI uses Google's explicitly documented sample IDs **only to compile** the
   enabled code path; it does not run the SDK, request ads or ship those IDs in
   a production configuration. Do not enable real traffic during development.

## Trial, offline access and data-retention limits

`NEW_TRIALS_ENABLED=false` remains unchanged. The approved policy retains
trial history for at most six calendar months from trial start, computed in UTC;
the existing migrations/cleanup implementation prepares this deadline. Do not
reinstate a permanent history or a local legacy-history veto. Before enabling
enrolment, verify remote schema/configuration and cleanup in an approved stage.
Activation remains voluntary, with Google sign-in and confirmation, no card.

The protection is limited to the retained Firebase identity/history. Repeating
a trial after history removal or account recreation is explicitly accepted. No
permanent identifiers, fingerprinting or extra anti-abuse marker is introduced.
Reinstalling, clearing
local data, restoring an app backup or changing the phone clock cannot recreate
that account's server trial. It is not a claim to recognize a person across
arbitrary new Google/Firebase accounts or deletion/recreation of the identity.

Temporary rights use Android elapsedRealtime and server time, not the editable
wall clock. After a reboot, online time validation is required; without it the
app conservatively uses BASIC, retaining data. Rooted/modified operating systems
are outside this assurance. Permanent OWNER/purchased evidence can remain offline
after a first signed verification; offline devices learn refunds/revocations on
their next successful online check. Refund with revocation/cancellation or a
definitively missing receipt invalidates purchased access on revalidation;
a refund without revocation must not be described as automatically removing
entitlement. API/network failures never masquerade as refunds. Real-time refund notification (RTDN) is not
configured here; do not describe online polling as instantaneous revocation.

Uninstalling normally removes Android local app data. Purchase restoration restores
entitlements, **not reservations**. Recover business data from the existing local
backup workflow. That backup never transfers Google sessions, trial eligibility
or PREMIUM/OWNER. No cloud data synchronization or destructive migration is added.

## Verification boundary

Automated tests use fictional accounts/receipts and ephemeral test keys. They
exercise real SQL constraints/encryption/signatures and mocked Google HTTP/SDK
boundaries. They cover account reuse prevention, pending/cancelled/refunded
receipts, acknowledgement retry, restore, unverified-client denial, BASIC limits,
trial expiry, offline behavior, OWNER exclusivity and RO/EN controls. Android
Java/JVM checks compile enabled/disabled integrations without assembling an APK.

They do not prove live Google Play settlement, service-account permissions,
Firebase Console configuration, AdMob approval/consent delivery or physical Fold
layout. Those require the configured services and a separately approved build.

Primary references:
- https://developer.android.com/google/play/billing/integrate
- https://developers.google.com/android-publisher/api-ref/rest/v3/purchases/products/get
- https://developers.google.com/android-publisher/api-ref/rest/v3/purchases/products/acknowledge
- https://developers.google.com/admob/android/quick-start
- https://developers.google.com/admob/android/privacy

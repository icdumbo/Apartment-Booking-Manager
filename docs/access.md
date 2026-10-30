# BASIC / PREMIUM access

The current audit, implementation status, external setup and test limits are in
[commercial-foundation.md](commercial-foundation.md). This supersedes earlier
statements that Billing/ads are absent, that the public endpoint/key are empty,
or that Android is still version 1.0.10. The current version is 1.0.20/code 21.

BASIC remains anonymous and offline with three managed apartments. Existing
overflow apartments/reservations are retained read-only. Existing domain guards
remain unchanged. OWNER is server-controlled by Firebase UID; no email comparison
or family inheritance is used.

The native Google/Firebase bridge, signed account/nonce-bound proof and encrypted
Android cache remain the trust boundary. Legacy local browser trials are preview
fixtures, not secure Android evidence. Server trial records are immutable, expire
after exactly 15 days, and survive reinstalls/backup restores for the same account.
New enrolment remains disabled until legacy eligibility is reconciled. Android
monotonic time prevents wall-clock extensions; reboot requires online trial-time
verification. Permanent rights have the documented offline/revocation tradeoff.

Play Billing now has a real native SDK adapter, secure Google API validation and
acknowledgement, encrypted retained receipts, account binding and restore. It is
disabled pending actual Console/backend configuration. Local premium flags and
manual server purchase rows alone cannot authorize a purchase. Optional AdMob/UMP
banners are likewise disabled until public production IDs are configured.

No client bookings or customer data is stored online. Reinstall purchase recovery
restores rights, not app data; existing local backup handles business data. No APK,
real payment, Play product publication or backend deployment occurs in this stage.

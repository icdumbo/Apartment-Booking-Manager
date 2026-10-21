# BASIC / TRIAL / PREMIUM foundation

`src/access.js` owns entitlement persistence and policy. Existing business storage remains version 1 and is not migrated or truncated. A separate versioned key records explicit trial activation and the highest observed timestamp. TRIAL lasts exactly 15 × 24 hours, including offline time; expiry is rechecked on resume, periodic state checks and every write. BASIC permits managing the first three apartments in stored order; all additional apartments/reservations can be viewed read-only. Deleting an active apartment makes the next stored apartment manageable. Reassignment into read-only apartments is blocked. An expired open editor cannot bypass write guards.

The first-use RO/EN notice explains expiry, free BASIC, one-time permanent PREMIUM, data retention and planned ads in all tiers. Activation is explicit; no billing or ad SDK is installed. `accessPolicy` already supports PREMIUM; the unavailable Billing adapter exposes purchase/restore integration points. No local premium toggle is accepted. A future verified Google Play purchase provider must resolve permanent entitlement before PREMIUM can be activated.

This offline foundation is not tamper-resistant: clearing app storage or manipulating local records/device time can affect trial enforcement. Highest observed time prevents simple clock rollback after expiry has been observed, but is not a trusted time source. Corrupt/unavailable entitlement storage fails to BASIC without overwriting it or business data. Add trusted purchase verification and reconcile purchase/restoration/lifecycle results during the Billing phase.

Calendar, responsive CSS, half-day geometry, application ID and signing configuration are unchanged. Nothing is deployed from the working branch.

# Booking details: optional metadata and local persistence

The existing calendar callbacks, editor dialog, mutation guards, repository and delete confirmation are reused. No calendar geometry, half-day rules, Firebase, licensing or Android configuration changes are needed. Required guest, phone, apartment, dates and overlap/status validation remain in place. Both new and existing bookings use the same form.

## Stored contract (business schema version 1, additive fields)

| Field | Stored value | When unspecified |
| --- | --- | --- |
| `persons` | Positive safe integer | Property absent |
| `totalAmountCents` | Non-negative safe integer in bani (RON / 100) | Property absent, not assumed zero |
| `paidAmountCents` | Non-negative safe integer in bani | Property absent; balance calculation treats as zero |
| `source` | `booking`, `airbnb`, `direct`, `other` | Property absent (unknown) |
| `notes` | Text, up to 4000 characters | Property absent |

Money entry accepts a decimal comma or dot and at most two decimal places, without thousands separators. Negative, unsafe, non-finite and exponent values are rejected. Paid amount must not exceed total; a positive payment requires a specified total. Blank and explicit zero amounts remain distinct. Derived balance is total minus paid, or unspecified when no total is recorded. Nights are calculated from UTC date-day differences (check-out excluded), never persisted as a second source of truth.

`src/booking-values.js` centralizes conversion, validation and balance for future statistics, collections and reports. These modules are not implemented. Amount collected is derived from the per-booking payment history when present, plus any explicitly retained legacy aggregate. This is not an invoice, accounting record or Google Play payment. See `docs/payments.md`. Currency is RON only in this stage.

## Compatibility and offline behavior

There is no bulk migration, default insertion or retroactive amount calculation. Loading or viewing old bookings does not write business data. Saving preserves unknown existing metadata; new optional properties are added only when entered, and clearing a field explicitly removes that property. Existing bookings with none of these properties continue to validate unchanged. Storage is the same local repository and key as before; no network or account is required for edits. Existing storage failures and BASIC overflow guards remain effective, including new text areas.

The responsive detail form has sticky heading/actions, editable fields, computed nights/balance and translated RO/EN labels. It keeps phone as a required field to preserve previous validation. Preview fixtures are used only inside browser tests, never injected into the delivered application. Authentication still requires its separate real Android verification; browser tests do not certify Google Sign-In on a phone.

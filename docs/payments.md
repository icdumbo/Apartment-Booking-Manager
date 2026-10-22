# Per-booking payment history

The existing offline repository and version-1 business storage are reused; no bulk migration is performed. Calendar geometry, Firebase authentication, trial/license verification, Android signing and Billing are unchanged. Only existing TRIAL/PREMIUM access can administer the advanced history. BASIC can read saved history, including payments on overflow apartments. Expiry never deletes data.

## Additive booking contract

- `payments` (optional): array of `{id, date, amountCents, method, notes?}`. `date` is the actual collection date in ISO `YYYY-MM-DD`; `amountCents` is a positive safe integer in bani. Methods: `cash`, `card`, `transfer`, `other`. Notes are limited to 2000 characters. IDs must be unique within a booking.
- `legacyPaidAmountCents` (optional, only with a ledger): non-negative safe integer for the previously collected aggregate whose date/method remain unknown. It is displayed explicitly, never fabricated as a dated payment.
- `paidAmountCents`: for bookings with history, equals `legacyPaidAmountCents` (or zero) plus all payment amounts. Validated on load/save so it cannot diverge from the ledger. Without history it keeps its previous aggregate semantics, including the distinction between absent and explicit zero.
- Remaining balance = booking total minus total collected. Amounts display as Romanian RON in both UI languages. Overpayment, unsafe sums, invalid dates/methods and non-positive payments are rejected. No refunds, commissions, multi-currency or negative payments in this stage.

Payment records are nested under their booking. The central screen joins booking ID to `apartmentId` and filters by payment `date`; apartment or stay changes do not rewrite collection dates. Unknown legacy aggregates have no usable collection period and must remain separate from date-filtered receipts until the user explicitly provides details. The central Payments screen now projects these records read-only; see `docs/collections.md`. Reports and statistics are not implemented.

## Legacy conversion without duplication

Opening or saving an unchanged legacy booking creates no ledger and inserts no defaults. The first explicit history operation copies the prior aggregate into `legacyPaidAmountCents` and creates the detailed list. **Add new payment** increases the total. **Detail a legacy payment** requires the user to enter the actual date and method; it subtracts the same amount from the unresolved legacy aggregate as it adds to the detailed list, so total received stays unchanged. Partial detailing is supported; amounts exceeding the unresolved remainder are rejected. No date or method is guessed. Deleting or editing a detailed payment explicitly changes total received; it does not silently restore it to the legacy aggregate.

## Editing and permissions

Payments are edited as reservation drafts: Apply payment updates the draft, and Save reservation persists it atomically with the booking. Cancel reservation discards all draft changes. An open payment entry must be applied or cancelled before the reservation can be saved. Deleting a payment requires a second explicit confirmation click. The derived collected field becomes read-only for bookings with a ledger. Existing aggregate-only editing remains available under the original booking permissions.

The same access service controls button availability and rechecks every history operation. The central reservation persistence guard rejects changed history after trial expiry or verification loss, even when a draft was opened earlier. Other permitted BASIC booking edits retain the ledger unchanged. Existing explicit booking/apartment deletion still deletes its associated booking data under the current confirmation and access rules; there is no deletion on entitlement downgrade. Local storage remains editable by a device owner; this ledger is not a secure server audit trail. There is no cloud synchronization, bank/card processing or internet dependency.


## Reservation currency (RON / EUR)

The optional booking `currency` field is `RON` or `EUR`; absence means RON without a migration or amount rewrite. Amount integers remain minor units (RON bani / EUR cents). Every payment inherits its reservation currency; new payment records do not duplicate it. An explicit currency on an imported record must match the reservation or validation rejects it. No exchange rate or conversion exists.

Currency is locked when existing detailed payments or positive legacy receipts exist, and when a new payment has been applied to the current draft. Both the form and save guards enforce the restriction, including deleting payments and attempting a currency change in the same save. A saved booking with no remaining payments/receipts can select a currency on a subsequent edit; no integers are converted automatically. For an unpaid booking, selecting another currency keeps the numeric values as entered, so users must verify them before saving.

Future statistics/reports must group by `bookingCurrency(booking)` and keep RON/EUR totals separate, never sum unlike currencies. The existing legacy-amount and date filtering rules remain applicable independently within each currency. UI labels, formatted total/collected amounts, individual receipts and balance follow the booking currency in both RO and EN; number entry continues to accept comma or dot.

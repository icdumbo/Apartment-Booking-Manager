# Raport rezervări / Reservations Report

Read-only, offline projection of the existing booking records; no migration,
new ledger or business-storage writes. Available in TRIAL/PREMIUM through Reports
in the bottom navigation and main menu. BASIC hides the report and retains data.

- Filter dates are inclusive. A stay is included when check-in is on/before the
  filter end and check-out is after the filter start (check-out is not an occupied night).
- Each selected booking appears once, ordered by check-in, with its actual full
  dates and night count. Both confirmed and unconfirmed bookings can be selected.
- Reservation value, collected amount and outstanding balance are **full current
  booking amounts**, not prorated amounts or historical balances at the filter end.
  The collected amount includes all payments for the selected booking regardless
  of their payment dates. Use Payments for a report by actual collection date.
- Existing `totalReceived` and `bookingBalance` helpers remain authoritative.
  Legacy aggregate receipts are included once; mixed ledgers include their
  unresolved legacy remainder once. Undated legacy amounts are identified per
  booking and in the summary, without assuming payment dates or methods.
- Missing currency means RON. RON/EUR are filtered separately; no conversions.
- Missing total value/balance is shown as — and excluded from value/balance
  totals, with a count of unpriced bookings. No recorded receipts means zero;
  an explicitly entered zero reservation value remains zero, not unspecified.
- Aggregate money uses safe integer minor units and rejects overflow.
- Date/status/apartment/currency filters are transient UI state. Existing local
  business data and trial timestamps are never reset by this screen.

No PDF/Excel exports or other report types are implemented. Availability still
uses the existing entitlement service; this screen adds no licensing backend.

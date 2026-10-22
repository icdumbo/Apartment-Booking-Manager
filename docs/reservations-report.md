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

No PDF exports or other report types are implemented. Availability still
uses the existing entitlement service; this screen adds no licensing backend.

## Excel export

Export Excel reuses `selectReservationsReport` with the active filters and a fresh
entitlement check on every click. Invalid filters disable export. BASIC cannot
export; no entitlement is persisted or granted by the exporter.

The `.xlsx` is generated offline in the browser (OOXML in a stored ZIP; no CDN,
network request or added dependencies). A single bilingual worksheet contains
filter context, count and current monetary totals, complete reservation rows,
a totals row and the existing calculation/legacy explanations. Currency is
selected once for the whole file. Undated legacy receipts are an explicitly
labelled subset of collected amounts, never an additional amount to sum.

Amounts and counts are numeric cells; dates are numeric Excel dates displayed
DD/MM/YYYY. Money uses the Romanian locale marker and two decimal places with
RON/EUR suffix. Excel's separator rendering can also depend on the reader's
regional settings. Unknown values/balances remain blank yellow cells; explicit
zeros are numeric zero. User strings are escaped inline text, never formulas.
Headers freeze above the reservation rows, which have autofilter, wrapped text
and explicit column widths. Excel's row limit is guarded; Excel also has a
15-significant-digit numeric precision limit. The file is a snapshot, not an
editable financial calculation model.

Browser download uses a local Blob and a download link. Automated checks cover
desktop Chromium and touch viewports, including a standalone offline HTML file.
Actual Android Chrome/Files behavior and the installed Capacitor WebView must
still be tested on-device. If a WebView blocks Blob downloads it will need a
native file-saving adapter in a separate stage; no Android configuration or
plugins are changed here. Cancelling a system download does not change data.

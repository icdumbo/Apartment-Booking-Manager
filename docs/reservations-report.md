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

Other report types are not implemented. Availability still
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

## PDF export

Export PDF uses the same read-only selector and a fresh entitlement snapshot as
the on-screen report. Only TRIAL/PREMIUM with valid filters can generate it.
The Excel exporter and the report calculation module are unchanged.

The PDF is A4 landscape, with Apartment Booking Manager branding, localized
title, active date/apartment/status/currency filters, the four summary values,
full reservation rows, total amounts and the existing calculation explanations.
Unspecified values remain —, distinct from numeric zero. Undated legacy amounts
are explicitly identified as already included, with per-booking notes where
applicable. Full stays and current amounts are exported; nothing is prorated.

Rows wrap and paginate without truncation; subsequent table pages repeat the
brand, title and column headers. Every page has a localized page/total footer.
Money uses the existing Romanian formatter, independently of PDF viewer locale.
DejaVu Sans subsets are embedded for RO/EN diacritics and Latin/Greek/Cyrillic
text. Scripts outside the bundled font's coverage are not guaranteed.

jsPDF 4.2.1 and the font subsets are bundled under src/vendor with their license
notices. No CDN, remote font, external PDF service or extra Android permission is
used. The UMD library has only a trailing ES-module export added; its unused
source-map link is removed. Font subsets were generated with fontTools from
DejaVu Sans and DejaVu Sans Bold, preserving U+0020–052F, U+2000–206F, U+20AC
and U+FFFD. No npm runtime dependency is required for these vendored assets.

Validation covers RO/EN, missing/zero values, filtered currencies and statuses,
empty reports, long names, multi-page reports, repeated headers, all row names,
diacritics, and safe BASIC/expiry behavior. Independent PDF extraction and raster
inspection are performed in addition to browser downloads. Browser downloads
use a Blob, as Excel does, and work in the tested offline Chromium touch
viewports and standalone local HTML. Real Android Chrome/Files and the installed
Capacitor WebView remain unverified. A WebView that blocks Blob downloads needs
a native save/share adapter in a later stage; no APK or Android configuration
is changed in this stage. Cancelling a download does not modify business data.

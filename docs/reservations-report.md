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
- Missing currency means RON. The default is **All currencies**: all matching
  stays are listed once, with their original currency. Totals are grouped by
  currency; there is no combined monetary total or conversion. The optional
  currency selector can still restrict the report to RON or EUR (currently accepted).
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
a totals row and the existing calculation/legacy explanations. Each reservation retains its currency. Mixed reports have a total row per
currency; a single-currency selection retains the existing layout. Undated legacy receipts are an explicitly
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
Both exporters share the same selection and per-currency totals.

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

## Mixed-currency exports

The shared selector returns `rows[].currency` and `totalsByCurrency`. In ALL
mode it deliberately exposes no top-level monetary total, preventing accidental
addition of unrelated currencies. Existing per-booking receipts/legacy amounts
are counted exactly once; payments continue to inherit their reservation currency.

The app, Excel and PDF now share the same presentation: an overall reservation
count and unspecified-value count, separate from a compact matrix. Currency
columns are built from the selector's represented currencies in the accepted
currency order (currently RON/EUR); the rows are count, reservation value,
collected amount and balance. No new currency or currency conversion is enabled.
All metrics still come from the existing selector; it is unchanged.

Excel keeps ten visible reservation columns and original-currency numeric
formats. General counts are in row 4, the matrix in rows 5–9, a thin white
separator in row 10 and the filter header in row 11. Summary amounts are numeric
formula cells referencing the corresponding per-currency TOTAL rows, not
concatenated text. A hidden currency column K belongs to the mixed-currency
native table (`A11:K[last booking]`), so sorting moves it with its reservation.
Per-currency amounts retain `SUMPRODUCT` with per-row `SUBTOTAL(109,OFFSET(...))`
and the currency predicate. Per-currency counts use the equivalent visible-row
count formula; overall counts retain SUBTOTAL. TOTAL rows, notes and explanations
remain outside the filter. Main headers freeze and repeat when printed; A4
landscape stays one page wide. The extra sheet uses the same fonts and widths.

The additional **Pe apartamente / By apartment** sheet groups the same exported
selection by apartment identity, preserving chronological order within each
apartment and full stay dates. Each reservation is shown once. Currency-specific
SUMIF totals follow each apartment; missing values stay blank and explicit zero
stays numeric. Notes `[n]` refer to the full notes on the main sheet. It has no
filters, a fixed/repeated header at row 4 and the same A4 settings. It is an
independent snapshot view for consultation: applying filters or sorting on the
main sheet does not alter this grouping. This works around needing the native
Microsoft Excel filter menu on a narrow Fold screen; the app cannot change that
external menu's scrolling or zoom behavior.

PDF uses the same compact currency matrix and separate general counts, one
complete chronological table, original ISO currency suffixes and TOTAL rows per
currency. Unpriced reservations have a subtle warm background; explicit zeros
do not. A4 landscape, Unicode RO/EN fonts and repeated table headers are retained.
The representative 70-reservation mixed-currency test remains 6 pages before and
after this presentation change. Empty reports retain zero counts and an empty
message without inventing financial amounts in another currency.

Read-only checks cover OOXML numeric styles, caches, formulas, filter bounds and
PDF extracted text/rendering. Actual recalculation after filtering in Microsoft
Excel and saving on a physical Android device require user verification; browser
and native-adapter mocks do not establish those physical-device results.

The local spreadsheet renderer cannot evaluate the existing SUBTOTAL/OFFSET array
formulas faithfully and does not reproduce Romanian locale formats. Layout-only
previews use the actual file's independently checked cached values in a disposable
in-memory view; exported workbooks retain every original formula and locale format.
This does not establish live recalculation or filter-menu behavior in Microsoft Excel.

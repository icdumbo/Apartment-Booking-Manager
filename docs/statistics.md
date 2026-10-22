# Statistics dashboard — TRIAL / PREMIUM

The bottom Statistics navigation entry and the main menu open the same offline dashboard. `src/statistics.js` computes read-only projections from existing apartments, bookings and nested payments; `src/statistics-screen.js` renders the filters, cards, SVG charts and accessible value tables. Nothing is migrated or persisted. The existing entitlement service gates the model and UI; BASIC shows a compact benefits card. Expiry/filter/resume checks remove rendered figures and charts without deleting stored data. No SDK, financial cache, external chart library, Firebase/Billing/signing change or calendar change is required.

## Scope and periods

Monthly uses the chosen month; Annual uses the full calendar year. Comparison compares the chosen month with the same month of the previous year, with a 12-month chart overlay for that year where records exist. Year 1 has no previous-year comparison. Charts always show January–December of the selected year, including in monthly mode. Previous months without relevant booking/payment records are shown as unavailable (`—` in value tables), never assumed to be observed zero activity. Previous-period completeness cannot be established from local records.

Filters select apartment(s) and a financial currency (RON/EUR). Occupancy metrics always include all currencies. Missing booking currency means RON. Both confirmed and unconfirmed reservations count, consistent with the existing calendar's booked intervals. No cancellation or maintenance states are invented. Filters and expanded definition panels are session-local; no extra storage key is created.

## Definitions

| Indicator | Definition |
| --- | --- |
| Occupied nights | Union of occupied date intervals per selected apartment, clipped to the period. Check-in included, check-out excluded. Intervals are merged so a shared checkout/check-in date or overlapping source intervals do not double-count nights. |
| Capacity (denominator) | Number of selected existing apartments × calendar nights in the period. All selected apartments count for the full period, even without bookings. Creation dates/maintenance schedules are not available, so this is not historical operational availability. |
| Occupancy rate | Occupied nights / capacity × 100; zero when capacity is zero. Independent of selected currency. |
| Reservation count | Each distinct booking whose stay intersects the period, counted once. Annual counts are recomputed for the year, not summed from monthly booking counts. |
| Actual receipts | Sum of dated payments collected during the period, only for bookings in the selected currency/apartment(s). Includes advance/post-stay receipts irrespective of stay dates. Uses the existing collections projection; no amount is inferred from booking values or undated aggregates. |
| Available nights | Capacity minus occupied nights: free apartment-nights, not the capacity denominator itself. |
| Average stay in period | Occupied nights clipped to the period / intersecting reservation count; zero with no reservations. This is not the average full duration of cross-period stays. |
| Average revenue per occupied night | Known booking values in the selected currency, prorated by the proportion of each stay's nights inside the period, divided by the occupied nights of those priced stays. Each prorated amount is rounded to the nearest minor unit (half up), then summed; the final average is rounded to a minor unit. This is stay-value-based, NOT collected cash / nights. Missing prices and their nights are excluded; explicit zero prices count. No priced nights means `—`. |
| Average reservation value | Mean of the full known values of intersecting stays in the selected currency. No proration for this metric. Missing values excluded; explicit zero included. No priced reservations means `—`. |

All monetary inputs remain integer minor units; prorating/averaging uses integer `BigInt` arithmetic, and aggregate sums fail explicitly if they exceed safe integer precision. Rounding of prorated stay values may cause one-minor-unit differences when independently rounded monthly allocations are compared with a whole-year allocation; actual receipts are never prorated and have no such allocation differences. Monetary displays keep Romanian separators in both UI languages. Other numeric metrics use the UI locale with at most one decimal.

## Legacy and financial caveats

A separate section shows (a) unresolved undated legacy receipts across all periods in the chosen apartment/currency, and (b) the full known value of relevant stays with no dated payment entries. These are distinct concepts and must not be added to actual receipts or to each other. A booking may appear in both descriptions; neither changes cash totals. Partially detailed legacy receipts stay excluded from dated totals until the user supplies the real date/method through the existing reservation editor. Unknown prices are also disclosed by count.

The charts show actual monthly receipts and monthly occupancy. Comparison shows the four primary metrics against the equivalent prior month only if relevant prior records exist. A prior year can contain partial data; this dashboard cannot certify historical completeness. No tax treatment, accounting recognition, refunds, exports, owner report or payment-processing features are implemented.

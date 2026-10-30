# Apartment owners and local filtering

An apartment may have an optional `owner` string (up to 200 normalized characters).
There is no account, cloud owner registry or additional permission attached to it.
This metadata is unrelated to the commercial OWNER PREMIUM entitlement.

The editor provides existing names through a datalist and accepts a new name.
Selecting/typing an existing name reuses its spelling. NFC normalization, collapsed
spaces and Romanian case-insensitive comparison define the same logical owner;
several apartments may share it without changing BASIC/PREMIUM apartment limits.
Editing this field changes only that apartment's association, not every apartment
using the old name. Unused names naturally disappear from the selection list.

Existing apartments without this field remain valid and are not migrated or
rewritten. An empty editor value removes the optional field. Existing photos,
bookings, receipts, maintenance entries and drafts are not reassigned or modified.

Statistics, Reports and Maintenance default to All owners and provide a separate
No owner choice. Their apartment selectors show only matching apartments. Changing
owner resets the apartment selection; period/status/currency filters remain.
An owner removed from the data yields an empty selection, never an automatic
fallback exposing all owners. Financial amounts stay in their original currencies.

Statistics scope both occupancy/capacity and all receipt/legacy/history calculations,
including monthly, annual and comparison charts. Reports scope rows before totals,
notes and export generation. Excel retains the existing summary and per-apartment
worksheets; selected-owner PDF and screen reports also show apartment subtotals.
Exports identify the owner and selected dates. Even inconsistent owner/apartment
filters cannot include the foreign apartment's name, notes or financial rows.

Maintenance filters all three existing sections (expenses, works, reviews), their
displayed costs and expense totals using apartment associations. The existing
Maintenance implementation has no Excel/PDF export controls; no new export type
was invented in this change. Existing reservation Excel/PDF formats are retained.

## Backup compatibility

The optional field is included in the existing JSON v1 apartment whitelist and
validated with the normal apartment validator. No new storage key or destructive
migration is needed. The updated importer accepts old v1 ownerless backups, and
new backups preserve owners together with photos, bookings, payments, maintenance
and drafts. Validation/confirmation/rollback mechanisms are unchanged.

Forward-compatibility boundary: an older application with the previous strict
whitelist rejects a new backup containing `owner`. Use the updated application to
restore these newer backups. Do not remove metadata or weaken the old validator
to pretend that old applications understand the new optional field.

## Calendar and verification

Only the two explanatory legend spans are removed, in both languages. The four
Free/Confirmed/Unconfirmed/Handover keys remain. Removing wrapped explanatory text
reduces mobile height; reservation colors, half-days, sticky headers and scroll
behavior are unchanged.

Tests use fictional owners/customers. They cover creation/edit/reuse/clearing,
reload, no-owner/stale-owner filters, all metric/currency/period paths, both Excel
sheets and notes, independent Unicode PDF text extraction, complete new/legacy
backup restoration and mobile viewports (344/390/768). Existing regression checks
remain enabled. Real Samsung interaction still requires a separately approved APK.

At the starting commit e852e58, both UI preview checks and Cloudflare access checks
were successful. Commercial/authentication/Billing/AdMob code and Android
package/version configuration are outside this change and remain untouched.

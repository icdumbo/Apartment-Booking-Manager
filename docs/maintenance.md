# Maintenance / Întreținere — stage 1

Entry: Menu → Maintenance. Uses the existing entitlement snapshot: TRIAL and verified PREMIUM (including OWNER/GIFT) are allowed; BASIC sees a retained-data explanation and an account/access shortcut. The shortcut does not purchase or activate anything. Google Play Billing remains unimplemented. No licensing/backend changes, no automatic trial activation.

## Local data

`src/maintenance.js` follows the existing synchronous localStorage repository pattern in a separate versioned key, `apartment-booking-manager:maintenance:v1`. No changes/migrations to the business key, bookings, photos, or payment histories. Data is loaded lazily; corrupt/unreadable data is reported and never overwritten with an empty dataset. Save validates the complete document and compares the stored snapshot before writing; stale edits fail explicitly. Storage failures leave the previous document intact. As elsewhere with localStorage, there is no cross-tab transaction primitive: simultaneous writes at exactly the same instant are outside the comparison guard's guarantee. Intended use is one app instance.

Schema `{version:1, expenses:[], works:[], reviews:[]}`. Every record has an immutable UUID, stable `apartmentId`, description and optional notes. Monetary values are nonnegative safe integer minor units; currencies currently reuse RON/EUR. Optional work costs preserve unspecified versus zero. Dates use ISO internally and the existing flexible DD/MM/YYYY editor externally. Category/status/equipment are language-independent codes. Unknown document/record metadata is retained when changing existing records; no cloud, meter, owner settlement or remote identity data is introduced.

Expenses: `date`, `category`, `amountCents`, `currency`, optional `workId`.
Works: `scheduledDate`, optional `completedDate`, `provider`, `estimatedCents`, `actualCents`, `currency`, `status`.
Reviews: `equipment`, optional `lastDate`, `nextDate`.

Apartment references are not deleted when an apartment is deleted elsewhere. Records remain visible with “Apartment unavailable”; an ordinary record can be reassigned to an existing apartment. The module does not change apartment deletion behavior. No invented apartment/name snapshot or demo records are stored.

## Cost conversion / duplicate prevention

Only an explicitly completed work with completion date and specified actual cost can create an expense. Conversion copies actual cost, original currency, apartment, completion date, description and notes and links `workId`. Work and expense are committed in one local document. A unique link validation plus mutation check prevents repeated conversion. Work costs are never summed independently into expense totals.

Generated expenses cannot be edited independently. Their amount/currency/apartment cannot drift from the work. Delete the generated expense, edit the work if necessary, then explicitly generate again. A linked work cannot be deleted while its expense exists. Deleting the expense removes its amount from totals; the original work remains. Zero is a valid specified actual cost and can be converted. Estimated cost is never silently used as actual cost.

## Filters / due dates

Apartment filter applies to all three lists; category applies only to expenses. Inclusive period filters apply to expense date, scheduled work date, or next inspection date respectively, as stated in each screen. Expenses/work are newest first; inspections are due-date ascending. Expense totals include only filtered expenses, independently by currency; no exchange/conversion. Work costs are informational until converted.

Inspections due before today are overdue; today through 30 days ahead are upcoming. These reminders use the device's local calendar date, are recalculated when the screen renders/resumes, and do not claim trusted server time. No push, background scheduler or automatic recurrence/history generation.

## Retention and scope

All records remain local/offline on access expiry. Every mutation rechecks the existing entitlement. BASIC cannot mutate or inspect the PREMIUM module, but data is not erased. No dependency, native permission, Android version, signing or backend change. Local storage is not a cloud backup; uninstalling/clearing app data removes it. A business-data-only export does not include this separate key; no new backup/import feature is implemented in this stage.

Automated checks: `node --test tests/maintenance.test.js tests/i18n.test.js`; `npx playwright test checks/maintenance.spec.mjs`. Browser profiles cover 344/360/430/840/1024 px, offline bundled-file routing, CRUD, conversion, failure retention, entitlement expiry, RO/EN and reload persistence. Native Android/Fold installation and process restart remain device checks for a separately approved APK; none is built here.

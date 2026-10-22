# Booking editor paths and manual dates

## Diagnostic findings

The app has one in-memory state loaded by `createLocalRepository` from
`apartment-booking-manager:v1`. Calendar edits used that state and the common
`open('booking', booking)` / `renderBookingFields` editor. No separate apartment
booking store or alternative booking form was found. Payment history comes
from the selected booking, with changes persisted by the same repository.

Before this change, the Apartments screen opened apartment metadata only
(name/address/city), not an existing reservation. It had no reservation-opening
path to compare with Calendar. It now exposes each apartment's actual existing
reservations in a collapsed list. Both paths resolve the current booking by ID
and use the same editor. No migration, copying of booking records or financial
change is involved. BASIC overflow records still open read-only.

The full record (including optional fields, currency, payments and unknown
metadata) was verified through both paths, saving from both paths, offline
navigation and reload. No loss or divergent values reproduced through navigation in one app
instance. This does not establish the precise cause seen on the user's Android.

Two separate local HTML paths were tested in one offline Chromium browser
context. In that environment they SHARED the same business storage and the
original data remained intact. File paths alone therefore do not prove storage
isolation. Different browser profiles/apps/origins and Android file-provider
wrappers can have different storage scopes. The installed Capacitor app and an
external HTML preview are separate environments. No automatic transfer/reset
between such environments is introduced. A real stale-state issue WAS reproduced across two open pages sharing storage:
a page kept showing the old phone number after the other page changed the saved
booking. Opening an existing record and switching sections now refresh the
validated saved state; the record is resolved by ID again. A save from a form
whose original state changed externally is rejected without overwriting either
stored data or the draft; the user is told to close/reopen it. This does not merge
or synchronize independent storage scopes. Android's actual opening method and
file/version would still be needed to establish the exact device-specific cause.

## Manual dates

Check-in, check-out and payment date accept exactly DDMMYYYY, DD/MM/YYYY,
DD.MM.YYYY or DD-MM-YYYY (with optional surrounding whitespace). Both separators
must match. Complete valid input automatically becomes DD/MM/YYYY; incomplete
or invalid text remains available for correction. Calendar validation uses the
existing day parser, including leap days; year zero is rejected. Stored dates
remain ISO YYYY-MM-DD. Night counts, ordering, overlaps and existing payment
validation remain authoritative. No financial calculations or exports change.

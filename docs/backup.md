# Local complete backup and restore — format 1

Menu → Backup & Restore is available in BASIC and PREMIUM, offline. It is a data
transfer feature, not an entitlement transfer. No cloud, network endpoint, sync,
purchase, authentication or billing behavior is introduced.

## File and scope

One UTF-8 `.abmbackup.json` file, without an application-imposed total size ceiling, with
`{format:"apartment-booking-manager-backup",version:1,createdAt,data}`. Data contains:

- business version 1: apartments, their one main photo reference, reservations,
  optional metadata, actual integer financial values, currencies, detailed payment
  histories and legacy payment aggregates;
- maintenance version 1: expenses, works, inspections, including linked work costs;
- maintenance drafts version 1, including raw incomplete text and original edit
  snapshots (drafts are not turned into saved records);
- language and intro-dismissal presentation preferences;
- referenced JPEG photos, as base64 within this same file (up to 512 KiB each).

Explicit field allowlists cover the current app schema. Runtime tokens, Firebase
accounts, Android Keystore entries, trial records, signed access proofs, OWNER or
GIFT configuration, licensing keys and arbitrary localStorage keys are never
exported, imported, removed or replaced. The recovery journal is not exported.
Unknown input schema fields are rejected on import. Future business fields need
an explicit backup format update; they are not blindly serialized as credentials.
Unreferenced image Blobs are not user photo records and are not included.

Money, original currencies and dates are preserved, not converted/recalculated.
The existing reservation, payment, maintenance and draft validators are reused.
IDs, booking/apartment relations, unique work-expense links, photo references,
base64 byte sizes, JPEG dimensions and actual browser decoding are validated
before a candidate is offered for confirmation. Maintenance records referencing
an apartment deleted earlier remain retained as “Apartment unavailable”, per the
existing soft-reference behavior. Stale draft targets remain drafts and cannot
silently overwrite current records. RON/EUR and missing versus zero stay distinct.
The existing demo-cleanup migration is marked complete on restored data to avoid
mistaking restored user records for an original demo.

## Native/browser transport

Android backup now uses chunked `BookingBackup` transport. The old 24-MiB
ceiling came from a full byte-array/base64 transfer through `BookingFileExport`,
its 32-MiB encoded payload allowance, and whole-file allocation in the old import
reader. Backups no longer use that report transport. PDF/XLSX export is untouched
and keeps its existing independent limits.

Save: ACTION_CREATE_DOCUMENT → native output handle → sequential `appendExport`
calls (48-KiB decoded chunks) → flush/close. The declared snapshot byte count must
match the actual written count; incomplete finishes fail and delete only the
newly created document. Import: ACTION_OPEN_DOCUMENT → streaming 64-KiB copy to
private cache under the temporary URI grant → opaque handle → 48-KiB reads →
close/delete private cache. Cache leftovers after process death are removed on
plugin load. No user URI/path is accepted from JS, no broad storage permission,
no cloud dependency or new runtime package is introduced.

The native copy checks actual cache capacity while writing. The destination's
capacity is checked with fstatvfs when the provider exposes a regular filesystem;
remote/pipe providers may not expose free space. Their write/quota errors remain
explicit, including ENOSPC/EDQUOT. No fixed total-file cap replaces 24 MiB.

JSON format 1 is retained: older generated files and newly streamed files use
the same schema and validators. JPEGs are already compressed. A ZIP layer was
not needed to remove the memory/bridge bottleneck and would add a second reader
format; no archive/dependency rewrite is introduced. Each photo is emitted and
parsed individually. Metadata remains bounded by the actual app's storage and
available memory; an entire photo collection's base64 is never retained in the
candidate document. Imported photo bytes are staged in a dedicated transient
IndexedDB database, and validation/restore holds only descriptors and readers.
Raw source files may still need provider connectivity if chosen from a cloud
provider. Local files and all app processing remain offline.

Desktop uses the existing Blob download pattern. A browser without a streaming
save API may need memory for its final download Blob. It has no new app-defined
file size cap, but is subject to browser memory limits. File input uses
File.stream(), not whole-file arrayBuffer(). Android export avoids that aggregate
Blob path entirely. The compatibility `createBackup()` helper can still collect
bytes for tests/in-memory callers; the Android UI uses `chunks()` instead.

## Coordinated replacement / recovery

After validation and explicit confirmation, photos are copied from transient staging
into permanent IndexedDB under fresh random IDs; imported apartment
references are remapped consistently. Existing photos are not overwritten or
deleted. Staging failures remove newly staged images when possible, without
changing any old reference. Interrupted staging may leave unreferenced Blobs;
exports ignore them. Keeping old Blobs and preparing the import requires extra free local storage and
avoids invalidating old open views. No garbage-collection feature is added here.

Restore obtains an origin-scoped Web Lock. Unsupported browser engines reject
restore explicitly rather than falling back to an unsafe path. All five managed
localStorage values are captured and checked again after photo staging. Before
replacement, a versioned journal stores the complete previous values and a
`prepared` marker. Existing business/maintenance/draft repositories reject reads
or writes while this marker is prepared. After every managed key is written,
a `committed` marker is written. The next app load awaits the same lock and
recovers a prepared journal, or finishes committed cleanup, before reading user
data. A mid-write failure immediately rolls back the complete old snapshot.
If rollback also fails, the journal is retained, reads stay blocked, and the UI
requests freeing space and restarting, without clearing app data.

No cross-store transaction is claimed between localStorage and IndexedDB. Safety
comes from immutable photo staging plus recoverable journaled key replacement.
Web Locks serialize restore/recovery operations, and repository guards plus
snapshot comparison protect normal app writes. Transient import staging is cleared on cancellation/disposal. A shared Web Lock
protects active candidates; app startup removes abandoned staging only when no
active candidate holds that lock. Origin storage estimates check calculated
photo/metadata/journal requirements before permanent writes. The real Web Storage
quota for record metadata still applies; a large photo file is not the same as
large localStorage metadata. Quota failures use the existing rollback/recovery.

Avoid editing in other browser
windows during replacement: this is not a general multi-process database lock
for truly simultaneous synchronous localStorage writes. A native Android app
normally uses one app instance.

The confirmation screen shows creation time and record/photo/draft counts. The
user must explicitly accept replacement. It never merges datasets. After success,
the app must reload to discard old in-memory screen snapshots; closing/back from
the dialog after success also reloads. Cancel/back is blocked during an operation.
BASIC limits and server-verified access are unchanged after restoring data.

## Verification / limits

Tests cover full transfer to a separate browser context, JPEGs, Romanian text,
consecutive mixed-currency stays, payments/legacy values, drafts, invalid files,
missing photos, quota/preflight failures, interrupted rollback/recovery, BASIC
access retention, native transport mocks, menu translations and 344–840 px widths.
Large test: over 50 MiB, 100 apartments/photos, chunked native-bridge export,
progressive import, disk-backed staging and full restoration. A JVM native reader
copies 64 MiB, and the real plugin against API doubles imports/exports 60 MiB and
checks cache/destination ENOSPC and incomplete output cleanup. Stream tests cover
legacy JSON, arbitrary byte/UTF-8 boundaries, truncation, duplicate envelopes and
cache/staging cleanup. These are automated tests, not physical Android SAF or
launcher installation tests. No APK is built in this stage.

Remaining constraints are actual free storage, browser memory (especially desktop
Blob downloads and individual metadata values), Web Storage/IndexedDB quota and
filesystem/provider limits. They are not an arbitrary backup-file ceiling. Keep
the app open during large transfers; an abruptly killed export may leave an
incomplete destination file that validation will reject. Backups contain business
data and are not encrypted; choose a private location. Authentication, entitlements
and private keys are never included.

## Approved AB launcher icon

`design/ab-icon.svg` and the 512-px PNG preview trace the approved attached
“Monogramă AB” reference: white interlocked serif letterforms on uniform #112C37.
No blue/turquoise accent, gradient, house, caption, variant number or white frame
is included. The paths are embedded, not dependent on a device font. Adaptive
foreground content is inside the safe area, with the preview/legacy assets
matching the final 72-dp masked field. Standard/round density PNGs, transparent
foregrounds, vector foreground/background, v26 adaptive and v33 monochrome
resources are regenerated by `scripts/generate-ab-icons.py` (developer Pillow
only). Package ID, app name, Android version and signing are unchanged. Real
Samsung One UI masking remains an on-device check for a later approved APK.

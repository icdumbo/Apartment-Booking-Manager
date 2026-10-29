# Local complete backup and restore — format 1

Menu → Backup & Restore is available in BASIC and PREMIUM, offline. It is a data
transfer feature, not an entitlement transfer. No cloud, network endpoint, sync,
purchase, authentication or billing behavior is introduced.

## File and scope

One UTF-8 `.abmbackup.json` file, at most 24 MiB, with
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

Android save reuses `BookingFileExport` and ACTION_CREATE_DOCUMENT, extending only
its MIME/filename allowlist for `application/json` + `.abmbackup.json`. Existing
PDF/XLSX behavior is unchanged. Native import uses the new `BookingBackup` plugin:
ACTION_OPEN_DOCUMENT, one user-selected `content://` URI, temporary read grant,
ContentResolver stream on the plugin executor, actual 24-MiB bound, Data/ClipData
handling and generic errors without URI/credential logging. No broad storage
permission, external server, persisted source URI or dependency is added.

Desktop uses the existing Blob download mechanism and a normal file input.
Cancellation and errors are explicit. File generation does not count as a
confirmed Android save: only the native save result does. Source selection from
a cloud provider may require that provider's connectivity; a genuinely local
backup and all restoration processing work offline.

## Coordinated replacement / recovery

Photos are first staged in IndexedDB under fresh random IDs; imported apartment
references are remapped consistently. Existing photos are not overwritten or
deleted. Staging failures remove newly staged images when possible, without
changing any old reference. Interrupted staging may leave unreferenced Blobs;
exports ignore them. Keeping old Blobs requires extra free local storage and
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
snapshot comparison protect normal app writes. Avoid editing in other browser
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
missing photos, write/quota failures, interrupted rollback/recovery, BASIC access
retention, native transport mocks, menu translations and 344–840 px widths.
`tests/backup-resources.test.js` checks density/adaptive icon resources and runs
the native bounded reader on a JVM. These tests are not physical Android SAF or
Android adaptive-icon installation tests; a separately approved APK must confirm
those on Fold. No APK is built in this stage. Files over 24 MiB fail explicitly;
no partial backup is generated. Backup files contain the user's business data,
so choose a private location; there is no backup encryption in format 1.

## Original AB launcher icon

`design/ab-icon.svg` and its 512-px PNG preview contain original geometric paths,
white AB on #14243A with #2478EB accent, without an external typeface/logo.
`scripts/generate-ab-icons.py` regenerates legacy density PNGs (48–192 px),
transparent foregrounds (108–432 px), Android vector foreground, navy background,
adaptive v26 and monochrome v33 resources. Pillow is a developer-only generator
requirement, not an application dependency. Names, resource IDs, package ID,
Android version and signing configuration remain unchanged.

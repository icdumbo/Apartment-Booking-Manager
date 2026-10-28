# Local apartment main photo

The existing apartment editor and BASIC/PREMIUM mutation guards are reused.
Choosing, replacing or removing a photo is a draft until **Save**; cancelling the
picker or the editor preserves the saved photo. No account or internet is needed
for this feature. BASIC can manage photos for its administrable apartments;
existing overflow apartments remain consultable/read-only under the same policy.

- Desktop/browser keeps the existing file input. Android now uses the local
  `BookingPhoto` Capacitor plugin, registered in MainActivity, with
  `ACTION_GET_CONTENT`, `image/*`, `CATEGORY_OPENABLE`, single selection and a
  temporary read grant. This retains the system Google Photos / Browse chooser.
  No dependency, manifest/storage permission or capture mode is added.
- Input images are decoded locally, respecting orientation, then resized to at
  most 1280 px on the long edge and encoded as JPEG (white transparency background).
  The source file in the phone gallery is never changed. The stored image is a
  display copy, not a full-resolution archive. Limits: 20 MiB input, 64 MP decoded,
  512 KiB stored. HEIC/HEIF/AVIF decoding depends on the device/WebView; unsupported
  images produce a translated error and retain the saved photo.
- IndexedDB `apartment-booking-manager:photos`, version 1, store `photos`, holds
  JPEG Blobs under immutable random IDs. The existing apartment has only an
  optional `photoId`. No migration, booking changes or base64 image payload is
  added to business localStorage. Old apartments without that field keep their
  default home icon and translated placeholder.
- An image Blob transaction completes before the apartment reference is saved
  through the existing repository. A failed Blob write leaves the apartment
  untouched. A failed business save retains the old reference/Blob and removes
  the unreferenced candidate. Replacement/removal cleans up the old Blob only
  after a successful business save. Cleanup failures may leave an unreferenced
  Blob but cannot delete the currently referenced saved photo.
- Display uses temporary in-memory object URLs derived from the stored Blob;
  these are revoked when views are replaced/closed. They are never persisted.
  Photos load again from IndexedDB after reopening the application offline.
- Like all local data, photos belong to this installation/browser origin.
  Clearing app/site data or uninstalling removes them. There is no cloud sync or
  photo backup. Copying only the localStorage JSON does not transfer image Blobs.

The apartment-only heading uses a two-row grid: title and 44 px close button at
top right, language selector on its own row. Shared booking form layout is not
changed.

Automated checks cover BASIC/TRIAL photo CRUD, draft/picker cancellation, invalid
images, failed image and metadata writes, unchanged bookings, overflow guards,
RO/EN and 344/360/430/840 px layouts. A persistent Chromium profile is closed and
reopened in a new browser process offline (packaged-asset requests supplied from
local files), verifying the same Blob and business records survive. This is not
a real Android gallery-picker or physical-device restart test. Those require an
approved future APK; no APK is built in this stage.

## Android Browse fix

The previous HTML input delegated returned URIs to Capacitor/WebView. Its JS
handler silently returned when `input.files[0]` was absent, so missing native
handoff was indistinguishable from cancellation. There was no app-controlled URI
read/error callback. Provider MIME was also trusted before reading image bytes,
rejecting valid images with blank/generic MIME. These are demonstrated code gaps;
the exact provider/WebView reason for the observed Fold result cannot be proven
without device logs. No claim is made that a specific permission was missing.

Android now reads the exact picker-returned `content://` URI through
`ContentResolver.openInputStream` in the native callback (off the UI thread).
Data URI and a single ClipData item are supported; invalid/missing/multiple
results are errors. No URI or filesystem path is accepted from JS, resolved via
`_data`, exposed to WebView, persisted or logged. Only the bytes of the selected
photo are transferred in bounded base64, then passed to the existing local image
preparation and IndexedDB save flow. No persistable grant is needed: the bytes
are copied while temporary access is valid. The source is never written/deleted.
A new grant/selection is needed if the Android process is killed during picking.

The reader counts actual streamed bytes (metadata may omit or misstate size),
rejects empty/unreadable/over-20-MiB streams and closes them on success/error.
The JS adapter independently checks encoded/decoded size. Image format is
recognized from signatures, not an extension or declared MIME; actual decoding,
64-MP bound, 1280-px resize and 512-KiB JPEG persistence remain in the existing
pipeline. Corrupt/unsupported images (including SVG) are rejected. Files must be
openable images; virtual documents without a binary image stream are not supported.

Cancellation retains the existing photo and is distinct from errors. Launch,
permission/read failures, missing native adapter and malformed results produce
translated messages; there is no silent fallback to the failing Android file-input
handoff. Pending selection disables duplicate requests and Save. No photo is
persisted until Save. The X button, language selector, layout, access policy,
maintenance module and other business features are unchanged.

Additional checks: `node --test tests/photo-picker.test.js
 tests/photo-picker-native.test.js tests/i18n.test.js` (single line) and
`npx playwright test checks/photo-picker.spec.mjs checks/apartment-photo.spec.mjs`.
The Java stream reader runs on a JVM. The real plugin is compiled/exercised
against minimal Android/Capacitor API doubles; this verifies callback branches,
not Android runtime compatibility. Browser tests mock the native bridge and cover
real image decoding, CRUD, failures, RO/EN and preservation. They do not prove
actual Google Photos/Browse behavior on Fold. No Android APK or deployment is
created in this stage; a separately approved APK must be tested on device with
Camera, Download, WhatsApp Images, Pictures and Google Photos, including
cancellation, reselection, unavailable provider, and restart after Save.

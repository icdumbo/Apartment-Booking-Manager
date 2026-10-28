# Local apartment main photo

The existing apartment editor and BASIC/PREMIUM mutation guards are reused.
Choosing, replacing or removing a photo is a draft until **Save**; cancelling the
picker or the editor preserves the saved photo. No account or internet is needed
for this feature. BASIC can manage photos for its administrable apartments;
existing overflow apartments remain consultable/read-only under the same policy.

- A browser file input opens the platform image picker, without capture mode,
  new plugins, broad storage permissions, external links or upload services.
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

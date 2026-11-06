# Android 1.0.26 stability corrections

Only client verification request coalescing and local photo lifecycle change. Backend, commercial rules, UI, backup schema and Android metadata are unchanged.

- A verification is shared only within the same Firebase UID and session generation. Completion of an old request cannot clear the current request or grant stale rights. Native signed-proof checks remain authoritative.
- Restore compares the full JPEG bytes with the current photo for the same apartment and reuses identical images. Rollback deletes only newly staged images, never reused originals.
- After journal recovery, startup collects unreferenced permanent images only under an exclusive, non-blocking Web Lock. Every running app view and backup operation holds a shared photo-use lease; active views therefore defer collection. Invalid or missing business state, an unresolved journal, changed references, or missing Web Locks prevent collection. No business records are rewritten by cleanup.

Regression coverage: stale account/session completions, repeated restore, changed photos, rollback and recovery, invalid state/journals, changed references, concurrent sessions, and real browser IndexedDB/Web Locks. Unit fixtures contain only fictional records. A physical-device check requires a later approved APK; none is built here.

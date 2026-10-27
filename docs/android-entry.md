# Android welcome, Google login and visual contrast

The welcome/login UI wraps the existing native Google/Firebase sign-in. It does
not implement another identity provider, grant access, start a trial or purchase,
or change the Worker, verifier, native plugin, signing configuration or backend.

- New Android users with no data, restored account or dismissed introduction see
  the welcome screen after native session initialization.
- Get started / Continue without an account enters the existing offline BASIC
  workspace. The three-apartment policy remains in the access service.
- Existing apartments/bookings or a restored Google session bypass introduction.
- `apartment-booking-manager:welcome:v1` is only a dismissed-introduction
  preference. It never authenticates a user or authorizes PREMIUM. If writing the
  preference fails, BASIC can still be entered. Clearing it only affects the UI.
- Google sign-in delegates to `androidAuth.signIn()`; existing listeners refresh
  server verification. Login errors/cancellation leave the BASIC exit available.
- Trial activation remains the existing separate, consent-based action. Login
  never invokes it. `NEW_TRIALS_ENABLED` is unchanged.
- Existing legacy trial starts are retained. Existing anti-rollback `lastSeen`
  bookkeeping continues independently of the introduction preference.
- A normal browser keeps its existing immediate workspace. Preview tests mock
  only the native UI boundary; they do not constitute real Android/Firebase login.

## Presentation asset

`src/assets/welcome-seaside.jpg` is an AI-generated promotional interior image,
created with the built-in imagegen tool from the supplied seaside-interior visual
reference. Prompt: clean portrait architectural photograph of a bright cream
seaside apartment, neutral sofa, round black coffee tables, light wood, balcony,
blue sea, daylight; no text, logo, UI, phone frame, people or watermark.
It is bundled locally, never attached to a user's apartment record. JPEG encoding
keeps the asset small; the standalone HTML preview embeds the same image.

## Contrast checks

Important text uses `#14243A`, secondary text `#435770`; white button labels use
`#1c67d2` (approximately 5.36:1). The accent/chart blue remains `#2478EB`.
The welcome brand sits on an 85% white veil and the login card on a near-opaque
white surface rather than relying on contrast against individual photo pixels.
Playwright checks representative computed text/background pairs at >= 4.5:1
in RO/EN, including reservation shades and form fields. This is not a claim of
complete WCAG certification or physical-device validation. Disabled controls,
logos and decorative graphics are not covered by the ordinary-text check.

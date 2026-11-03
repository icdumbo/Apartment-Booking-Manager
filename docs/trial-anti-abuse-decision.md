# Trial anti-abuse decision — no new tracking or enrolment activated

## Verified limitation and safe current behavior

The commercial rule remains one voluntary 15-day PREMIUM trial per eligible
account. A Firebase UID is not a permanent Google account identity. Deleting and
recreating Firebase identity may change the UID. Once all recognisable evidence
is erased, the backend cannot reliably distinguish a new eligible account from
one that already used a trial. A boolean with no link to an identity cannot solve
this. Keeping an identity-linked boolean is still personal-data processing.

The safe current choice is to keep new enrolment disabled. Migration 0005's
database guard remains in place; setting NEW_TRIALS_ENABLED=true alone cannot
grant a fresh trial after history cleanup. Existing trials keep the original
15-day deadline. No permanent abuse-prevention guarantee is claimed.

## Implemented safe change

The backfill cursor stored a Firebase UID. Although enrollment_locked is a
non-identifying global bit, the whole control row was NOT non-personal while
backfill_after contained a UID. Migration 0006 and the bounded cleaner now clear
the completed cursor and retain only a completion bit. Completed backfills no
longer scan or rewrite their cursor; new records still get classification via the
existing trigger. Old completed cursors are cleared on migration. No eligibility,
provider ID, HMAC, email, device ID, IP or new user-linked marker is collected.

## Options requiring an explicit decision before further implementation

| Option | Protection | Decision required |
| --- | --- | --- |
| Keep new enrolment disabled | No repeat or fresh trial is issued; current access/data remain intact | Safe default now; this is not a usable public trial launch |
| Limited-lived minimal Google-account marker, at most six months | Can link the same verified Google account across Firebase UID recreation during retention; cannot enforce one trial forever after erasure | Approve purpose/legal basis, necessity/balancing assessment, disclosures, account-erasure exceptions and exact retention; also decide what eligibility means after erasure |
| Separately justified longer-lived minimal marker | Could enforce the one-trial rule while the marker remains recognisable; different Google accounts and loss/rotation of the linking secret remain limitations | Explicit independent retention policy, documented necessity and periodic review; no indefinite retention is approved here |

Suggested technical design ONLY if approved: derive a domain-separated HMAC on
the server from the stable Google provider identifier in verified authentication,
using a dedicated server secret. Store only the keyed digest, necessary key
version and approved expiry; row existence can represent “used”. No raw provider
ID, email, Firebase UID, IP, device identifier or fingerprint is needed in this
separate marker table. Do not use plain email/UID hashes as permanent identity.

Use an indexed unique digest and atomic reservation with trial creation to handle
concurrency. Use indexed expiry and small purge batches, not a table scan. Include
secret rotation/loss and restoration in the design so they cannot silently reset
eligibility. Measure HMAC/authentication CPU and account-wide D1 use on Free before
activation. This is a proposal: there is no new table, secret, endpoint or token
claim processing implementing it in this commit.

## GDPR constraints — assessment, not legal approval

Pseudonymisation reduces linkability; it does not automatically anonymise data.
Fraud prevention may support a legitimate interest, but necessity, proportionality,
the balancing of rights, transparency and storage limitation still require a
documented assessment. “Only one bit” or “hashed” is not a retention exemption.
No new legal basis or longer retention is selected by this implementation.

Sources checked 3 November 2026:
- https://www.edpb.europa.eu/topics/ai-and-technology/anonymisation-pseudonymisation_en
- https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/legal-grounds-processing-data_en
- https://www.dataprotection.ie/en/faqs/responsibilities-data-controllers/how-long-should-personal-data-be-held-meet-obligations-imposed-gdpr

## Remains off and unchanged

No remote migrations, Cron, Cloudflare/Firebase changes, trial enrolment, account
deletion or Android builds are performed. Local apartments, reservations, receipts,
photos and backup formats, PREMIUM licenses, Play purchases and OWNER are unchanged.
Activating the public trial safely remains BLOCKED pending the decision above,
backend configuration verification and controlled end-to-end tests.

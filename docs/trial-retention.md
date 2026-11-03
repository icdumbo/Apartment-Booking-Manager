# Six-calendar-month trial history retention — prepared, NOT activated

Scope: migration `0005_trial_retention.sql`, module `backend/trial-retention.js`.
No local data, backups, purchase rows, licenses, OWNER configuration or Firebase
identities are changed. The existing 15-day access duration is unchanged.

## Deadline and legacy records

- The deadline is six calendar months **from trial start**, in UTC, preserving the
  original time and milliseconds. Clamp to the target month's last day (August
  31 -> February 28/29). This is not 180 days or six months after trial expiry.
- Used records with a representable server start derive their deadline from it.
  Undated blocked records and unrepresentable dates get deadline zero: eligible
  for prompt bounded removal, never a fabricated new retention window.
- The migration does not bulk rewrite/delete existing trial history. A keyset
  cursor classifies up to 25 legacy rows per invocation. New rows are classified
  atomically by a trigger, including IDs behind the cursor. Clean the legacy backlog
  in reviewed controlled runs before claiming the policy is operational.
- Trial updates remain prohibited. DELETE is allowed only for classified, due
  rows, checked again against database time; associated retention metadata is
  removed in the same transaction. Unexpired trials cannot be prematurely erased.

## Anti-abuse: explicit fail-closed tradeoff

Purging a UID record must not grant that UID (or a recreated account) another trial.
The migration adds a NON-PERSONAL singleton admission lock and a server-side INSERT
guard. **New trial enrolment is suspended for everyone after this migration**, even
if the old environment flag is mistakenly turned on. Existing trial records can
still resolve without extending their original deadline. The current production
configuration already has `NEW_TRIALS_ENABLED=false`; nothing is changed remotely.

Do not remove this guard merely to make enrolment work. Restoring new enrolment
requires a separately approved eligibility design/migration. A proportionate option
for evaluation is a server-keyed HMAC of a verified, stable Google provider ID,
stored only for an independently justified limited period. It remains personal,
pseudonymous data; deleting it after six months cannot enforce a lifetime ban.
No such identity collection, retention exception or new trial rule is implemented
here. Permanent prevention of repeat trials is NOT promised.

## Free-plan budget and separation

Each invocation makes one D1 batch containing three bounded statements: classify
25, advance the primary-key cursor, delete at most 25 due trials via the covering
`trial_retention_due(retention_until,subject)` index. No full-table re-scan cursor
reset, Firebase lookup, OAuth, RSA signing or purchase revalidation is involved.
At most approximately 76 changed rows (25 classifications + 1 cursor + 25 trial
and 25 metadata deletions), excluding index maintenance. Actual billed row metrics
must be checked in staging; SQL planning and small batches do not prove <10 ms CPU.
For a proposed hourly schedule, the full-backlog estimate is 1,824 logical row
changes/day BEFORE index maintenance, plus query reads and any other applications
sharing the account quotas. Measure actual billed rows; this is not a cost cap.
No such schedule is activated.
Do not schedule continuously once per minute during a large backlog without a
separate daily write budget; the Free quota is account-wide, not per Worker.

When `TRIAL_RETENTION_ENABLED=true`, the scheduled handler runs retention ONLY.
It cannot fall through to account deletion, even when other deletion flags exist.
No Cron or new production variables are configured in the repository. Other
deletion controls remain disabled. Migration application is separate from enabling
cleanup: do not apply it without reviewing the enrolment lock and staging tests.

## Activation later, by explicit approval only

1. Review migration and resolve unknown-age legacy rows as described above. Check
   actual schema, backup strategy, backlog size and Free quotas before applying.
2. Apply migrations only in an approved test environment; run the bounded cleanup
   to completion for legacy history. Verify active trial boundaries, duplicate and
   recreated identities, all license/purchase rows and unchanged local backups.
3. Verify query plans/CPU/row costs. Estimate batches: at least ceil(legacy rows/25)
   for classification and ceil(due rows/25) for deletion (work can overlap).
4. After approval configure `TRIAL_RETENTION_ENABLED=true`,
   `TRIAL_RETENTION_BACKEND_VERIFIED=true`, `TRIAL_RETENTION_POLICY_APPROVED=true`
   and a scheduled trigger. These are intentionally absent/off now.
5. Choose schedule/capacity so that overdue rows do not accumulate. Monitor failed
   invocations and backlog; use an approved early purge margin if a physical
   maximum is required. A stopped Cron or service outage can delay physical purge.

Six months is the active-store deadline. D1 Time Travel (7 days on Free) or other
administrator backups may retain older copies. To promise six months INCLUDING
copies, approve an earlier active purge margin and matching backup policy, and
reapply deletion deadlines after restoring a database. No strict physical-erasure
SLA, backup deletion or live backend verification is claimed by these code tests.

Blocked account-deletion jobs and identity_policy have separate retention rules;
this module does not erase them or unblock those requests automatically. Their
continued UID retention must not be described as erased trial history everywhere.

Local test command (once after implementation):
`ABM_LOCAL_SQLITE=1 node --test --test-isolation=none backend/checks/trial-retention.check.mjs tests/secure-trial.test.js`
CI uses Miniflare/D1, without the local SQLite variable.

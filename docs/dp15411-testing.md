# DP-15411: Add TP Trainers UAT history and testing

Open `/console/conformance` while signed in. DP-15411 is the default view;
the previous workbook runner is available through Other workbook tests.

## Private history

Historical evidence is not distributed in this public repository. An admin imports
reviewed JSON through the ticket page. Diagnostics stay separate from functional
TS01 attempts and never count as conformance passes. Viewing history does not
require UAT credentials or a replacement synthetic identity.

Records live in `DATA_DIR/conformance/DP-15411/`, behind staff authentication.
Mount `DATA_DIR` persistently (Docker defaults to `/app/server/data`) and include
it in private backups. New attempts are recorded before requests are sent.
Reimporting the same evidence neither duplicates nor reruns a test. Downloads
preserve original JSON content, though whitespace may differ.

Import locally without API execution:

```powershell
node scripts/import-dp15411.cjs 'C:\private\conformance-archive'
```

Or package reports for one authenticated upload:

```powershell
node scripts/import-dp15411.cjs 'C:\private\conformance-archive' --bundle 'C:\private\dp15411-evidence.json'
```

The importer selects Add evidence from multi-ticket reports. Application details,
assigned UEN, timestamps, identities and responses come from private evidence.
Never commit reports, generated bundles or credentials, or put them in client/public.

## Hosted UAT configuration

Set through the host's secure runtime configuration, then restart:

- `UAT_CERT_FILE` / `UAT_KEY_FILE`: the confirmed matching UAT pair. Inline
  `UAT_CERT` / `UAT_KEY` are also supported.
- `UAT_ENCRYPTION_KEY_FILE` / `UAT_ENCRYPTION_KEY`: canonical base64 encoding
  of the 32-byte UAT key supplied by SWDA on 24 November, not the older portal key.
- `UAT_ENCRYPTION_KEY_SOURCE=swda-2026-11-24`: only after checking its source.
- `UAT_EXPECTED_CERT_SHA256`: the fingerprint confirmed by SWDA.
- Optional `UAT_API_BASE=https://uat-api.ssg-wsg.sg`; other values block readiness.

The page reports validity, matching, fingerprint and encryption readiness without
revealing credential values. Readiness does not establish remote entitlement.

## Next TS01

1. Obtain SWDA's unused synthetic identity and ID type for the assigned UEN.
2. Import original TS01 evidence to supply the complete workbook fixture.
3. An admin enters that identity, type and reply reference, and confirms Add-only
   scope with the returned trainer retained.
4. Review the request and use Run TS01 once on UAT.

Success requires HTTP 200, API status 200 and data.trainer.id. Structured 4xx
rejections are failures. Timeouts, unreadable responses, server failures and
success responses without an ID hold further Add attempts for reconciliation.
Repeated/concurrent submissions return the recorded attempt without another Add.
No automatic retry or cleanup occurs. Retain the ID for separately reviewed
Update/Delete work.

An admin may record SWDA's confirmed outcome and reply reference to clear a hold.
Running requests cannot be reconciled during their initial two-minute window.
The original response and state remain alongside the review.

## Verification

```powershell
node --test tests/conformance-ticket.test.cjs tests/uat-transport.test.cjs
npm run build
```

Tests use synthetic fixtures/credentials and never call SWDA. The isolated
loopback preview (`node scripts/preview-conformance.cjs`) exposes conformance
only, without the production SSG proxy. Use it solely on the local machine.

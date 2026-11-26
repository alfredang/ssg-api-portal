# General API and UAT workbench

Open `/console/conformance` while signed in. This replaces the specialised Add
screen and the direct workbook runner with one review-and-confirm flow.

## Two-button execution

1. Select an API/test or use **Load test data** on a historical attempt.
2. Review or edit the test fields. **1 · Load test data** prepares a private
   request snapshot and displays its URL, method, headers, complete payload,
   attachments, expected result, credential readiness and dependencies.
   This makes no external API call.
3. **2 · Confirm and run once** sends the reviewed snapshot once. Delete uses
   **2 · Confirm delete and run once**. The result is saved before another
   deliberate repeat can be prepared.

Known failed identities are warnings, not blanket repeat blocks. Exact repeats
preserve the source payload, including name and identity; no test markers are
silently regenerated. Edits invalidate the preview and require loading again.
Modified requests are labelled and each new attempt links to its source.

Confirmation is tied to the snapshot digest, operator, template revision and
credential version. Previews expire after thirty minutes. Repeated/concurrent
confirmation requests return the same saved attempt instead of repeating the API
call. The server records an attempt before sending and does not retry writes.

## Templates and future APIs

The reviewed starter JSON definitions are `server/api-test-templates.json`:

- Add (411 / TS01), with HTTP/API 200 and a returned trainer ID required.
- Retrieve access (412), a diagnostic independent of Add.
- Retrieve-created (TS02), Update (413 / TS03), Retrieve-updated (TS04),
  Delete (413 / TS05), and Verify-absence (TS06).

In **API templates**, admins can create, edit, open, review and download JSON.
Existing IDs require an incremented revision. Define a method, relative UAT path,
API version, credential profile, input fields, query fields, payload format,
encryption and declarative response checks. Requests support JSON, text, form
encoding and multipart attachments (four files, 5 MB combined). Photos inside
trainer JSON remain ordinary payload fields.

Checks support HTTP/API status and `equals`, `exists`, `nonempty`, and `array`
assertions on response paths. No uploaded JavaScript or arbitrary assertion code
is executed. Templates do not create API subscriptions or establish entitlement.
Mark a template as conformance only when its checks accurately reflect the
provider's official requirements and retain the reference in `source`.

The first implementation permits only `https://uat-api.ssg-wsg.sg`. Relative
paths and encoded path parameters cannot switch the request to production or
another host. Other providers/hosts and unfamiliar authentication schemes need
an explicitly implemented adapter and host policy. They are not automatically
enabled by uploading a template.

## Authentication and encryption

`uat-mtls` uses the confirmed `UAT_CERT[_FILE]`, `UAT_KEY[_FILE]` and
`UAT_EXPECTED_CERT_SHA256` configuration. Certificate dates, private-key match
and fingerprint are checked before execution.

Encrypted requests additionally need a canonical 32-byte base64
`UAT_ENCRYPTION_KEY[_FILE]` and a nonempty verified provenance label in
`UAT_ENCRYPTION_KEY_SOURCE`. For the present trainer cases this must identify
the UAT key supplied by SWDA on 24 November, not the older portal key.

GET does not send a body or require request-encryption configuration. Encrypted
responses can be decrypted when the correct AES key is available. If an encrypted
response cannot be decoded, the response checks do not establish a pass.

`uat-oauth` uses UAT-only `UAT_OAUTH_CLIENT_ID[_FILE]`,
`UAT_OAUTH_CLIENT_SECRET[_FILE]` and `UAT_OAUTH_TOKEN_URL`. The token URL must be
on the approved UAT host. Token fetching uses client credentials with Basic auth;
set `UAT_OAUTH_USE_MTLS=true` if the provider requires the certificate as well.
Access tokens are cached only in process memory and never included in evidence.
No production OAuth credentials are reused or used as an automatic fallback.

Keep credential values in secure hosting configuration. The workbench exposes
readiness and the certificate fingerprint, never private keys or client secrets.

## Dependencies and repeats

The six trainer cases form a guided sequence. Each requires a separate review
and confirmation; no automatic cleanup or cascading delete runs. Returned IDs
pass through selected successful attempts. Update and Delete accept only the
selected trainer created by this workflow, not an arbitrary retrieved trainer.
Imported success reports alone cannot authorise trainer mutation.

Verification searches use the assigned UEN and workflow trainer's exact name.
Creation/update checks match its ID and expected fields. Absence requires a
successful complete search or the workbook's structured Not Found response.

Uncertain writes hold other writes to that resource until an admin records the
provider-confirmed outcome and reference. Read-only tests remain independently
available. A running write cannot be reconciled in its initial two-minute window.
Waivers and their references can be recorded separately under History; they do
not establish subscription access or turn unexecuted cases into passes.

## Private history and workbooks

The eleven previously imported Add attempts remain in
`DATA_DIR/conformance/DP-15411` and are read without migration or alteration.
New attempts, draft snapshots, reviewed custom templates, notes and original
workbooks are stored under `DATA_DIR/conformance/workbench`. Mount DATA_DIR on
persistent storage for server-wide durability. Keep all reports and bundles out
of public git and `client/public`.

### Recovery without hosting-dashboard access

The workbench saves an encrypted recovery copy to IndexedDB in the signed-in
admin's browser. It contains original evidence, saved attempts, custom templates,
notes and original workbooks. The server encrypts/authenticates it with AES-GCM
using a key derived from the existing `SESSION_SECRET`; neither that secret nor
UAT credentials are placed in the browser backup. Keep SESSION_SECRET stable
across deployments. Backups are scoped to the account that created them.

When the server is missing saved records, the browser preserves its existing
copy and shows **Restore browser backup**. Restoration adds missing records,
keeps current server records and never calls SWDA or restores executable drafts.
Before confirmation, a recovery marker is saved in the browser. If the final
result is lost, restoring the marker holds further writes until the provider
confirms the outcome; it never assumes that a lost response means failure.

Use **Download encrypted backup** for a separate private copy. History accepts
both evidence files and encrypted backups, with a **Paste private evidence or
encrypted backup JSON** option when file selection is unavailable. Existing
original evidence remains usable if the server secret changes.

This is recovery for one browser profile, not shared database storage. Clearing
site data, private browsing, lost devices, unavailable browser storage or a
changed session secret can make the copy unavailable. Other devices need the
downloaded backup or original reports. Leave the workbench open after a run so
its completed result can be backed up; a lost connection may retain only the
conservative recovery marker. The UI reports backup errors and will not start a
new confirmed request if its recovery copy cannot be saved.

History supports ticket/type filters, source-attempt links, expanded request and
response details, assertion results and JSON evidence downloads. Diagnostics are
labelled separately from functional/conformance outcomes. A duplicate response
is not a passed Add test merely because the request completed.

**SWDA workbooks** imports a compatible `.xlsx` package as unreviewed draft
templates. The importer preserves original instructions and expected-result
text. Admins must review assigned inputs, API version, encryption, assertions
and dependencies before marking a template reviewed. The approved UAT host is
checked before importing requests. The original workbook stays private;
completed-workbook export fills results, Pass/Fail, operator and date while
preserving other workbook content. Required screenshots remain a separate task.

## Validation

```powershell
node --test tests/api-test-workbench.test.cjs tests/conformance-ticket.test.cjs tests/conformance.test.cjs tests/uat-transport.test.cjs
npm run build
```

Tests use synthetic data and mocked transport. Legacy direct-write routes return
409 and direct callers to the shared workbench. Legacy history/import/download
URLs remain supported. No SWDA email or live UAT request is needed to deploy or
verify previews and saved history.

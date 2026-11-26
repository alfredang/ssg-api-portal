# Configure UAT credentials in the portal

An admin opens **Conformance Tests > UAT Setup**, or **Open UAT Setup** from a
test's missing-credentials message. Members cannot view or change this setup.

1. Select the provider-confirmed UAT certificate PEM file.
2. Select its matching private-key PEM file.
3. Paste SWDA's UAT encryption key (canonical base64 decoding to 32 bytes).
4. Check the expected certificate SHA-256 fingerprint against the provider's
   confirmation. The current November UAT fingerprint is prefilled; a hosting
   `UAT_EXPECTED_CERT_SHA256` restriction remains authoritative when configured.
5. Select the SWDA reply date and confirm the key's source.
6. Click **Validate and save UAT credentials**. **Validate credentials** is also
   available to check the inputs without saving anything.
7. When the active profile shows **UAT credentials ready**, return to **Run a
   test**, load the data again, review it and separately confirm the API request.

The current trainer tests use the confirmed certificate dated 18 November 2026
and the encryption key supplied by SWDA on 24 November 2026. Older portal
encryption keys are not interchangeable with that supplied UAT key.

Validation checks PEM parsing, key matching, certificate dates, the expected
fingerprint, AES key encoding/length, the operator-confirmed key source, the UAT
destination policy and server encryption configuration. Validation and saving
never contact SWDA, create trainers or establish remote API entitlement. A test
can still fail its functional checks, including a duplicate-identity response.

## Storage and credential isolation

The complete saved UAT profile takes precedence over dedicated hosting UAT
settings. A partial or unreadable saved profile never falls back to production
credentials. Existing App 1–3 certificates, OAuth and mail settings are unchanged.
Without a saved profile, the original dedicated UAT environment/file settings
continue to work.

`DATA_DIR/uat-settings.enc` stores the profile encrypted with AES-256-GCM and an
independent key derived from the existing SESSION_SECRET. Writes are atomic;
the file has owner-only permissions on the production filesystem. The secret
must be explicitly configured with at least 32 characters; development/sample
placeholder secrets are refused.
A corrupt file or changed secret cannot silently overwrite an unreadable profile.
Preserve the original file and secret before repairing it.

Status and validation responses return metadata and checks only. They never
return certificates, private keys, AES keys or the server encryption secret.
Uploaded values are not logged or added to test evidence. The input fields are
cleared after saving; neither localStorage nor IndexedDB stores these credentials.
The encrypted profile retains a bounded metadata audit trail of profile changes.

The workbench's browser recovery archive does not include credentials. A full
encrypted portal-data backup includes the encrypted UAT settings file. If DATA_DIR
is not retained through deployment, recover that full backup or upload the UAT
credentials again. Keep SESSION_SECRET unchanged. No code push can by itself
make the host retain an unattached data folder.

Saving waits for an in-flight workbench request to finish. Every successful save
changes the private credential version, invalidating prepared test previews.
Existing request confirmation remains a separate action; saving never runs it.

## Endpoints

- `GET /api/admin/uat`: readiness, source, dates, expected/public fingerprint and
  saved-profile metadata only.
- `POST /api/admin/uat/validate`: JSON certificate, privateKey, encryptionKey,
  expectedFingerprint, keyReplyDate and sourceConfirmed; safe validation results.
- `POST /api/admin/uat`: validates the same fields again and saves an encrypted
  profile if every check passes. Unknown fields and simple form submissions are
  rejected. Production credential fields are not accepted.

All routes require an admin and return `Cache-Control: no-store`. A save can only
target the dedicated UAT settings file. There is no credential-reveal or arbitrary
file-write endpoint.

## Validation

`tests/uat-setup.test.cjs` uses synthetic certificates/keys and mocked networking
to cover local validation without saving, encrypted saves and metadata-only
responses, invalid-input preservation, dates, fingerprint restrictions, UAT-only
destinations, restart retention, transport use, unreadable profiles, preview
invalidation, backup isolation and authorization. No real credentials are used.

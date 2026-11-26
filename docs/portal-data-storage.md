# Preserve the existing portal data folder

All portal features use `server/data-directory.js` to resolve the same existing
`DATA_DIR`. Existing file names and locations are unchanged: `users.json`,
`defaults.json`, `settings.enc`, `leads.jsonl`, `audit.jsonl`, `cert-notes.json`,
course caches and `conformance/DP-15411` / `conformance/workbench`.
No database, cloud storage account or separate testing data folder is introduced.

## Current deployment limitation

Hosted test history disappeared during previous deployments. Browser recovery
restored the eleven attempts, but that is not evidence of persistent server
storage. The Dockerfile's `VOLUME` instruction alone does not make the deployment
reuse the same Docker volume. It can receive a new empty anonymous volume.

Do not push this change to main (which triggers deployment) until the current
server folder has been backed up and its original storage attachment identified.
Configuring the host attachment requires an authenticated server/Docker
connection and the existing deployment definition. A GitHub push alone cannot
reattach a host storage volume. The steps below use
ordinary Docker/server access and do not require the Coolify dashboard.

## Operator sequence

1. Identify the exact portal container and actual `DATA_DIR`. Read only that
   environment value; do not dump the full environment or share credentials.

   ```sh
   docker ps --format '{{.ID}}\t{{.Names}}\t{{.Image}}'
   docker exec "$PORTAL_CONTAINER" printenv DATA_DIR
   docker inspect --format '{{json .Mounts}}' "$PORTAL_CONTAINER"
   ```

   Set `PORTAL_CONTAINER` only after verifying its application identity. Match
   the inspected mount destination to the actual data path. Inspect any nested
   mounts covering the two conformance subfolders. If no mount covers DATA_DIR,
   the current container's writable layer is the source that must be preserved.

2. Make a private copy of the WHOLE existing folder before replacing anything.
   Use a restricted backup directory outside application source. For a consistent
   copy, pause portal writes or stop only this application for the final copy.
   With `PORTAL_DATA_PATH` set to the verified path and `PRIVATE_BACKUP` to the
   operator-owned backup directory:

   ```sh
   docker cp "${PORTAL_CONTAINER}:${PORTAL_DATA_PATH}/." "$PRIVATE_BACKUP/"
   ```

   Verify the copy contains users, defaults, encrypted settings, enquiries/audit
   and both test-history areas that exist in the source. Retain the original
   `SESSION_SECRET` through the existing credential configuration; it decrypts
   settings and recovery archives. Never put the backup or secret in GitHub.
   Preserve the original container/volume for rollback. Do not prune volumes.

3. Reuse the existing data volume or existing host-folder bind mount. The actual
   deployment definition must attach the SAME source to the SAME DATA_DIR on
   every deployment. `deploy/compose.storage.example.yml` is an external-volume
   fragment: adapt its `portal` service name to the real service and merge it
   into the existing deployment. It deliberately does not create a new volume.
   Keep all image, reverse-proxy labels, network, ports, certificate mounts,
   runtime secrets and the single-instance deployment unchanged.

   If the data currently lives only in the container layer, populate a permanent
   host storage location from the verified backup before attaching it. Do not
   mount an empty directory over the only existing copy. A bind mount should
   reuse its existing host path rather than the external-volume fragment.

4. Deploy the code after the backup and attachment are in place. In Console >
   Settings > Server data storage, check the path, write access and inventory.
   A fresh baseline is marked **Retention not verified**. Existing users,
   settings, defaults and eleven saved attempts must be present before continuing.

5. Record the storage ID from the admin status endpoint or operator CLI and
   optionally configure `PORTAL_DATA_ID` with that non-secret ID. This prevents
   startup against a different/empty data folder, including silent reseeding of
   users. It must identify the current existing folder, not a new random ID.

6. Save a harmless default and a private full-folder backup. Record history
   count and a sample evidence identifier, then perform a controlled later app
   update while retaining the same storage source. Verify users, defaults,
   settings and evidence after it, including in a second signed-in browser.
   Do not run SWDA APIs or send mail to test storage. If data is missing, stop
   further writes and reattach the original source or use the verified backup.

## Verification semantics

Startup keeps one storage identity and probes in DATA_DIR and both conformance
folders. Writable storage alone is unverified. Surviving a new process verifies
restart retention. Surviving a changed server/client build verifies retention
across an app update. Missing probes clear verification and keep browser recovery
required. Mount detection is informational; an anonymous mount can still be lost.
These probes are not a substitute for checking the actual retained records.

The workbench makes browser recovery optional only after server retention has
been verified. Browser errors then do not prevent a confirmed test. Browser
backups remain an additional recovery copy; they cover the workbench, not users
or saved mail settings. The Settings page's portal backup covers the full folder.

## Backup and offline recovery tools

Admin-only, uncached routes:

- `GET /api/admin/storage`: path, file counts/sizes and verification status;
  no file contents or credential values.
- `POST /api/admin/storage/verification`: prepare fresh probes using the same
  storage identity; it does not deploy, run tests or contact SWDA.
- `POST /api/admin/storage/backup`: download an AES-GCM encrypted folder archive.

The operator CLI uses existing DATA_DIR and SESSION_SECRET configuration:

```sh
node scripts/portal-data.cjs status
node scripts/portal-data.cjs backup /private/location/portal-backup.json
node scripts/portal-data.cjs restore /private/location/portal-backup.json /private/location/empty-staging
```

Restore verifies the archive before writing, refuses the live data folder and
nonempty targets, and never overwrites an existing file. It preserves the
storage identity but resets verification claims. Inspect the staging copy and
its ownership/permissions before attaching it while the application is stopped.
Keep the current source for rollback. There is no live browser restore endpoint
that replaces users or settings.

Saved request previews from before a whole-folder recovery cannot execute;
load and review a new preview. Pending write holds remain in the restored data.
Before any further live write, reconcile UAT activity that occurred after the
backup timestamp with the provider and the newest private workbench evidence.

Downloadable archives have a 6 MiB serialized payload limit. Larger folders need
an offline filesystem/volume snapshot. Hidden verification files and temporary
writes are excluded; symbolic links are refused. Backups are rejected if files
change during capture. Changed secrets and tampered archives fail verification.
Hosting environment credentials and certificate mounts outside DATA_DIR remain
under their existing hosting configuration and are not included.

Unreadable user lists or undecryptable settings now fail without replacing the
original files with seeded users or empty settings.

## Validation

```sh
node --test tests/portal-storage.test.cjs tests/api-test-workbench.test.cjs tests/conformance-ticket.test.cjs tests/conformance.test.cjs tests/uat-transport.test.cjs
npm run build
```

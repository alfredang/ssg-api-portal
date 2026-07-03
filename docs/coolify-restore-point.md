# Coolify restore point — ssg-api-portal (production)

Snapshot of the deployment state BEFORE adding the TMS/App 2/App 3 dropdown certs.
Captured via Coolify API v4.1.2. App UUID `q7sz8h4co2qtinrtqoi4cwjk`. Status: Running.

**How to restore:** all changes are ADD-ONLY. To roll back, delete any env var or
File Mount whose key is NOT in the list below (i.e. anything added after this snapshot).
No existing variable was deleted or modified.

Note: the API does not return env *values* (security). Actual values are recorded in the
owner-held PDF exports of the Coolify Environment Variables page. This manifest is the
structural restore reference (keys + uuids), sufficient to reverse any additions.

## Environment variables present at snapshot (22)

| # | Key | uuid | runtime | buildtime |
|---|-----|------|---------|-----------|
| 1 | `GOOGLE_CLIENT_ID` | zwkiubpzg2z6infwdusd7j4b | true | true |
| 2 | `GOOGLE_CLIENT_SECRET` | bfepk4islvnih3d5co550t12 | true | true |
| 3 | `GOOGLE_CALLBACK_URL` | qyanti7jy1n72wjrkx0ulaay | true | true |
| 4 | `SSG_CLIENT_ID` | mshzgixapak53gtefj6li7hx | true | true |
| 5 | `SSG_CLIENT_SECRET` | qgx3j6t6cm20jugswdspgl8b | true | true |
| 6 | `SSG_API_BASE_URL` | oq06q9tys0tyopr4kodclqau | true | true |
| 7 | `CERT_2_NAME` | k7f8m5x0irym297gcxw9t1lt | true | true |
| 8 | `CERT_2_ENCRYPTION_KEY` | kl16oo56ctltgvaxytrjkhdl | true | true |
| 9 | `CERT_3_ENCRYPTION_KEY` | k128wfooct1uc8m5rplcklny | true | true |
| 10 | `PORT` | jg58ya8xtwu0z2tgd0awuq73 | true | true |
| 11 | `DATA_DIR` | yhnrb3lmic32buiq1sljdf55 | true | true |
| 12 | `SSG_CERT_API_BASE_URL` | gjfaapzj6nt0m374vghfy62o | true | true |
| 13 | `CERT_3_NAME` | ur93hms0qis4q1ev1ght2yyr | true | true |
| 14 | `CERT_1_NAME` | ymbdh462fbxzruem3bfm10yi | true | true |
| 15 | `CERT_1_CERT_FILE` | is73lr4q6st6k3qlss4w4dat | true | true |
| 16 | `CERT_1_KEY_FILE` | mygymx520zphfj95r7yso0gc | true | true |
| 17 | `CERT_2_CERT_FILE` | opwqce5lo9i4e02vhfw2j0tv | true | true |
| 18 | `CERT_2_KEY_FILE` | pejeg0g2pz4tr8cxcnbwmaxx | true | true |
| 19 | `CERT_3_CERT_FILE` | pgw49nls5fwp8xoq79kv2fea | true | true |
| 20 | `SESSION_SECRET` | fzjbtsl619ne8h6etdbodtls | true | true |
| 21 | `CERT_1_ENCRYPTION_KEY` | i5f3zyh0n3q782oyyq0zd5ji | true | true |
| 22 | `CERT_3_KEY_FILE` | yfvr598vo1akxkzshumo7u3v | true | true |

## File Mounts (Persistent Storage) at snapshot

- API `GET /storages` returns empty (file mounts are UI-managed, not API-visible).
- Known from the Coolify UI: `app1_cert.pem` and `app1_key.pem` mounted at `/app/server/.cert/`.
- These power the working **App 1 (Skilleto)** entry and must NOT be touched.

## Working state to preserve

- `/api/certs` returns: App 1 (Skilleto) [cert-id 1] + TMS 2 (OAuth) [oauth]. Both must keep working.

## Local raw backups

Snapshot files (local, not committed — contain no secrets but kept off git): app-config-backup.json, envs-backup.json, storages-backup.json in C:/Users/User/Desktop/Ang/coolify-restore-point/

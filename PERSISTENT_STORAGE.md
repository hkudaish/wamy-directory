# Free Persistent Storage

> This guide applies to the Render API. For a Netlify deployment with same-origin API storage, see [NETLIFY_STORAGE.md](NETLIFY_STORAGE.md).

## Selected service: Neon Free Postgres

The API already uses PostgreSQL through `DATABASE_URL`; Neon provides a free managed PostgreSQL database that is independent of the Render web-service filesystem. The database survives Render API deploys and restarts. Production saves are committed to PostgreSQL before the browser reports success; browser local storage is only a cache.

Current Neon Free limits documented at [Neon pricing](https://neon.com/pricing):

- $0/month, no credit card required for the Free plan
- 1 GB Postgres storage for this project
- 100 compute-unit hours per project per month; compute scales to zero after 5 minutes idle
- 5 GB public network transfer per month
- 6 hours of point-in-time restore history and one manual snapshot
- No scheduled backups or uptime SLA on the Free plan

When the compute or network allowance is exhausted, the database can suspend until the allowance resets. Exceeding the storage cap blocks writes. Neon documents that reaching Free plan limits does not delete the data. This is suitable as a no-cost persistent store for a small directory, but not a substitute for a separately retained backup or a production availability commitment.

## Provision it

1. Create a project at [Neon Console](https://console.neon.tech/) and keep it on the Free plan.
2. Create a database (for example, `wamy_directory`) and copy its pooled connection string from the Connect dialog. Keep the password private. The URL should include TLS, commonly `sslmode=require`.
3. Before switching the API, export the *current live* directory using the app's admin backup export. Keep this backup outside the repository. The first database seed uses the committed JSON file, which may be older than recent live edits.
4. In Render, open `wamy-directory-api` → Environment and add `DATABASE_URL` with the Neon connection string as a secret. Do not put the connection string in `render.yaml`, source code, or chat.
5. Commit and deploy the code and `render.yaml` changes. On first startup, the API creates its PostgreSQL table and seeds it from `data/directory-data.json` if the table is empty.
6. After deploy, verify `https://wamy-directory.onrender.com/api/health` reports `{"status":"ok","storage":"postgresql","persistent":true}`. Log in, make a small test edit, verify it after reload, and then confirm the live data count and key records against the backup. If any live edits are newer than the JSON snapshot, restore the live export before allowing administrators to resume edits.
7. Create the single free manual Neon snapshot after the initial database has been checked. Repeat manual exports regularly and store copies in an approved location separate from Neon and GitHub.

The production API intentionally refuses to start when `DATABASE_URL` is missing, rather than silently accepting writes to an ephemeral Render filesystem. Configure the Render secret before deploying this change. The free database itself is outside Render; Render's Blueprint only configures the API and its `/api/health` probe.

## Local development

Without `DATABASE_URL`, local development uses `data/directory-data.json`. That local mode is not persistent production storage. Set `NODE_ENV=production` only when a real PostgreSQL `DATABASE_URL` is configured.

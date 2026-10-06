# Netlify storage

The Netlify deployment uses a same-origin `/api/data` API backed by Netlify Blobs. The browser loads the shared directory from that API on startup. An edit counts as saved only after the API confirms that the Blob write succeeded. Browser storage is a cache, not the shared source of truth.

## Deploy

1. Connect this repository to a Netlify site. Netlify runs `node build-static.js` and publishes only `index.html` and `wamy-logo.png` from `public/`. The function and data snapshot are excluded from the public site.
2. Set `WAMY_ADMIN_PASSWORD` as a secret environment variable for Functions before deploying. Use a unique password. The old seeded password is rejected by the Netlify API unless this variable is set, in which case the variable's value is required instead.
3. Deploy, then check `/api/health`. It should return `{"status":"ok","storage":"netlify-blobs","persistent":true}`.
4. Export the current live directory before switching hosts. On its first request, the function tries to seed the Blob from the existing Render API; if that is unavailable, it uses the bundled `data/directory-data.json` snapshot. Compare the live records after deployment and restore any newer data from the export before editing.

The server function keeps the stored passwords out of public `/api/data` responses and requires an authenticated admin session for writes. Netlify Blobs stores the shared data independently of browser storage. See [Netlify's Blobs documentation](https://docs.netlify.com/build/data-and-storage/netlify-blobs/) for service behavior and limits.

For a Render deployment, use the PostgreSQL setup in [PERSISTENT_STORAGE.md](PERSISTENT_STORAGE.md).

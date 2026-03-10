# PrezGen Deployment

## Production topology

1. `node backend/server.js` runs the app backend.
2. Backend serves:
   - frontend production build from `frontend/dist`,
   - API under `/api/v1`,
   - protected content assets under `/content`.
3. `nginx` terminates HTTPS and proxies traffic to the Node process.

## Required environment variables

1. `API_PORT`
2. `PREZGEN_BOOTSTRAP_ADMIN_LOGIN`
3. `PREZGEN_BOOTSTRAP_ADMIN_NAME`
4. `PREZGEN_BOOTSTRAP_ADMIN_TOKEN`

Optional:

1. `PREZGEN_DATA_DIR`
2. `PREZGEN_FRONTEND_DIST`
3. `APP_INTERNAL_BASE_URL`
4. `NODE_ENV=production`

## First deploy

1. Install dependencies in root and frontend.
2. Build frontend:
   - `npm run build`
3. Configure env variables for the service.
4. Start the systemd unit or PM2 process.
5. Put `nginx.prezgen.conf` behind your domain.
6. Log in with the bootstrap admin token.

## Notes

1. Bootstrap admin token is created on first DB initialization when no users exist.
2. Existing local presentations/themes are backfilled to the bootstrap admin owner during migration.

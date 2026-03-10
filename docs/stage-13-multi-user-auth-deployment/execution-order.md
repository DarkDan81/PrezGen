# Stage 13 Execution Order

## Safety rule

Do not add frontend login/admin flows before backend ownership and protected route rules exist.

## Order

1. Production topology
   - backend serves frontend build;
   - SPA fallback;
   - env cleanup;
   - deployment templates.
2. User/auth schema
   - `users`,
   - auth tokens/sessions,
   - bootstrap admin.
3. Ownership migration
   - add owner fields;
   - migrate existing local data to one bootstrap owner.
4. Repository hardening
   - user-aware reads/writes;
   - remove unrestricted access paths for private data.
5. Protected API
   - auth middleware;
   - admin-only routes;
   - export/preview access protection.
6. Frontend auth shell
   - login,
   - current user bootstrap,
   - protected routes.
7. Admin panel
   - user create/list/edit/disable;
   - quota placeholder UI.
8. QA and deployment validation
   - hosted smoke run;
   - manual access boundary checks.

## Rollback boundary

1. If ownership migration is incomplete, do not ship frontend auth UI yet.
2. If export/download routes are not ownership-aware, do not expose internet access.
3. If production frontend serving is not ready, do not rely on Vite dev server in server deployment.

## Suggested commit slicing

1. `stage13: add production frontend serving and deployment templates`
2. `stage13: add users auth schema and bootstrap admin flow`
3. `stage13: add ownership migration for private user data`
4. `stage13: harden repositories and protected api routes`
5. `stage13: add frontend login shell and current user context`
6. `stage13: add admin panel and user management`
7. `stage13: add quota-ready schema fields and admin placeholders`
8. `docs(stage13): sync rollout status and private-hosting checklist`

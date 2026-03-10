# Stage 13 Implementation Plan

## Phase 1. Deployment foundation and production topology

1. Fix production frontend serving path:
   - backend serves built frontend assets;
   - React SPA fallback returns `index.html` for application routes.
2. Normalize environment variables:
   - API port,
   - public base URL if needed,
   - auth secrets,
   - optional data path override.
3. Add deployment templates:
   - `nginx`,
   - `systemd` or `pm2`.

Deliverable:
- deployable single-node app topology without dev server.

## Phase 2. User identity and auth model

1. Add `users` table and minimal auth storage.
2. Add auth token/session model.
3. Add login endpoint and authenticated request middleware.
4. Add bootstrap admin creation flow for first deployment.

Deliverable:
- authenticated backend foundation with first admin user.

## Phase 3. Ownership schema and repository hardening

1. Add ownership fields to user-generated entities:
   - presentations,
   - datasets,
   - custom themes,
   - export jobs,
   - uploaded assets metadata if tracked separately.
2. Backfill existing local data into a default owner during migration.
3. Refactor repository access to enforce per-user scope.

Deliverable:
- private data model with no cross-user reads by default.

## Phase 4. Protected API and access policy

1. Protect all mutable routes.
2. Protect read routes for private entities.
3. Cover preview/export/download paths under the same access policy.
4. Keep public health endpoint only if operationally necessary.

Deliverable:
- user-scoped API behavior and explicit admin-only endpoints.

## Phase 5. Frontend auth flow and user shell

1. Add login screen/session bootstrap.
2. Load current user in app shell.
3. Hide non-authorized screens and routes until auth state resolves.
4. Show only current user's presentations/themes/datasets.

Deliverable:
- multi-user frontend with authenticated navigation.

## Phase 6. Admin panel

1. Add protected admin route.
2. Add user list/create/edit/disable actions.
3. Add future quota/settings section placeholder.
4. Expose basic account metadata useful for support/admin work.

Deliverable:
- admin-controlled user provisioning for private rollout.

## Phase 7. Quota-ready scaffolding

1. Add optional per-user settings fields:
   - presentation count limit,
   - asset storage limit,
   - export concurrency limit,
   - feature flags placeholder.
2. Admin panel should surface these values even if enforcement stays partial.

Deliverable:
- schema and admin UI ready for later quota enforcement stage.

## Phase 8. QA and rollout barrier

1. Automated:
   - auth/login smoke,
   - access-denied checks for чужие entities,
   - existing API verification/build checks.
2. Manual:
   - admin creates user,
   - user logs in,
   - user sees only own content,
   - export/download still works for owner,
   - direct URL refresh works in deployed mode.

Deliverable:
- private hosted pilot readiness.

# Stage 13 - Multi-User Auth and Deployment Readiness

Date: 2026-03-10
Status: in progress

Related:

- `decisions.md` - approved auth, ownership, and deployment decisions.
- `implementation-plan.md` - phased implementation plan for multi-user rollout.
- `execution-order.md` - safe implementation order with rollback boundaries.
- `implementation-status.md` - progress tracker and QA checklist.

## Goal

Move PrezGen from a single-tenant local tool to a deployable multi-user system where:

1. each user sees only their own presentations and uploaded assets;
2. admin users can create/manage users from an internal admin panel;
3. authentication is token/session based and ready for internet deployment;
4. backend and frontend are production-ready for server rollout behind reverse proxy;
5. future quotas and usage limits can be added without redesigning the core data model.

## Why this stage exists

Current product is functional, but it still behaves like a trusted local app:

1. there is no user identity model;
2. all API routes are effectively global;
3. no ownership boundary protects one user's data from another;
4. no deployment-ready frontend serving path exists;
5. no admin workflow exists to bootstrap users for private testing.

For real shared usage, even with a small family/friends pilot, these boundaries must become explicit.

## Scope

In scope:

1. Identity and access foundation:
   - `users` entity;
   - token/session authentication;
   - authenticated request context (`req.user`);
   - protected API routes.
2. Data ownership:
   - presentations belong to one user;
   - datasets, uploaded assets, export jobs, and custom themes follow ownership rules;
   - system themes remain global and readable by all authenticated users.
3. Admin capabilities:
   - admin role;
   - admin-only user management UI;
   - create user, disable user, reset token/password flow placeholder.
4. Production deployment readiness:
   - backend serves built frontend;
   - SPA fallback for React routes;
   - production env configuration;
   - deployment docs/templates for reverse proxy and app service manager.
5. Quota-ready foundation:
   - schema and policy hooks for future limits;
   - admin UI placeholder for quotas/settings;
   - no full billing or subscription logic yet.

Out of scope:

1. Full self-service signup and email verification.
2. OAuth/social login providers.
3. Payments/billing.
4. Team workspaces and shared presentations between multiple users.
5. Fine-grained RBAC beyond `admin` vs `user`.

## Target Product Behavior

1. Anonymous users cannot access presentation/theme/editor APIs.
2. Regular users can access only:
   - their own presentations,
   - their own datasets,
   - their own uploaded assets,
   - their own custom themes,
   - global system themes.
3. Admin users can:
   - log into admin panel,
   - create/manage user accounts,
   - inspect high-level usage metadata,
   - later configure quotas without schema redesign.
4. Production build can be deployed on a server behind `nginx` with only environment configuration and service startup.

## Security and Ownership Requirements

1. Every mutable user-created entity must have an owner boundary.
2. Route access must be verified server-side, never only filtered in frontend.
3. Token/session validation must happen before repository data is returned.
4. Direct lookup by raw ID must not bypass ownership checks.
5. Admin-only operations must be separated from normal user routes.

## Acceptance Criteria

1. Unauthenticated API access to protected routes returns authorization error.
2. User A cannot list, open, modify, export, or delete User B presentations by guessing IDs.
3. Custom themes, datasets, and uploaded assets respect the same ownership model as presentations.
4. Admin can create at least one new user from UI and that user can log in successfully.
5. Frontend production bundle is served by backend or documented production topology without dev server dependency.
6. Direct route refresh on `/themes`, `/presentations/:id`, and admin routes works in production.
7. Stage includes deployment templates/docs for `nginx` and app process management.
8. Future quota fields/policies can be added without reshaping the ownership model.

## Deliverables

1. Stage docs:
   - `decisions.md`
   - `implementation-plan.md`
   - `execution-order.md`
   - `implementation-status.md`
2. DB migration for users/auth/ownership fields.
3. Auth middleware and protected route layer.
4. Admin panel for user management.
5. Production-serving path for frontend + deployment templates.

## Risks and Mitigations

1. Risk: ownership is added only in UI and not enforced in backend.
   - Mitigation: all repository reads/writes must flow through user-aware access checks.
2. Risk: auth is added, but export/download routes still leak cross-user data.
   - Mitigation: explicitly cover preview, asset, and export job paths in the access model.
3. Risk: deployment readiness is attempted without fixing frontend serving topology.
   - Mitigation: production serving is part of this stage scope, not a separate afterthought.
4. Risk: quota design gets entangled with auth rollout.
   - Mitigation: add only quota scaffolding now, keep enforcement optional for next stage.

## Handoff Notes

1. This stage should be treated as the first real multi-tenant boundary in the product.
2. The implementation must prioritize safe ownership enforcement over polished onboarding.
3. Family/friends pilot can use admin-created accounts first; self-signup can remain for later stage.

# Stage 13 Decisions

## 1. Use server-side authenticated ownership, not frontend-only filtering

Decision:

1. Every protected API route must resolve access using authenticated user context.
2. Repository/service methods should evolve toward user-aware lookups (`for user`) rather than raw unrestricted reads.

Reason:

- prevents ID-based cross-user access;
- makes future permissions and quotas extensible.

## 2. Start with one personal workspace per user

Decision:

1. Presentations, datasets, assets, custom themes, and export jobs belong to a single owner user.
2. Shared/team workspaces are deferred.

Reason:

- simplest safe model for first hosted rollout;
- enough for family/friends pilot and internal admin management.

## 3. Keep system themes global, custom themes private

Decision:

1. Built-in system themes remain visible to all authenticated users.
2. User-created themes are private to the owner unless future sharing is added.

Reason:

- preserves current product baseline;
- avoids unnecessary duplication of system assets.

## 4. Admin is a role, not a separate app

Decision:

1. Introduce `admin` vs `user` role in the same auth domain.
2. Admin panel lives inside the main frontend as protected routes.

Reason:

- avoids running a second product shell;
- keeps deployment and navigation simpler.

## 5. Support deployable auth now, self-signup later

Decision:

1. Initial rollout may use admin-created users only.
2. Public signup, email recovery, and advanced identity flows are deferred.

Reason:

- fastest path to safe private testing;
- avoids premature complexity.

## 6. Add quota scaffolding now, enforcement later

Decision:

1. User model may include future-friendly quota/config fields.
2. Full enforcement can remain disabled or minimal in this stage.

Reason:

- preserves forward compatibility;
- avoids reworking admin and DB schema later.

## 7. Production serving must be first-class in app code

Decision:

1. Backend must support serving the built frontend and SPA route fallback.
2. Reverse proxy (`nginx`) stays external, but app code must be ready for it.

Reason:

- deployment should not depend on local dev server behavior;
- production topology must be deterministic and documented.

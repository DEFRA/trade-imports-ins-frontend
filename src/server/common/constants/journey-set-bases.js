/**
 * Where each journey frontend mounts its obligation set.
 *
 * A journey frontend serves its set under `/<set-id>` and serves no set at the
 * root (EUDPA-619), so every deep link this service builds into one is that
 * frontend's base URL, plus the set base, plus the path.
 *
 * The configured frontend base URLs stay host-only. A set prefix baked into the
 * host would break that frontend's `/health`, `/signout`, static assets and
 * OIDC callback, and would make every other set on the same host unreachable —
 * so the prefix belongs in path construction, and lives here rather than as a
 * literal repeated across link builders. Linking into a second journey is one
 * more entry below.
 *
 * Mirrors trade-imports-animals-frontend's own `SET_BASE`
 * (`src/server/app/sets/live-animals/set.js`) and the tests repo's `SET_BASES`
 * (`page-objects/base/sets.ts`).
 */
export const SET_BASES = Object.freeze({
  LIVE_ANIMALS: '/live-animals'
})

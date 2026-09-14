# Architecture: chassis and application

The service has two parts and one boundary between them, enforced by
Dependency Cruiser in
[`.dependency-cruiser.cjs`](../../../../.dependency-cruiser.cjs).

## The chassis

The chassis is everything outside `src/server/app/`:
[`src/server/server.js`](../../server.js) builds the Hapi server and
registers logging, tracing, metrics, secure context, pulse, the session
cache, Nunjucks, Scooter, the content security policy, CSRF, Cookie and
Bell. Then — only when `auth.enabled` — it registers the auth plugin and,
beside it, one routes plugin: the Defra ID `/auth/*` routes in
[`src/server/auth/index.js`](../../auth/index.js), or the stub sign-in
routes in [`stub-sign-in.js`](../../auth/stub-sign-in.js) when
`isStubMode()`. Last comes [`router.js`](../../router.js), which registers
`health`, then — only when `auth.enabled` — the application plugin and
`signout`, then static files.

- [`src/plugins/auth.js`](../../../plugins/auth.js) — the session strategy,
  the Bell/Defra ID strategy, and the stub-mode short circuit that skips
  Bell entirely.
- [`src/plugins/csrf.js`](../../../plugins/csrf.js) — CSRF protection via
  `@hapi/crumb`, disabled during test runs.
- [`src/auth/`](../../../auth/) — token verification, permissions lookup and
  safe-redirect checking.
- [`src/config/config.js`](../../../config/config.js) — convict
  configuration, validated strict at boot.
- [`src/config/nunjucks/`](../../../config/nunjucks/nunjucks.js) — the
  Nunjucks environment and view context.
- [`src/server/common/`](../../common/) — chassis helpers,
  `constants/status-codes.js`, `services/mode.js` and `test-helpers/`.
- `src/server/auth/`, `src/server/health/` and `src/server/signout/` — the
  routes those helpers serve.

**The error page**: [`common/helpers/errors.js`](../../common/helpers/errors.js)'s
`catchAll` renders `shared/error` through `kit.base()` with the
status-keyed message from `sharedCopy.errorPage`.

**The unauthorised page**: [`app/auth/unauthorised.njk`](../auth/unauthorised.njk)
is the one view outside `features/`. The chassis's auth controller renders
it with `base(sharedCopy.unauthorised.title)`.

## The application

[`routes.js`](../routes.js) is the composition point: a Hapi plugin named
`import-notification-service` whose `register` calls
`server.route(allRoutes)`. It is the only production module outside
`features/` that imports `features/**`.

[`features/index.js`](../features/index.js) imports each feature's
controller namespace and spreads `routes` into `allRoutes` — nothing else.
There is no dispatch table and no separate registration step beyond this
barrel.

Four directories:

- `features/` — one folder per feature: `dashboard/`, `address-book/`.
- `services/` — one folder per upstream: `address-book/`, `countries/`,
  `ins-backend/`, each `index.js` + `client.js` + `stub.js`.
- `shared/` — `kit.js`, `paths.js`, `copy.js`, `copy-leaves.js`,
  `copy.en.js`, `copy.cy.js`, `layout.njk`, `error.njk`,
  `error-summary.njk`.
- `lib/` — `http-client.js`, `http-status.js`, `validate/`.

Plus two convention tests beside `routes.js`:
[`copy-convention.test.js`](../copy-convention.test.js) and
[`copy-parity.test.js`](../copy-parity.test.js).

## Run mode

[`isStubMode()`](../../common/services/mode.js) reads `STUB_MODE` and
refuses it in production. It switches the data and the sign-in together —
a stub run serves in-memory data from each service's `stub.js` and signs
its own session at `/auth/stub-sign-in`; a real run uses the HTTP clients
and Defra ID. Each service barrel asks `isStubMode()` per call, so a test
can flip the mode with `config.set`.

## Templates

Nunjucks roots are set in
[`nunjucks.js`](../../../config/nunjucks/nunjucks.js): the govuk-frontend
dist, `src/server/app` (resolves `shared/layout.njk`,
`shared/error-summary.njk`, `shared/error.njk`, `auth/unauthorised.njk`) and
`src/server/app/features` (resolves feature views); `src/server/common/components`
is also listed but does not exist. Vision's `path` is `['server/app',
'server/app/features']`, so a feature view name is its path under
`features/` without the extension: `dashboard/template`,
`address-book/add/template`.

Every page template extends `shared/layout.njk` and fills the
`journeyContent` block.
[`context.js`](../../../config/nunjucks/context/context.js) supplies
`assetPath`, `getAssetPath()` (from webpack's `.public/assets-manifest.json`),
`dashboardUrl`, `addressBookUrl`, `activeNavigationItem`, `userSession` and
`crumb` to every render.

## Client assets

Webpack ([`webpack.config.js`](../../../../webpack.config.js)) builds
`src/client/javascripts/application.js` and
`src/client/stylesheets/application.scss` into `.public/`, copies
govuk-frontend's assets to `/public/assets`, and writes the manifest
`getAssetPath()` reads. Run `npm run build:frontend` once; `npm run dev`
watches. A missing webpack entry is a silent 404 — the template renders,
the bundle does not.

## Enforced boundaries

Dependency Cruiser scans `src/server/app` (tests, fit specs, `fit/` folders
and `.njk` files are excluded). Its four error-level rules:

- **`feature-isolation`** — a feature never imports a sibling feature.
- **`routes-is-the-gateway`** — only `routes.js` imports `features/` from
  outside `features/`.
- **`shared-and-lib-are-leaves`** — `shared/` and `lib/` import nothing
  from `features/` or `services/`.
- **`no-circular`** — cycles are forbidden.

`.dependency-cruiser-known-violations.json` is empty, so `npm run lint:arch`
is green on the rules themselves. `npm run depcruise:graph` draws
`ins-arch.svg` (needs Graphviz). Tests may compose real layers, but
production code cannot use test exemptions.

## How this differs from the journey frontends

- ins has no set and no journey: there is one flat `features/` directory,
  not a platform/set split.
- ins has no obligation model, no engine, no bridge, no flow and no
  analysis directories.
- there are no `configure*` seams: `routes.js` composes `allRoutes`
  directly, with nothing injected at boot.
- there is no `dispatchPages` and no page dispatch index — navigation is
  the fixed route list above.
- there is no `prime()` step: countries are fetched per request rather
  than primed at boot.
- page controllers are named `controller.js`, not `<page>.controller.js`.
- each service barrel chooses stub or real per call
  (`isStubMode() ? stub : client`), not through an injected adapter.
- browser tests share one fit fixture
  ([`address-form.js`](../features/address-book/fit/address-form.js))
  rather than each spec building its own axe call from scratch.
- [`lib/validate/validators.js`](../lib/validate/validators.js) and
  [`address-id-params.js`](../features/address-book/address-id-params.js)
  still import Joi directly, although the package is not declared in
  `package.json`.

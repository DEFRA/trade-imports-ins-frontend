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
[`src/server/auth/index.js`](../../auth/index.js), or the stub routes in
[`stub-sign-in.js`](../../auth/stub-sign-in.js) when `isStubMode()` — the
same `/auth/sign-in` and `/auth/sign-out` paths, with no identity provider
involved.

Whether or not `auth.enabled` is set, and whatever the stub or Defra ID
mode, it then registers the hidden IDM sign-in
([`idm-sign-in.js`](../../auth/idm-sign-in.js)). It serves its routes and
its own Bell strategy ([`idm-strategy.js`](../../auth/idm-strategy.js))
only when `IDM_OIDC_CONFIGURATION_URL` is set, the IDM client ID, client
secret and service ID are set, and IDM discovery succeeds at start-up.
Otherwise it logs why and the service starts without it, so an IDM outage
never stops the service starting. When `HTTP_PROXY` is set, as CDP sets it,
it sends its HTTPS Wreck calls to IDM through that proxy, Bell's token
exchange included: to the discovery host before discovery, and to the
discovery, token and keys hosts after it
([`wreck-agent.js`](../../../auth/wreck-agent.js)). CDP lets a service
reach the internet only through its squid proxy, and only to the domains on
the service's allowlist in `cdp-tenant-config`. Calls to every other host,
the Defra ID stub's included, go direct as before. It keeps what IDM returned in the yar
session for its own signed-in page, and never writes the auth
cache or the session cookie, so the rest of the service keeps the stub or
Defra ID identity. Last comes [`router.js`](../../router.js), which registers
`health`, then — only when `auth.enabled` — the application plugin, then
static files.

- [`src/plugins/auth.js`](../../../plugins/auth.js) — the session strategy,
  the Bell/Defra ID strategy, and the stub-mode short circuit that skips
  Bell entirely.
- [`src/auth/bell-options.js`](../../../auth/bell-options.js) — the Bell
  OAuth options both sign-ins share; the service sign-in adds its profile
  decoding, redirect capture and organisation reselection, the hidden IDM
  sign-in its profile from the token response. Bell's cookie takes
  `session.cookie.sameSite`: the return from the identity provider is a
  top-level navigation, and `SameSite=Strict` can keep the cookie off the
  callback, so Bell silently answers `isAuthenticated: false`.
- [`src/plugins/csrf.js`](../../../plugins/csrf.js) — CSRF protection via
  `@hapi/crumb`, disabled during test runs.
- [`src/auth/identity-providers.js`](../../../auth/identity-providers.js) —
  the two identity providers, named by role: `serviceSignInProvider`, the
  service's own sign-in (config group `defraId`, the Defra ID stub outside
  production), and `hiddenIdmSignInProvider`, the hidden test sign-in
  through the real Defra ID (config group `idm`). It holds each one's config
  group, metric call names, and whether its tokens' audience and issuer are
  checked. The stub issues a random audience, so the service sign-in's are
  not. The metric dependency `defra-id` is the service's own client, whether
  it points at the stub or the real Defra ID; `idm` is the hidden test
  client. Discovery, token verification and the token-exchange timing each
  take the provider they act for, with no default.
- [`src/auth/`](../../../auth/) — token verification, permissions lookup,
  safe-redirect checking and the one Defra ID hostname rewrite
  ([`defra-id-hostnames.js`](../../../auth/defra-id-hostnames.js)), shared by
  the sign-in token and key endpoints, the sign-out URL and the
  content-security-policy form-action.
- [`src/config/config.js`](../../../config/config.js) — convict
  configuration, validated strict at boot.
- [`src/config/nunjucks/`](../../../config/nunjucks/nunjucks.js) — the
  Nunjucks environment and view context.
- [`src/server/common/`](../../common/) — chassis helpers,
  `constants/status-codes.js`, `services/mode.js` and `test-helpers/`.
- `src/server/auth/` and `src/server/health/` — the routes those helpers
  serve.

**Process start-up**: [`src/index.js`](../../../index.js) calls
`startServer()`
([`common/helpers/start-server.js`](../../common/helpers/start-server.js)),
which calls `allowOneSecondPerAddressWhenConnecting()`
([`common/helpers/connect-attempt.js`](../../common/helpers/connect-attempt.js))
before it creates the server. It raises Node's process-wide happy-eyeballs
connect attempt per address from 250ms to one second, for every outbound
client: Wreck, Bell and `fetch`. In the workspace stack and CI, services
reach each other through `host.docker.internal`, which resolves to an IPv4
and an IPv6 address. Under load neither answered within 250ms, so the JWKS
fetch to the Defra ID stub at sign-in (`/auth/sign-in-oidc`) and the
address book's create failed with `AggregateError [ETIMEDOUT]` a few
hundred milliseconds into the call. The animals and plants frontends set
the same one second.

**The error page**: [`common/helpers/errors.js`](../../common/helpers/errors.js)'s
`catchAll` renders `shared/error` through `kit.base()` with the
status-keyed message from `sharedCopy.errorPage`.

**The auth pages**: [`app/auth/`](../auth/) holds the views outside
`features/`. The chassis's auth controller owns `renderUnableToSignIn(h, {
signInUrl })`, which renders `unauthorised.njk` with
`base(sharedCopy.unauthorised.title)` and a try-again link to the
`signInUrl` it is given: `/auth/sign-in` from the auth controller,
`/auth/idm/sign-in` from the IDM sign-in. The IDM sign-in's own pages
(`idm-sign-in.njk`, `idm-signed-in.njk`, `idm-signed-out.njk`) are internal
test pages, in English only, with their text in the templates and in
`idm-sign-in.js` (the page titles, which are also the headings, and the
token-response row labels), not in `copy.en.js`/`copy.cy.js`.

**The Defra ID sign-in and sign-out callbacks**: the sign-in callback
(`/auth/sign-in-oidc`) runs Bell in `try` mode, so a callback Bell cannot
authenticate (a state or nonce mismatch, a failed token exchange, a cookie
it cannot read) reaches the handler unauthenticated, with the reason in
`request.auth.error`, and renders the unable-to-sign-in page. The token's
`roles` carry the role name, not its permissions, for a user signed in with
RPA credentials, so the callback asks `getPermissions`
([`src/auth/get-permissions.js`](../../../auth/get-permissions.js)) for the
scope; those calls go to the RPS and Siti Agri APIs with the Defra ID token.
The sign-out callback (`/auth/sign-out-oidc`) checks `state` only when the
query carries one: Defra ID sends it, but a local sign-out returns without
it. The sign-in callback and `/auth/organisation` pass the stored return
path through `getSafeRedirect`, so the redirect after sign-in is always a
path on this service.

## The application

[`routes.js`](../routes.js) is the composition point: a Hapi plugin named
`import-notification-service` whose `register` calls
`server.route(allRoutes)`. It is the only production module outside
`features/` that imports `features/**`. When `isDevOrLocalEnvironment()`
(the spike's own
[`is-dev-or-local.js`](../features/address-lookup-spike/is-dev-or-local.js),
reading `cdpEnvironment`) is true, it also registers the temporary
`address-lookup-spike` routes, which sit outside `allRoutes`.

[`features/index.js`](../features/index.js) imports each feature's
controller namespace and spreads `routes` into `allRoutes` — nothing else.
There is no dispatch table and no separate registration step beyond this
barrel.

Four directories:

- `features/` — one folder per feature: `dashboard/`, `notification-type/`,
  `address-book/`, `address-lookup-spike/` (temporary, dev/local only).
- `services/` — one folder per upstream: `address-book/`, `countries/`,
  `ins-backend/`, `address-lookup/`, `transporters/`, each `index.js` + `client.js` +
  `stub.js`.
- `shared/` — `kit.js`, `paths.js`, `list-page.js`, `escape-html.js`, `copy.js`, `copy-leaves.js`,
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
dist, the `@ministryofjustice/frontend` package root (the sub navigation
macro), `src/server/app` (resolves `shared/layout.njk`,
`shared/error-summary.njk`, `shared/error.njk`, `auth/unauthorised.njk`) and
`src/server/app/features` (resolves feature views); `src/server/common/components`
is also listed but does not exist. Vision's `path` is `['server/app',
'server/app/features']`, so a feature view name is its path under
`features/` without the extension: `dashboard/template` for a
single-page feature, `address-book/add/add` for a page joining a group.

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
the bundle does not. `_govuk-frontend.scss` configures GOV.UK Frontend
directly, with this service's asset path, global styles and no default
font face, so GOV.UK Frontend is configured once. `application.scss`
loads it first, then `@use`s the sub navigation component of
`@ministryofjustice/frontend`
(`moj/components/sub-navigation/sub-navigation`), which inherits that
configuration.

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
- there is no `prime()` step: the countries service loads itself on the
  first read and caches the list for the life of the process.
- the address-book, ins-backend, address-lookup and transporters barrels
  choose stub or real per call (`isStubMode() ? stub : client`), not
  through an injected adapter;
  countries checks the mode once inside `ensureLoaded` and serves its
  module-scope cache thereafter.
- browser tests share one address-form fixture
  ([`address-form.js`](../features/address-book/fit/address-form.js))
  across the add, address type, edit, list, view and page-title specs, the
  transporter-forms and transporter-type specs, and the repo-root smoke
  spec.

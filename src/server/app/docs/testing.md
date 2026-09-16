# Testing

Run commands from the repository root.

## Unit suite

`npm test` builds the client (`pretest`) then runs Vitest with coverage.
`npm run test:watch` does neither.
[`vitest.config.js`](../../../../vitest.config.js): globals, Node
environment, and **`STUB_MODE=true` for the whole suite** — a test that
needs the HTTP clients opts into real mode itself. The `test` and
`test:watch` scripts set `TZ=UTC`. Tests sit beside their subject.

Convention checks:

- [`routes.test.js`](../routes.test.js) — the exact route list, session
  auth on every route, `addressIdParams` on every `{id}` route.
- [`copy-convention.test.js`](../copy-convention.test.js)
- [`copy-parity.test.js`](../copy-parity.test.js)
- [`shared/paths.test.js`](../shared/paths.test.js)
- [`shared/kit.test.js`](../shared/kit.test.js)
- [`shared/layout.test.js`](../shared/layout.test.js) — service
  navigation, phase banner, back link, banner, title prefix, surfaces,
  assets, footer.

## Controller tests

See [`add/controller.test.js`](../features/address-book/add/controller.test.js)
for the pattern, and the helpers in
[`common/test-helpers/`](../../common/test-helpers/): `real-mode.js`
(`runInRealMode()`, `refuseOutboundHttp()`, `addressBookApi()`,
`referenceDataApi()`, `insBackendApi()`, `serveCountries(list)`),
`session-auth.js` (`sessionAuth(sessionId, overrides)`),
`mock-oidc-config.js` (`mockOidcConfig`), `mock-auth-config.js`
(`mockAuthConfig(importOriginal)`), `test-server.js`.

Mock at the network boundary: nock answers the HTTP calls the real
clients make — never `vi.mock` a service barrel, and never mock
`global.fetch`. The real server boots (`createServer()` +
`initialize()`), `server.inject` runs with a session, and assertions
check status, redirect location, rendered HTML literals and
`scope.isDone()`. CSRF is switched off per test with
`config.set('csrf.enabled', false)`. Each `sessionAuth` id is unique per
test.

## Service tests

`services/<name>/<name>.test.js` runs under `runInRealMode()`: request
path, query, organisation and trace headers (`getTraceId` mocked with a
hoisted `vi.fn`), parsed body, the 400 problem shape, and the refusal
without an organisation. An `in stub mode` describe under
`refuseOutboundHttp()` pins the seeds the fit specs depend on.
`ins-backend/stub.test.js` covers the dashboard stub.

## Browser tests

Two Playwright projects in
[`playwright.config.js`](../../../../playwright.config.js). Both are
frontend integration tests ("fit") — the real server and browser, every
external integration stubbed:

- **`smoke`** runs [`fit/smoke.fit.spec.js`](../../../../fit/smoke.fit.spec.js)
  — sign in, then the dashboard, the address book, add, view and delete,
  then an axe check. It names headings and buttons through the copy
  modules.
- **`features`** runs `src/server/app/features/**/*.fit.spec.js` — six
  specs, English literals.

The `webServer` boots `npm run fit:start` with `STUB_MODE=true`, so no
other service runs. The Playwright default port is 3002, which is also
the port the workspace stack serves this frontend on — pass `PORT=3052`
when the stack is up; `npm run test:fit:ci` does. Run `npm run
playwright:install` once (Chromium).

Helpers: [`fit/sign-in.js`](../../../../fit/sign-in.js) —
`signIn(page, { organisationId })` navigates to `/auth/stub-sign-in`.
[`address-form.js`](../features/address-book/fit/address-form.js) —
labels, `validAddress`, `fillValidAddress`, `expectErrorFocusOn`, the two
validation tables, `expectNoSeriousOrCriticalAxeViolations`.
[`seed-address.js`](../features/address-book/fit/seed-address.js) — the
deterministic seed id.

Every test signs in with its own organisation id, because the
address-book stub keys its data by organisation; the `-empty` and
`-paginated` suffixes select those seeds. No sleeps, no page objects, and
`exact: true` on "Back". On failure read
`test-results/<spec>/error-context.md` and the HTML report in
`playwright-report/`.

`npm run fit:start:workspace` starts the app against the workspace stack
after `scripts/check-workspace-stack.js` confirms the three upstreams
answer `/health`.

## Deployed end-to-end tests

Multi-service coverage does not live in this repository. It belongs in
the shared tests repository
[`DEFRA/trade-imports-animals-tests`](https://github.com/DEFRA/trade-imports-animals-tests),
as its `ins` Playwright project:
`tests/e2e/features/ins/*.spec.ts` and
`tests/security/ins/address-book.spec.ts`, run against the workspace
stack or CDP. A cross-repo change must use the same branch name in every
repository it touches.

This repository has no delegating `e2e-tests.yml` workflow.
`check-pull-request.yml`'s two jobs — `pr-validator` and `FIT Tests` — are
the checks a pull request shows, so a PR here proves unit, format, lint,
coverage and the FIT suite, and nothing more. Say so plainly rather than
implying E2E ran.

## Architecture and formatting

`npm run lint` runs JavaScript, stylesheet and Dependency Cruiser
checking. `npm run format` writes Prettier formatting; `npm run
format:check` verifies it.

## Required checks for a change

```bash
npm run format:check
npm run lint
npm test
npm run test:fit
```

Green means every command exits with code 0, Vitest has no failed tests,
Playwright has no failed specs, and lint has no errors.

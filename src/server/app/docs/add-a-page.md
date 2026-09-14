# How to add a page

Use this recipe for one new page. Run every command from the repo root.
All other paths are relative to `src/server/app/`.

## Read these files first

`features/address-book/add` is the smallest complete page: one form, one
service call, one template, both copy bundles, one controller test and one
feature spec.

- [`features/address-book/add/controller.js`](../features/address-book/add/controller.js)
- [`features/address-book/add/template.njk`](../features/address-book/add/template.njk)
- [`features/address-book/add/controller.test.js`](../features/address-book/add/controller.test.js)
- [`features/address-book/fit/add.fit.spec.js`](../features/address-book/fit/add.fit.spec.js)
- [`features/address-book/fit/address-form.js`](../features/address-book/fit/address-form.js)
- [`features/address-book/copy/copy.en.js`](../features/address-book/copy/copy.en.js)
- [`features/address-book/copy/copy.cy.js`](../features/address-book/copy/copy.cy.js)
- [`features/address-book/copy/copy.test.js`](../features/address-book/copy/copy.test.js)
- [`features/address-book/fields.js`](../features/address-book/fields.js)
- [`shared/paths.js`](../shared/paths.js)
- [`shared/kit.js`](../shared/kit.js)
- [`features/index.js`](../features/index.js)
- [`routes.test.js`](../routes.test.js)

These files take the same shape as the journey frontends' pages but never
import from them. Read the files above, not the journey paths.

## 1. Name the path

Add a builder to `shared/paths.js` (and a `*RoutePath()` twin if the page
is parameterised). Add its case to `shared/paths.test.js`. The URL appears
nowhere else.

## 2. Create the feature folder

For a new feature:

```text
features/<name>/
├── controller.js
├── controller.test.js
├── template.njk
├── copy/
│   ├── copy.en.js
│   ├── copy.cy.js
│   └── copy.test.js
└── fit/
    └── <name>.fit.spec.js
```

For a page joining `address-book`, create a `features/address-book/<page>/`
folder with `controller.js`, `template.njk` and `controller.test.js`; put
its spec in the group's `fit/`, and its strings in the group's `copy/`.
Create both locale bundles and their test as soon as the template exists —
see [features.md](features.md#copy-and-templates).

## 3. Write the controller

Follow the shape at [features.md](features.md#controllers):

1. Import the service barrel, `HTTP_STATUS_*`, `validate`, `kit`,
   `copyFor`, the path builders and `createLogger`.
2. Resolve `const copy = copyFor({ en, cy })`.
3. Write a `buildView` helper.
4. GET renders the page.
5. POST reads the payload, honours `cancel`, validates with
   `lib/validate`, re-renders raw values with a 400 on error, calls the
   service, sets the success banner, and redirects.
6. A thrown service error logs once and re-renders with
   `recoverableError: true` and status 500.
7. `export const routes = kit.pageRoutes(<path>(), { get, post })`.

Use explicit Hapi route objects only when the page needs more than a
GET/POST pair. A page under `/address-book/{id}` passes
`addressIdRouteOptions` and loads through `loadStoredAddress` and
`boomFor`.

## 4. Add copy and the Nunjucks view

Follow the copy rule and the template rules at
[features.md](features.md#copy-and-templates). The view name is
`<feature>/<page>/template`. Run `npm test` and fix the local copy test,
`copy-convention.test.js` and `copy-parity.test.js` before continuing.

## 5. Register the routes

Import the controller namespace in `features/index.js` and spread `routes`
into `allRoutes`. `routes.test.js` lists every route and must gain the new
ones — the test is the guard that a page is registered exactly once.

## 6. Reach a service

Use the barrel under `services/<name>/index.js`. A new upstream gets
`index.js` + `client.js` + `stub.js` in the shape [services.md](services.md)
describes, and the stub must serve enough for the feature spec.

## 7. Register client JavaScript when needed

Most pages need no page-specific JavaScript. If this page does, add an
entry module under `src/client/javascripts/`, name it as an `entry` in
`webpack.config.js`, and load it with `getAssetPath('<entry>.js')`.

## 8. Add unit tests

Write `controller.test.js` in the shape of
[`add/controller.test.js`](../features/address-book/add/controller.test.js):

- `vi.mock` of `get-oidc-config.js`, `describe.sequential`,
  `runInRealMode()`.
- `createServer()` and `initialize()` in `beforeAll`; `server.stop({
timeout: 0 })` in `afterAll`.
- `config.set('csrf.enabled', false)` and `serveCountries(...)` in
  `beforeEach`.
- `server.inject` with `auth: sessionAuth('<unique id>')`.
- nock scopes from `real-mode.js` for every upstream call, asserted with
  `scope.isDone()`.
- coverage: GET render, every validation rule's message, raw values
  preserved on a 400, the exact API body on success and the redirect, the
  API 400 re-render, an upstream 5xx returning 500 with the banner,
  cancel.

Extend the feature's `copy.test.js`. Assert English literals — a literal
pin catches copy drift.

## Playwright feature test

Add `features/<name>/fit/<name>.fit.spec.js`, or a spec in the group's
`fit/`. `import { signIn } from '<relative>/fit/sign-in.js'`. Every test
signs in with its own organisation id (`stub-org-<page>-<case>`, with
`crypto.randomUUID()` when the test writes), because the address-book
stub keys its data by organisation — the `-empty` and `-paginated`
suffixes select the empty and 30-record seeds, and anything else gets one
seed at `SEED_ADDRESS_ID`. Use raw role, label and copy locators, rely on
auto-waiting, and use no sleeps and no page objects. Use
`getByRole('link', { name: 'Back', exact: true })` — the phase banner's
"feedback" link also matches "Back" without `exact`.

Cover: initial render, happy-path save and redirect, each validation rule
(via `expectErrorFocusOn`), preserved values, and cancel/back navigation.

## Accessibility test

Call `expectNoSeriousOrCriticalAxeViolations(page, name)` from
`address-form.js` on the initial render and on the validation-error state
(`await expect(page.getByRole('alert')).toBeVisible()` first). It checks
`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and `wcag22aa`, and fails on a
serious or critical violation.

## 9. Run every check

```bash
npm run format:check
npm run lint
npm test
npm run test:fit
```

Green means every command exits with code 0, Vitest has no failed tests,
Playwright has no failed specs, and lint has no errors. Pass `PORT=3052`
to `npm run test:fit` when the workspace stack is serving this frontend on 3002.

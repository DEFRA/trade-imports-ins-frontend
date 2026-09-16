# Feature anatomy

`src/server/app/features/` holds one folder per feature. Each is a vertical
slice of paths, controllers, copy, templates, view models and tests, and
[`features/index.js`](../features/index.js) is the barrel whose
`allRoutes` spreads every feature's routes.

## Two shapes

**`dashboard/`** is the single-page shape: `controller.js`, `template.njk`,
`controller.test.js`, `copy/`, `view-model/list.js` (plus its test), and
`dashboard.fit.spec.js` beside the controller.

**`address-book/`** is the multi-page group: one folder per page (`list/`,
`add/`, `view/`, `edit/`, `delete/`), each holding `<page>.controller.js`,
`template.njk` and `<page>.controller.test.js`. Group-wide modules sit at the
root:

- [`fields.js`](../features/address-book/fields.js) — `FIELD_RULES`,
  `FIELDS`, `formValuesOf` and `addressRules(countryCodes)`.
- [`address-countries.js`](../features/address-book/address-countries.js) —
  puts GB first, rejects with a 503 Boom when reference data is empty,
  `buildCountrySelectItems`, `resolveCountryCodeFromSearchTerm`.
- [`address-id-params.js`](../features/address-book/address-id-params.js) —
  `addressIdParams`, `addressIdRouteOptions`.
- [`stored-address.js`](../features/address-book/stored-address.js) —
  `loadStoredAddress` 404s a tombstoned record; `boomFor` maps client
  errors to Boom.
- [`success-banner.js`](../features/address-book/success-banner.js) —
  yar-backed, read-once.

Plus one shared `copy/` pair, `view-model/list.js`, and `fit/` with five
specs plus the fixtures `address-form.js`, `axe.js` and `seed-address.js`.

## Paths

[`shared/paths.js`](../shared/paths.js) is the only module that writes a
URL. Each public URL has a builder (`dashboardPath()`, `addressBookPath()`,
`addressAddPath()`, `addressPath(id)`, `addressEditPath(id)`,
`addressDeletePath(id)`), and each parameterised one a `*RoutePath()` twin
carrying the Hapi `{id}` placeholder. Ids are `encodeURIComponent`ed.
Controllers pass a `*RoutePath()` to `kit.pageRoutes` and put every href
the template needs into the view model (`listHref`, `addHref`, `editHref`,
`deleteHref`, `backLink` through `kit.base`).
[`paths.test.js`](../shared/paths.test.js) pins every public URL as a
test; [`routes.test.js`](../routes.test.js) pins the exact route list.

## The page kit

[`shared/kit.js`](../shared/kit.js):

- **`base(title, { backLink, recoverableError })`** returns `{ layout,
pageTitle, backLink, sharedCopy, recoverableError, contentColumnClass }`
  — a two-thirds column by default; a page that lays out a table overrides
  `contentColumnClass: kit.surfaceClass('display')`.
- **`pageRoutes(path, { get, post }, options = routeOptions)`** emits the
  GET and, when `post` is given, the POST. `routeOptions` is `{ auth:
'session' }`; the `{id}` pages pass `addressIdRouteOptions`.
- **`errorSummary(errors)`** turns a `{ field: message }` map into the
  govukErrorSummary model, or `null` when there are no errors.
- **`requireOrganisationId(request)`** throws `Boom.forbidden` when the
  session carries none.
- `sharedCopy` is the resolved chrome copy. `fieldError` is exported and
  unused — templates read the error map directly (see below).

## Controllers

The shape every ins controller takes, citing
[`add/add.controller.js`](../features/address-book/add/add.controller.js):

- a module-level `logger`, `view` and `copy`.
- a `buildView(h, model)` helper spreading `kit.base(...)` and adding
  `copy`, `errors`, `errorSummary: kit.errorSummary(errors)`.
- bare `get`/`post` arrows.
- `HTTP_STATUS_*` constants from [`lib/http-status.js`](../lib/http-status.js).
- POST reads `request.payload`, honours `cancel`, validates, calls the
  service, sets the success banner and redirects. A service failure logs
  once (`logger.error({ err, orgId }, '…')`) and re-renders with
  `recoverableError: true` and status 500 — the layout renders the banner.
  A 400 from the address book re-renders with
  `mapApiErrorsToFormErrors(err.body)`.
- `export const routes = kit.pageRoutes(...)`.

The `{id}` pages load through `loadStoredAddress` and throw `boomFor(err,
() => logger.error(...))`.

## Copy and templates

The copy pair rule, in full: a templated feature owns `copy/copy.en.js`,
`copy/copy.cy.js` and `copy/copy.test.js`; both export `copy`; a leaf is a
non-empty string or a string-returning function (parameterised copy, for
example `successBanner.added(name)`); `cy` must have the same paths, leaf
kinds and function arities as `en`, and every string leaf must differ from
its English counterpart unless listed in
`copy-parity.test.js`'s `IDENTICAL_ALLOWLIST`, which is empty; no copy file
may sit at a feature root.

The controller resolves `const copy = copyFor({ en, cy })` from
[`shared/copy.js`](../shared/copy.js) and passes it to the view. Shared
chrome copy (`layout`, `unauthorised`, `errorSummary`, `recoverableError`,
`errorPage`) and `validatorDefaults` live in
[`shared/copy.en.js`](../shared/copy.en.js) and `copy.cy.js`, and reach
every view as `sharedCopy`.

Every `copy.cy.js` is machine-draft Welsh awaiting Welsh Language
Standards sign-off, and no locale toggle exists, so every call site
resolves `en`.

Templates: extend `shared/layout.njk`, import macros at the top, fill the
`journeyContent` block, `{% include "shared/error-summary.njk" %}` above
the `<h1>`, a hidden `crumb` input in every form, fields rendered with
govuk macros, `errorMessage: errors.field and { text: errors.field }`.
Input `name`, `id` and the error-map key stay identical so the summary
link focuses the control. Stay inside the govuk-frontend toolbox.

## Validation

[`lib/validate/index.js`](../lib/validate/index.js) exports
`validate(schema, payload)` → `{ value, errors }` (`errors` is `null` on
success, else `{ field: firstMessage }`), `compose` and the named
factories — `requiredMaxText`, `maxText`, `requiredOneOf`, `requiredEmail`,
dates, times and more. Messages come from the feature's copy
(`errors.<field>.required`, `.maxLength`, `.format`) with
`validatorDefaults` as a fallback.

Build a service-backed rule (`requiredOneOf('countryCode', codes, …)`)
inside the POST handler from the countries just fetched. Persist `value`,
never the raw payload — `formValuesOf(payload)` is validated so only the
nine address fields reach the API.
[`address-id-params.js`](../features/address-book/address-id-params.js)
stays on Joi directly because Hapi's `validate.params` takes a Joi schema.

## Client JavaScript

[`src/client/javascripts/application.js`](../../../client/javascripts/application.js)
initialises the govuk components and `address-book-success-banner.js`. A
page needing more adds a named `entry` to `webpack.config.js` and loads it
with `getAssetPath('<entry>.js')`. Build config is load-bearing.

## Tests

Controller, copy and view-model tests sit beside the feature. Browser specs
are `*.fit.spec.js`: a group's specs live in the group's `fit/`; a
single-page feature's spec sits beside its controller. Both run in the
Playwright `features` project. Every feature spec includes initial-render
and error-state accessibility checks. See [testing.md](testing.md).

# Feature anatomy

`src/server/app/features/` holds one folder per feature. Each is a vertical
slice of paths, controllers, copy, templates, view models and tests, and
[`features/index.js`](../features/index.js) is the barrel whose
`allRoutes` spreads every permanent feature's routes. [`routes.js`](../routes.js)
adds the temporary `address-lookup-spike` feature's routes on top,
gated on `isDevOrLocalEnvironment()` (dev or local CDP environment
only) — see [The temporary address-lookup-spike feature](#the-temporary-address-lookup-spike-feature)
below.

## Two shapes

**`dashboard/`** is the single-page shape: `controller.js`, `template.njk`,
`controller.test.js`, `copy/`, `view-model/list.js` (plus its test), and
`dashboard.fit.spec.js` beside the controller.

**`address-book/`** is the multi-page group: one folder per page (`list/`,
`add/`, `view/`, `edit/`, `delete/`), each holding `<page>.controller.js`,
`<page>.njk` and `<page>.controller.test.js`. Group-wide modules sit at the
root:

- [`fields.js`](../features/address-book/fields.js) — `FIELD_RULES`,
  `FIELDS`, `isRequiredField`, `formValuesOf` and
  `addressRules(countryCodes)`, plus `POSTAL_LINE_FIELDS` (address line 1,
  address line 2, town or city, county and postcode, in display order),
  `ADDRESS_FIELDS` (name, the postal-line fields and country) and
  `addressFieldText` (a field's display text, or null when it is blank or
  only spaces) with `postalLinesOf` built on the same blank rule. The list
  reads `postalLinesOf`; the view rows and the delete summary read
  `ADDRESS_FIELDS` through `addressFieldText`. Each field's `required` sets both whether a blank value is
  refused and whether the view always shows its row. Each field's
  `maxLength` and `required` match the address book API's `AddressRequest`
  validation, so the form refuses what the API would refuse.
- [`address-countries.js`](../features/address-book/address-countries.js) —
  lists the countries alphabetically, United Kingdom included in its place, rejects with a 503 Boom when reference data is empty,
  `buildCountrySelectItems` (the add form's select, always opening on a blank
  option), `buildEditCountrySelectItems` (the edit form's select, with a
  blank option only when the country it shows is not one the list offers) and
  `countryCodesMatching` (every country code whose name contains the search term).
- [`address-id-params.js`](../features/address-book/address-id-params.js) —
  `addressIdParams`, `redirectingAddressIdRouteOptions`.
- [`return-to.js`](../features/address-book/return-to.js) — `honouredReturnOf`
  gives the `return` query when it is an INS path or, outside stub mode, a URL on
  exactly the animals frontend origin, else null; `pathWithReturn` carries it on;
  `returnDestinationOf` and `deadLinkDestination` send a dead link or a finished
  delete there, or to the list when it is one of that address's own pages.
  `editLeaveDestinationOf` gives where the edit page's Back link and Cancel go:
  the honoured return, else the address's details page.
  A `return` holding a backslash, a carriage return or a line feed is refused:
  browsers and the URL parser rewrite a backslash into an off-site redirect, and
  a line break splits the `Location` header. An INS path is resolved against a
  stand-in origin and kept only when that origin survives, then given back
  percent-encoded so it is safe in a `Location` header. A refused, non-empty
  `return` is logged at info with the request path and the reason, never the
  value itself.
- [`stored-address.js`](../features/address-book/stored-address.js) —
  `findLiveAddress` resolves an unknown or deleted address to `undefined`;
  `findLiveAddressWithCountryLabel` adds the country's label to a live one;
  `isNotFound` tells a client 404; `boomFor` passes a Boom through, turns a
  client 404 into `Boom.notFound()` and makes anything else a logged
  `Boom.internal()`.
- [`success-message.js`](../features/address-book/success-message.js) —
  yar-backed, read-once.

Plus one shared `copy/` pair, `view-model/list.js`, and `fit/` with five
specs plus the fixtures `address-book-list.js`, `address-form.js`, `axe.js`,
`dashboard.js` and `seed-address.js`. `view-model/list.js` owns the list's
name lines, postal lines and results line, which the list controller builds
into table cells.

## Paths

[`shared/paths.js`](../shared/paths.js) is the only module that writes a
URL, with one exception: the temporary `address-lookup-spike` feature
keeps its own `'/address-lookup-spike'` literal in its controller (see
below). Each public URL has a builder (`dashboardPath()`, `addressBookPath()`,
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

- **`base(title, { backLink, recoverableError, journeyStrip })`** returns
  `{ layout, pageTitle, backLink, sharedCopy, recoverableError, journeyStrip, contentColumnClass }`.
  `journeyStrip` is `null` unless a page passes one, and the layout shows the strip above the page content
  only when it is set. `contentColumnClass` is the two-thirds form column
  (`SURFACES.form`) by default, and a page that lays out a table overrides
  it with `kit.surfaceClass('display')`.
- **`pageRoutes(path, { get, post }, options = routeOptions)`** emits the
  GET and, when `post` is given, the POST. `routeOptions` is `{ auth:
'session' }`; the view, edit and delete pages pass
  `redirectingAddressIdRouteOptions(deadLinkDestination)`, so a dead link
  returns to an honoured `return`, or to the list.
- **`errorSummary(errors)`** turns a `{ field: message }` map into the
  govukErrorSummary model, or `null` when there are no errors.
- **`draftJourneyStrip(reference)`** returns the strip for a notification
  in progress: `{ status: { text, classes }, reference }`, the status being
  the shared copy's draft wording in a blue tag.
- **`requireOrganisationId(request)`** throws `Boom.forbidden` when the
  session carries none.
- `sharedCopy` is the resolved chrome copy. Templates read the error map
  directly (see below).

## Controllers

The shape every ins controller takes, citing
[`add/add.controller.js`](../features/address-book/add/add.controller.js):

- a module-level `logger`, `view` and `copy`.
- a `buildView(toolkit, model)` helper spreading `kit.base(...)` and adding
  `copy`, `errors`, `errorSummary: kit.errorSummary(errors)`.
- bare `get`/`post` arrows.
- `HTTP_STATUS_*` constants from [`lib/http-status.js`](../lib/http-status.js).
- POST reads `request.payload`, honours `cancel`, validates, calls the
  service, sets the success banner and redirects. A service failure logs
  once (`logger.error({ err, organisationId }, '…')`) and re-renders with
  `recoverableError: true` and status 500 — the layout renders the banner.
  A 400 from the address book re-renders with
  `mapApiErrorsToFormErrors(err.body)`.
- `export const routes = kit.pageRoutes(...)`.

The view and delete GETs load through `findLiveAddressWithCountryLabel`, and
the edit GET through `findLiveAddress`. When either finds nothing, the GET
redirects via `returnDestinationOf` (an honoured return, else the list),
logging the redirect at info with `{ organisationId, addressId }`; the delete
POST treats a 404 from `deleteAddress` the same way. Anything else in a GET
or the delete POST throws `boomFor(err, () => logger.error(...))`.

The edit POST reads `findLiveAddress` before it validates, and redirects a
not-live address the same way, sending nothing. It does the same for a 404
from `updateAddress`. It rethrows a Boom untouched, so reference data with no
countries still serves the 503 page, and re-renders every other failure,
including a failed live read, as the POST shape above describes.

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
chrome copy (`layout`, `journeyStrip`, `unauthorised`, `errorSummary`,
`recoverableError`, `errorPage`) and `validatorDefaults` live in
[`shared/copy.en.js`](../shared/copy.en.js) and `copy.cy.js`, and reach
every view as `sharedCopy`.

Every `copy.cy.js` is machine-draft Welsh awaiting Welsh Language
Standards sign-off, and no locale toggle exists, so every call site
resolves `en`.

Templates: extend `shared/layout.njk`, import macros at the top, fill the
`journeyContent` block, `{% include "shared/error-summary.njk" %}` above
the `<h1>`, a hidden `crumb` input in every form, fields rendered with
govuk macros, `errorMessage: errors.field and { text: errors.field }`.
The add and edit forms render their Address and Contact details fields
through the one `addressFields` macro in
[`address-fields.njk`](../features/address-book/address-fields.njk), passed
its copy, form values, country items and errors in a single params
object, and it sets each personal-data field's browser `autocomplete`
hint.
Input `name`, `id` and the error-map key stay identical so the summary
link focuses the control. Stay inside the govuk-frontend toolbox.

## Validation

[`lib/validate/index.js`](../lib/validate/index.js) exports
`validate(schema, payload)` → `{ value, errors }` (`errors` is `null` on
success, else `{ field: firstMessage }`), `compose` and the named
factories — `requiredMaxText`, `maxText`, `requiredOneOf`, `oneOf`,
`requiredEmail`, `maxEmail`,
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
initialises the govuk components. A
page needing more adds a named `entry` to `webpack.config.js` and loads it
with `getAssetPath('<entry>.js')`. Build config is load-bearing.

## The temporary address-lookup-spike feature

`address-lookup-spike/` is a dev/local-only spike page, kept
self-contained so that removing it means deleting the folder and its
one line in [`routes.js`](../routes.js) — no permanent feature depends
on it. It does not follow the dashboard or address-book shape for
paths: it keeps its own `'/address-lookup-spike'` literal rather than a
`shared/paths.js` builder, and its routes are added on top of
`allRoutes` rather than through `features/index.js`, because
`routes.js` only registers it when `isDevOrLocalEnvironment()` is true.

The page has one search box. `detect-search-mode.js` sends anything
shaped like a UK postcode as `postcode=` and everything else as `find=`.
The pattern is deliberately simple: a wrong guess only returns no
results. `GIR 0AA` and a partial postcode such as `SW1A` go to `find`.
A postcode is sent upper case with one space before the last three
characters, which is how the lookup returns and expects it, so `sw1a1aa`
still finds a match.

`map-to-address-fields.js` maps one lookup result onto the address
book's fields in `address-book/address-schema.js`. Nothing is saved; the
mapping is a proposal for the permanent build. The lookup returns
nothing shaped like the form, and the spike shows three gaps:

1. Address line 1 has to be composed, and the fields that carry the name
   vary by address. Dev returned Buckingham Palace with the whole name
   in `subBuildingName` and `buildingName`, `buildingNumber` and
   `street` all null.
2. The lookup has no county.
3. `country` is upper-case free text (`ENGLAND`), where the form wants an
   ISO code from reference data.

Line 1 is the premises (sub-building, then building name, as in "Unit 1,
Downing House"), and line 2 is the number and street with the locality.
With no premises, line 1 is the number and street ("1 Downing Street").
With neither, line 1 falls back to `addressLine`, the whole formatted
address including town and postcode, because an empty line 1 fails the
form's validation; the page lists that as a gap.

## Tests

Controller, copy and view-model tests sit beside the feature. Browser specs
are `*.fit.spec.js`: a group's specs live in the group's `fit/`; a
single-page feature's spec sits beside its controller. Both run in the
Playwright `features` project. Every feature spec includes initial-render
and error-state accessibility checks. See [testing.md](testing.md).

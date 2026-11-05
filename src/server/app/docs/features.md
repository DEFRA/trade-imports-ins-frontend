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
`address-type/`, `add/`, `view/`, `edit/`, `delete/`), each holding `<page>.controller.js`,
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
  validation, so the form refuses what the API would refuse. The same file owns
  the roles question's rules: `postedRolesOf` (the posted `roles` as a list) and
  `rolesErrorsOf` (the required-role error when none is kept; the add
  controller keeps the posted roles the chosen address type offers through the
  address book's `keepRolesOfferedBy`), and `storedRolesOf`, the roles an edited
  address carries back to the API unchanged. `FIELD_RULES` holds the fields in
  the order the form asks them, which is the order validation errors are
  listed in.
- [`address-countries.js`](../features/address-book/address-countries.js) —
  lists the countries alphabetically, United Kingdom included in its place, rejects with a 503 Boom when reference data is empty,
  `buildCountrySelectItems` (a select that opens on a blank option),
  `addFormCountryOffer` (the add form's select items, accepted country codes and form values, for a handshake context
  and the chosen address type:
  United Kingdom alone, selected and accepted as the only country, with the
  form values' country fixed to `GB`, when the handshake's party must be in the
  United Kingdom according to `journey-registry.js` or, with no handshake, when
  `addressTypeRequiresUnitedKingdom` holds the chosen type, else the blank
  option, every served country and the form values as given),
  `buildEditCountrySelectItems` (the edit form's select, with a
  blank option only when the country it shows is not one the list offers) and
  `countryCodesMatching` (every country code whose name contains the search term).
- [`journey-registry.js`](../features/address-book/journey-registry.js) —
  `JOURNEY_TYPES` (the registered journey types), `ADDRESS_LANDING` (select,
  return and cancel, the page the journey opens on return),
  `isKnownJourneyType`, `requiresUnitedKingdomAddress`
  (whether the role's address must be in the United Kingdom: the address type
  of its role is one `addressTypeRequiresUnitedKingdom` holds, and the party is
  not the consignment contact), `ownAndOtherRolesOfParty` (the party's own role and the
  other roles on its side, in `ROLES_BY_ADDRESS_TYPE` order, which feeds the add
  page's checkboxes; no own role and no other roles for a fulfilment id the map
  does not list), `rolesOfParty`
  (the roles a journey-mode save carries: the party's own
  role (`roleOfParty`) plus the posted roles its address type offers, through
  the address book's `keepRolesOfferedBy`), `isConsignmentContact` (whether a
  handshake is the consignment contact's, so the add page offers the contact's
  controls rather than a role's), `buildReturnUrl` (the journey's address-return
  URL, with an optional address id and `landing`) and
  `CONSIGNMENT_CONTACT_FULFILMENT_ID` (the consignment contact's fulfilment id).
  The `gbn-ag` registry entry's `roleByPartyFulfilmentId` map is the one map
  from each party's fulfilment id, the five roles and the consignment contact,
  to the party's own role, which its address is always saved with alongside any
  ticked roles its side offers; `ownAndOtherRolesOfParty`,
  `rolesOfParty` and `requiresUnitedKingdomAddress` read it.
- [`address-book-tabs.js`](../features/address-book/address-book-tabs.js) —
  `ADDRESS_BOOK_TABS` (the list's three tabs in order, each with its address
  type, the roles its Type select offers in order, and the copy key of its label
  and panel heading), `DEFAULT_ADDRESS_BOOK_TAB` (the Origin and Consignor tab),
  `resolveTab` (the tab a requested address type names, else nothing) and
  `resolveRole` (the requested role when the tab offers it, else nothing). The
  list controller serves the default tab when `resolveTab` finds none, and
  logs a requested address type it replaced. The address type values (`ADDRESS_TYPES`) and the roles each
  lists (`ROLES_BY_ADDRESS_TYPE`) belong to `services/address-book`, imported
  through its barrel.
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
- [`add-in-progress.js`](../features/address-book/add-in-progress.js) —
  yar-backed state of the add in progress: `storeChosenAddressType` stores
  the address type chosen on the type page beside any entry already stored,
  `storedChosenAddressType` reads the type back (only a value in `ADDRESS_TYPES`,
  else nothing), `storeEnteredAddress` and `storedEnteredAddress` store and read
  the field values and `tickedRoles` posted with the add form, and `clearAddInProgress`
  removes everything, on a new add and on a save.

Plus one shared `copy/` pair, `view-model/list.js`, and `fit/` with six
specs plus the fixtures `address-book-list.js`, `address-form.js`, `axe.js`,
`dashboard.js`, `return-query.js` and `seed-address.js`. `view-model/list.js` owns the list's
name lines, Type label, postal lines and results line, which the list
controller builds into table cells, the roles whose Type label contains the
search term (`rolesWhoseLabelContains`, which the search also matches), and the
list's hrefs, which carry the tab, the search, the Type and the page. A tab
link carries the tab and the current search only.

## Paths

[`shared/paths.js`](../shared/paths.js) is the only module that writes a
URL, with one exception: the temporary `address-lookup-spike` feature
keeps its own `'/address-lookup-spike'` literal in its controller (see
below). Each public URL has a builder (`dashboardPath()`, `addressBookPath()`,
`addressAddPath()`, `addressTypePath()`, `addressTypeStartPath()` (the
type page with the marker that starts a new add), `addressPath(id)`,
`addressEditPath(id)`, `addressDeletePath(id)`), and each parameterised one a `*RoutePath()` twin
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
- **`draftJourneyStrip(notificationId)`** returns the strip for a notification
  in progress: `{ status: { text, classes }, notificationId }`, the status being
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

The add page, [`add/add.controller.js`](../features/address-book/add/add.controller.js),
adds to that shape for a journey:

- `addModeFor(handshakeContext)` decides the page's mode once, as one of
  `ADD_MODES`: `ADDRESS_BOOK` (no handshake), `ROLE_HANDSHAKE` (a role's
  journey) or `CONSIGNMENT_CONTACT` (the consignment contact's journey).
  `backHrefFor` gives the Back link and the journey strip shows for both
  handshake modes.
- From the address book (`ADDRESS_BOOK` mode) the GET and the POST need an
  address type chosen on the type page, else the one guard,
  `redirectIfNoAddressTypeChosen`, logs and redirects to the type page; a
  handshake opens the form directly. Back goes to the type page. The form
  opens with the entry kept from an earlier POST (its field values and ticked
  roles) or, with none, United Kingdom selected; the POST keeps what was posted
  before any check, so a refused save and a Back to the type page leave the
  entry for the form to reopen with. A successful save clears the add in
  progress. A type that must be in the United Kingdom (Destination, Consignee
  or Importer, and Branch) shows United Kingdom alone, whatever was kept or
  posted, and a save whose posted country was replaced with United Kingdom is logged once at info.
- In `ADDRESS_BOOK` mode after the contact fields the form shows the roles question: a visible
  section break, then checkboxes named `roles` (the first option's id is `roles`,
  so the error summary link focuses it) under the legend `copy.roles` holds for
  the chosen type, offering the chosen type's roles from
  `ROLES_BY_ADDRESS_TYPE`, labelled from `copy.roles`. `roleItemsOf` builds the
  checkbox items from an ordered list of roles and the ticked roles, and each
  mode passes its own order: the address book add passes its type's roles with
  the place roles `address-types.js` marks first, and a role handshake passes
  the party's other roles in `ROLES_BY_ADDRESS_TYPE`'s order. The POST checks the
  roles only once the address and contact fields pass; it keeps the posted roles
  the chosen type offers (logging any it discards at info), re-renders with
  the required-role error when none is kept, and otherwise saves the validated
  fields with the kept roles and redirects to the
  address book list on that type's tab. In `ROLE_HANDSHAKE` mode the form shows
  the "What else should this address be used for?" question after the same
  visible section break, with a hint naming only the party's own role ("This
  address is being added as a <Role> address…") and checkboxes for the other
  roles on its side, all unticked and optional: no error is raised for it, the
  ticked roles stay ticked when the page is shown again with errors, and the
  save carries `rolesOfParty`: the party's own role and the
  ticked roles the party's page offers (logging any it discards at info, with
  the notification and fulfilment ids). The consignment contact's form has no
  roles question.
- `cancelUrlFor(addMode, handshakeContext)` is the one owner of where Cancel
  goes: the address book, a role's journey with the `cancel` landing, or the
  consignment contact's journey with no landing.
- `add.njk` renders Cancel by `addMode` and picks each label: from the address
  book, a link labelled `copy.add.cancel`; from a role's journey, a link
  labelled `copy.add.cancelToHub`; from the consignment contact's journey, a
  `cancel` button labelled `copy.add.cancelAndReturnToAddressPage`. Both links go to
  `cancelHref`.
- The POST honours `cancel` for every mode, redirecting to `cancelUrlFor`, and
  logs the hand-back at info when the page came from a journey.
- From a role's journey, the chosen `action` (Save and select, or Save and
  return to the address page) names the landing the address is handed back
  with; the consignment contact's Save hands it back with the select landing.

The view and delete GETs load through `findLiveAddressWithCountryLabel`, and
the edit GET through `findLiveAddress`. When either finds nothing, the GET
redirects via `returnDestinationOf` (an honoured return, else the list),
logging the redirect at info with `{ organisationId, addressId }`; the delete
POST treats a 404 from `deleteAddress` the same way. Anything else in a GET
or the delete POST throws `boomFor(err, () => logger.error(...))`.

The edit POST reads `findLiveAddress` before it validates, and redirects a
not-live address the same way, sending nothing. It does the same for a 404
from `updateAddress`. It saves the validated fields
with the stored address's roles, because the address book
replaces the whole record; the edit page shows neither. It rethrows a Boom untouched, so reference data with no
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
inside the POST handler from the country codes the form offered (the add
form's `addFormCountryOffer` gives them). Persist `value`,
never the raw payload — `formValuesOf(payload)` is validated so only the
nine address fields reach the API, together with the
roles kept for it (the kept roles on an add, the party's own role
plus the ticked roles its page offers on a journey add, and the
stored address's roles on an edit). No address type is sent.
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

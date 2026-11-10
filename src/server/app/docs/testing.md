# Testing

Run commands from the repository root.

## Unit suite

`npm test` builds the client (`pretest`) then runs Vitest with coverage.
`npm run test:watch` does neither.
[`vitest.config.js`](../../../../vitest.config.js): globals, Node
environment, **`STUB_MODE=true` for the whole suite** — a test that
needs the HTTP clients opts into real mode itself — `TZ=UTC`, and
`AWS_EMF_ENVIRONMENT=Local`, so metrics are written to the console the
metric tests read. A bare `npx vitest run` gets the same environment as
`npm test`. Tests sit beside their subject.

Date tests in [`lib/validate/calendar.test.js`](../lib/validate/calendar.test.js)
move the process zone with
[`runInZone`](../../common/test-helpers/run-in-zone.js). Under `TZ=UTC`, code
that reads the process zone gives the same day as code that does not, so a
zone mistake cannot fail a test there. Each zone guards one kind of input:

- `WEST_OF_UTC` (`America/New_York`) guards a midnight-UTC instant. Read in
  the process zone, it falls on the day before. The `formatDateText`,
  `addUtcDays` and `addUtcMonths` cases cover this.
- `EAST_OF_UTC` (`Pacific/Auckland`) guards a date-only string parsed as
  local midnight. Read as UTC, it falls on the day before. The
  `parseDateText` case covers this.

Each mistake shows in one zone only, so a zone case runs in the zone that
catches it. A function that creates no Date in the process zone, such as
`formatDisplayCalendarDate`, gets no zone case: no zone can change its
answer.

Convention checks:

- [`routes.test.js`](../routes.test.js) — the exact route list, session
  auth on every route, `addressIdParams` on every `{id}` route.
- [`copy-convention.test.js`](../copy-convention.test.js)
- [`copy-parity.test.js`](../copy-parity.test.js)
- [`shared/paths.test.js`](../shared/paths.test.js)
- [`shared/kit.test.js`](../shared/kit.test.js)
- [`shared/list-page.test.js`](../shared/list-page.test.js)
- [`shared/escape-html.test.js`](../shared/escape-html.test.js)
- [`shared/layout.test.js`](../shared/layout.test.js) — service
  navigation, phase banner, back link, banner, title prefix, surfaces,
  assets, footer.

## Controller tests

See [`add/add.controller.test.js`](../features/address-book/add/add.controller.test.js)
for the pattern, and the helpers in
[`common/test-helpers/`](../../common/test-helpers/): `real-mode.js`
(`runInRealMode()`, `refuseOutboundHttp()`, `addressBookApi()`,
`referenceDataApi()`, `insBackendApi()`, `serveCountries(list)`),
`module-logger-lines.js` (`recordModuleLoggerInfo()`,
`recordModuleLoggerWarn()` and `recordModuleLoggerError()`, which record the
info, warn or error lines the module-level logger writes during each test of
the enclosing `describe`, and return `entriesWith(message)`, the lines logged
with that message),
`address-book-requests.js`, the one owner of the address book tests'
set-up: page paths (`addressBookPath()`, `addressAddPath()`,
`addressTypePath()`, `addressTypeStartPath()`, `addressPath(id)`,
`addressEditPath(id)` and `addressDeletePath(id)`, re-exported from
`app/shared/paths.js`; a test that needs a return query builds it with
`pathWithReturn` from `return-to.js`), address book API paths
(`addressesApiPath(organisationId)`, `addressApiPath(addressId,
organisationId)`, both defaulting to the session organisation), fixtures
(`ADDRESS_ID`, `STORED_ADDRESS` (with two roles),
`VALID_ADDRESS_FIELDS` (the nine address fields), `VALID_ADDRESS_RECORD` (those
fields with the stored address's roles), `VALID_ADDRESS_PAYLOAD` (the
fields with Place of origin ticked), `INVALID_ADDRESS_PAYLOAD`, `ADDRESS_FORM_LABELS` (the add and edit forms'
field labels in page order, written out as literals), `COUNTRIES`,
`MALFORMED_ADDRESS_ID`,
`ORGANISATION_ID_HEADER`, `OTHER_ORGANISATION_ID`), selectors (`BACK_LINK`,
`COUNTRY_OPTIONS`, `SELECTED_COUNTRY_OPTION`), requests (`getPage()` and
`postPage()`, which take an optional session cookie, `cookieAfterChoosingAddressType()`,
which posts a type through the real type page, on an existing session cookie when given one, and returns the session cookie
the add form's GET needs, `cookieHeaderOf()`, which turns a response's
`set-cookie` headers into a request cookie, and `getPageAsOtherOrganisation()`), address book API stubs
(`pageOf(items, overrides)`, `serveStoredAddress(address)`,
`serveAddressNotFound(addressId)`, `serveAddressBookServerError(path)`,
`serveAddressNotFoundForOtherOrganisation(addressId)`,
`serveAddressCreated(matchBody)`, which stubs a successful create call whose
body matches `matchBody`, by default any body that carries roles and no
address type, and
`serveAddressCreationCapturingBody()`, which stubs it and
returns the body it received alongside the scope) and checks
(`expectRedirectTo()`, `expectServerErrorPage()`), which every address
book test imports instead of keeping a local copy,
`expect-address-form-widths.js` (`expectAddressFormWidths(result)`, the
add and edit forms' field widths),
`expect-address-form-autocomplete.js`
(`expectAddressFormAutocomplete(result)`, the add and edit forms' browser
autocomplete hints, read from `address-form-autocomplete.js`'s
`AUTOCOMPLETE_BY_FIELD` and `FIELDS_WITHOUT_AUTOCOMPLETE`, which the fit
specs import too),
`journey-handshake.js` (`handshakeContextOf(handshake)`, the handshake
context the app builds from a handshake's query or form fields,
`JOURNEY_HANDSHAKES_BY_PARTY`, one complete journey
handshake for each of the place of origin, consignor, consignee, importer and
place of destination, `CONSIGNMENT_CONTACT_HANDSHAKE`, the consignment contact's
handshake, `ANIMALS_BASE_URL`, the animals frontend's base URL the return
URLs start with, and `returnUrlFor(handshake, { addressId, landing })`, the
return URL a test expects for a handshake, built from that handshake's own
ids and token; the Vitest tests and the fit specs both use these;
`ROLES_BY_PARTY`, each party's own role and the other roles on its
side, `journeyRolesHintFor(party)`, the roles question's hint naming that
party's own role, and `UNREGISTERED_JOURNEY_TYPE`, a journey type the
registry does not list, `RECEIVING_PARTIES`, the consignee, importer and
place of destination, and `SENDING_PARTIES`, the place of origin and
consignor),
`expect-draft-journey-strip.js` (`expectDraftJourneyStrip($,
notificationId)`, the Draft tag and notification id in the
journey strip, found by `journey-strip.js`'s `JOURNEY_STRIP` selector,
which the fit specs import too),
`expect-add-form-country-select.js` (`expectPlaceholderThenCountriesNoneSelected($, countryNames)` and
`expectPlaceholderThenCountriesUnitedKingdomSelected($, countryNames)`, the add form's
Country select),
`expect-address-form-errors.js` (`expectSummaryAndFieldErrors($, errors)`,
the exact error summary links and the messages beside the fields, and
`INVALID_ADDRESS_PAYLOAD_ERRORS`, the errors `INVALID_ADDRESS_PAYLOAD`
shows),
`rendered-text.js` (`textOf($, selectorOrElement)`, `textsOf($, selector)`
and `normalisedText(text)`, a rendered element's text trimmed with its
whitespace collapsed to single spaces, which every Vitest test reads text
through),
`open-empty-address-book-with-cookies.js`
(`openEmptyAddressBookWithCookiesFrom(server, sessionId, postHeaders)`, which
opens the address book list with the cookies a POST set so a test can
read the banner),
`session-auth.js` (`sessionAuth(sessionId, overrides)` and
`ORGANISATION_ID`, the one test organisation id),
`address-book-stub.js` (`STUB_SEED_ADDRESS_NAME`, the name of the address the
stub seeds for an ordinary organisation, `STUB_LIST_PAGE_SIZE`, the page size
the list asks the stub for, and `listedStubNames(organisationId, query)`, the
names the stub lists at that page size),
`mock-oidc-config.js` (`mockOidcConfig`), `mock-auth-config.js`
(`mockAuthConfig(importOriginal)`), `test-server.js`
(`startTestServer()`, `stopTestServer(server)`, `startRealModeServer()`,
`startRealModeServerServingCountries(countries)`, which returns a getter
for the started server), `restore-config-after-each.js`
(`restoreConfigAfterEach(keys)`, which restores the named config keys after
each test) and `serve-oidc-discovery.js`. That file exports
`serveOidcDiscovery()`, which serves the OIDC discovery document at the
network boundary, and `startRealModeServer()` calls it. It also exports
`discoveryUrlRequest({ persist, ...scopeOptions })`, the nock interceptor at
the configured discovery URL, for a test that matches a header, delays the
reply or fails it. It also exports
`runAgainstMockOidcDiscoveryUrl({ restoringConfigKeys })`, which refuses
outbound HTTP, restores the discovery URL and the named config keys after each
test, and sets the discovery URL to a mock host before each test, and
`runAgainstServedOidcDiscovery(document, { restoringConfigKeys })`, which does
the same and also serves the given discovery document before each test.
`emf-documents.js` exports `readEmfDocuments(logSpy)`, the EMF documents
written to a console.log spy, and `awaitEmfDocumentForOperation(logSpy,
operation)`, which waits for and returns the EMF document for one external
call's operation. The last file, `stack-defra-id-rewrite.js`, exports
`setStackDefraIdRewrite()`, which sets the workspace stack's Defra ID
hostname rewrite (enabled, from `host.docker.internal` and
`trade-imports-defra-id-stub`, to `localhost`), and
`STACK_DEFRA_ID_REWRITE_KEYS`, the three config keys to restore.

[`shared/copy-leaves.test-support.js`](../shared/copy-leaves.test-support.js)
holds `itHoldsTextAtEveryLeaf({ en, cy })`, which every copy bundle test calls,
and `sampleCopyText(value)`.

The notification type question keeps its test set-up beside the controller:
[`requests.test-support.js`](../features/notification-type/requests.test-support.js)
(`CRN`, and `requestsTo(getServer)`, which takes the getter
`startRealModeServer()` returns and returns `getPage(user, query)` and
`postType(user, payload)`) and
[`hand-overs.test-support.js`](../features/notification-type/hand-overs.test-support.js)
(`handOversFor({ animalsBaseUrl, plantsBaseUrl })`,
`expectedReturnUrl({ animalsBaseUrl, reference })`, `SAMPLE_REFERENCE` and
`LABELS_IN_ORDER`).

[`list/list.test-support.js`](../features/address-book/list/list.test-support.js)
holds the list's fixtures, nock stubs and Cheerio readers:
the role-backed tabs' `TABLE_HEADINGS`, the Transporter tab's
`TRANSPORTER_TABLE_HEADINGS` and `NO_RESULTS_LINE` (the results line for no
matches; all three come from
[`fit/address-book-list-text.js`](../features/address-book/fit/address-book-list-text.js),
which the fit specs read too),
`startServerWithPageReader()`, `stubAddressPage(query, addressPage)`,
`stubAddressBookUnavailable()` and `stubTransporterPage(query,
transporterPage)` (all three go through the one interceptor builder,
`interceptListRequest`, which intercepts whichever route the query's
`tabAddressType` names — the addresses route with that tab's roles, unless
the query sends another `addressType` or one `role`, or the transporters
route for the Transporter tab — so the unavailable stub fails that same
route), `contentOf`, `tableHeadingsOf`, `subNavigationOf`,
`subNavigationLinksOf`, `typeSelectStateOf` (the one Type select's label,
option texts, options with an empty value and chosen options, whatever its
query-parameter name), `panelHeadingTextOf`, `resultsLineOf`,
`bodyRowCountOf`, `rowCellsOf` and `tagNamesOf`. A list
controller test calls `const readPage = startServerWithPageReader()`, which
starts the server serving `COUNTRIES` and returns a page reader, and reads
pages with `readPage(url, sessionId)`, which wraps `getPage()`,
loads the HTML into Cheerio and returns `{ $, html, statusCode }`.

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
without an organisation. The exception is countries: its tests live in
[`services/run-mode.test.js`](../services/run-mode.test.js), beside the
journeys' file of the same name, because the module-scope cache has to be
imported cold (`vi.resetModules()` plus a dynamic import) and the mode
flipped through `process.env.STUB_MODE` rather than `config.set` — a
re-imported service reads a fresh convict instance.

An `in stub mode` describe under
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
- **`features`** runs `src/server/app/features/**/*.fit.spec.js` —
  English literals.

The `webServer` boots `npm run fit:start` with `STUB_MODE=true`, so no
other service runs. The Playwright default port is 3002, which is also
the port the workspace stack serves this frontend on — pass `PORT=3052`
when the stack is up; `npm run test:fit:ci` does. Run `npm run
playwright:install` once (Chromium).

Helpers: [`fit/sign-in.js`](../../../../fit/sign-in.js) —
`signIn(page, { organisationId })` navigates to `/auth/stub-sign-in`. The
organisation id is required: `signIn` throws, before navigating, when it is
missing or empty. `signInAndOpen(page, organisationId, path)`, beside it, signs
in and opens a page, and is the helper every FIT uses for both.
[`fit/axe.js`](../../../../fit/axe.js) — the repo's one axe helper beside it,
`expectNoSeriousOrCriticalViolations`, used by every FIT spec that runs axe.
[`fit/error-focus.js`](../../../../fit/error-focus.js) — `expectErrorFocusOn`:
the error summary link is clicked and the field it names takes focus, and
`errorLink`, the error summary link with a message.
[`address-form.js`](../features/address-book/fit/address-form.js) —
`fieldLabels`, `fieldLabelsInFormOrder` (the nine labels in page order), `addressFormCountryNames` (the captured countries fixture's
names plus United Kingdom, alphabetical), `validAddress`, `fillValidAddress`,
`addressTypeRadio` (the type page's radio for an address type), `backLink`,
`saveAndContinueButton`,
`chooseAddressType` (chooses a type on the 'Choose an address type' page and
continues), `openAddForm` (opens the address form through the type page with
a type chosen), `signInAndOpenAddForm` (signs in with an organisation id and
opens the address form through the type page), `roleCheckbox` (the checkbox for one role), `tickRoles` (ticks the
roles checkboxes it is given), `expectInDocumentOrder` (the locators it is given
appear in that order in the page),
`openAddFormFromJourney` (signs in and opens the add form with a journey
handshake, the consignor's by default), `addressTypeListUrl` (an address
type's list URL, written out rather than built by the list view model),
`originOrConsignorListUrl` (the
Origin and Consignor tab's list URL, where a save of that type lands), `addValidAddressToFreshOrganisation` (signs in to a fresh
organisation, goes through the type page, then saves a valid address of the
given type with the roles the caller passes, by default Origin or Consignor
with the type's first role, Place of
origin, and lands on that type's list; `emptyBook: true` signs in to an
organisation the stub seeds no address for), `refuseSaveThenReopenAddForm`
(saves a form with a malformed email, follows Back and chooses the type again), `malformedEmail` (an email value the form refuses as malformed),
`validAddressViewLink`, the two
validation tables.
[`address-book-list.js`](../features/address-book/fit/address-book-list.js) —
`UNSUPPORTED_ADDRESS_TYPE` (an address type no tab offers), `NO_RESULTS_LINE`
and the role-backed tabs' `TABLE_HEADINGS` and the Transporter tab's
`TRANSPORTER_TABLE_HEADINGS` (both re-exported from
`address-book-list-text.js`), `ONE_MATCH_LINE` (the results line for a
single match), `typeCellOf` (the Type cell of the row naming an address),
`transporterAddressCellOf`, `transporterApprovalNumberCellOf` and
`transporterTypeCellOf` (a transporter row's own cells by column),
`openAddressBookList`, `tabLinksOf` (the address type tabs'
links), `selectedTabOf` (the tab marked current), `tabPanelHeadingOf`
(the selected tab's panel heading), `expectNamesListed`
(the names in the list's Name column), `expectAddressBookList`,
`expectEmptyAddressBookList` (asserts the role-backed `TABLE_HEADINGS`, not
an inline copy of them), `searchFieldOf`, `typeSelectOf` (the
Playwright locator for the Type select; the Cheerio reader in
`list.test-support.js` is `typeSelectStateOf`), `followTab` (follows
an address type tab's link), `openFilterDisclosure`,
`expectFilterDisclosureOpensAndCloses`, `searchAndExpectQuery` (submits the
search and, with a `chosenOption`, the Type select, for either filter
parameter),
`resultsLineOf`, `searchAndExpectMatches`, `searchAndExpectSingleMatch`.
[`dashboard.js`](../features/dashboard/fit/dashboard.js) —
`expectDashboard`, `dashboardSearchField`, `searchDashboardFor`.
[`notification-type.js`](../features/notification-type/fit/notification-type.js) —
`expectUnselectedNotificationType`: the browser is on the type question, with
its four options in order and none chosen.
`expectOnlyNotificationTypeChecked`: the browser is on the type question with
the one named option chosen.
[`seed-address.js`](../features/address-book/fit/seed-address.js) —
`seedAddress`, the address the stub seeds for an ordinary organisation,
its `seedAddressLines`, and the unknown and malformed ids.
[`return-query.js`](../features/address-book/fit/return-query.js) —
`withReturn(path, returnTo)`. Page paths come from the app's own
[`shared/paths.js`](../shared/paths.js), never a literal in a spec.
[`transporter-form.js`](../features/address-book/fit/transporter-form.js) —
`transporterTypeRadio` and `transporterContinueButton` (the type question's
own controls), `chooseTransporterType`, the three open helpers
(`openTransporterTypePage`, `openPrivateTransporterForm`,
`openCommercialTransporterForm`), the two valid fixtures
(`validPrivateTransporter`, `validCommercialTransporter`) and their fill
helpers (`fillPrivateTransporterForm`, `fillCommercialTransporterForm`),
`saveTransporterButton` and `cancelTransporterButton` (each taking the
form's own copy, since Save and Cancel read a label per form), and the
re-exported `privateTransporterPath`, `commercialTransporterPath` and
`transporterTypePath`.

Every test signs in with its own organisation id, because the
address-book stub keys its data by organisation; the `-empty`,
`-paginated` and `-typed` suffixes select those seeds (thirty addresses,
four pages of eight; addresses holding roles of all three address
types). The INS backend stub also seeds by organisation: the `-empty` suffix
gives the dashboard no notifications. `isEmptySeedOrganisation` in
[`services/stub-seed.js`](../services/stub-seed.js) decides the `-empty` suffix
for both stubs. No sleeps, no page objects, and
`exact: true` on "Back". On failure read
`test-results/<spec>/error-context.md` and the HTML report in
`playwright-report/`.

`npm run fit:start:workspace` starts the app against the workspace stack
after `scripts/check-workspace-stack.js` confirms the three upstreams
answer `/health`.

## Deployed end-to-end tests

Multi-service coverage does not live in this repository. It belongs in
the shared tests repository
[`DEFRA/trade-imports-ins-tests`](https://github.com/DEFRA/trade-imports-ins-tests),
as its `ins` domain:
`tests/ins/e2e/**/*.spec.ts` and `tests/ins/security/**/*.spec.ts`, run
against the workspace stack or CDP. A cross-repo change must use the same branch name in every
repository it touches.

`.github/workflows/e2e-tests.yml` delegates to the workspace's reusable
`e2e-tests.yml` once the branch image is published, passing its branch name
and the `tests/ins/` test suite, then reports an `E2E Tests` check back to the
pull request. It runs only the `ins` domain's specs. `check-pull-request.yml`'s
two jobs — `pr-validator` and `FIT Tests` — remain the source for unit,
format, lint, coverage and the FIT suite.

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

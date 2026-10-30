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
`address-book-requests.js`, the one owner of the address book tests'
set-up: page paths (`ADDRESS_BOOK_PATH`, `ADD_ADDRESS_PATH`,
`addressPagePath(addressId)`, `editAddressPagePath(addressId)`,
`deleteAddressPagePath(addressId)`, `RETURN_HOME`), address book API paths
(`addressesApiPath(organisationId)`, `addressApiPath(addressId,
organisationId)`, both defaulting to the session organisation), fixtures
(`ADDRESS_ID`, `STORED_ADDRESS`, `VALID_ADDRESS_PAYLOAD`,
`INVALID_ADDRESS_PAYLOAD`, `ADDRESS_FORM_LABELS` (the add and edit forms'
field labels in page order, written out as literals), `COUNTRIES`,
`MALFORMED_ADDRESS_ID`,
`ORGANISATION_ID_HEADER`, `OTHER_ORGANISATION_ID`), selectors (`BACK_LINK`,
`COUNTRY_OPTIONS`, `SELECTED_COUNTRY`), requests (`getPage()`,
`postPage()`, `getPageAsOtherOrganisation()`), address book API stubs
(`pageOf(items, overrides)`, `serveStoredAddress(address)`,
`serveAddressNotFound(addressId)`, `serveAddressBookServerError(path)`,
`serveAddressNotFoundForOtherOrganisation(addressId)`,
`serveAddressCreated(matchBody)`, which stubs a successful create call whose
body matches `matchBody`, and
`serveAddressCreationCapturingBody()`, which stubs it and
returns the body it received alongside the scope) and checks
(`expectRedirectTo()`, `expectServerErrorPage()`), which every address
book test imports instead of keeping a local copy,
`expect-address-form-widths.js` (`expectAddressFormWidths(result)`, the
add and edit forms' field widths),
`expect-address-form-autocomplete.js`
(`expectAddressFormAutocomplete(result)`, the add and edit forms' browser
autocomplete hints, read from `address-form-autocomplete.js`'s
`AUTOCOMPLETE_BY_FIELD`, which the fit specs import too),
`journey-handshake.js` (`handshakeContextOf(handshake)`, the journey type
and fulfilment id of a handshake as a handshake context,
`JOURNEY_HANDSHAKES_BY_ROLE`, one complete journey
handshake for each of the place of origin, consignor, consignee, importer and
place of destination, `CONSIGNMENT_CONTACT_HANDSHAKE`, the consignment contact's
handshake, and `ANIMALS_BASE_URL`, the animals frontend's base URL the return
URLs start with; the Vitest tests and the fit specs both send these),
`expect-draft-journey-strip.js` (`expectDraftJourneyStrip($,
notificationId)`, the Draft tag and notification id in the
journey strip, found by `journey-strip.js`'s `JOURNEY_STRIP` selector,
which the fit specs import too),
`expect-add-form-country-select.js` (`expectUnitedKingdomAloneSelected($)`
and `expectPlaceholderThenCountriesNoneSelected($, countryNames)`, the add form's
Country select),
`expect-address-form-errors.js` (`expectSummaryLinks(result)` and
`expectSummaryAndFieldErrors($, errors)`, the error summary links and the
messages beside the fields),
`open-empty-address-book-with-cookies.js`
(`openEmptyAddressBookWithCookiesFrom(server, sessionId, postHeaders)`, which
opens the address book list with the cookies a POST set so a test can
read the banner),
`session-auth.js` (`sessionAuth(sessionId, overrides)` and
`ORGANISATION_ID`, the one test organisation id),
`mock-oidc-config.js` (`mockOidcConfig`), `mock-auth-config.js`
(`mockAuthConfig(importOriginal)`), `test-server.js`
(`startTestServer()`, `stopTestServer(server)`, `startRealModeServer()`,
`startRealModeServerServingCountries(countries)`, which returns a getter
for the started server).

[`list/list.test-support.js`](../features/address-book/list/list.test-support.js)
holds the list's fixtures, nock stubs and Cheerio readers:
`startServerWithPageReader()`, `stubAddressPage(query, addressPage)`,
`stubAddressBookUnavailable()`, `contentOf`, `tableHeadingsOf`,
`resultsLineOf`, `bodyRowCountOf`, `rowCellsOf` and `tagNamesOf`. A list
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
`signIn(page, { organisationId })` navigates to `/auth/stub-sign-in`.
[`address-form.js`](../features/address-book/fit/address-form.js) —
`fieldLabels`, `addressFormCountryNames` (the captured countries fixture's
names plus United Kingdom, alphabetical), `validAddress`, `fillValidAddress`,
`addValidAddressToFreshOrganisation`, `validAddressViewLink`,
`expectErrorFocusOn`, the two
validation tables.
[`address-book-list.js`](../features/address-book/fit/address-book-list.js) —
`openAddressBookList`, `expectAddressBookList`,
`expectEmptyAddressBookList`, `searchFieldOf`, `openFilterDisclosure`,
`expectFilterDisclosureOpensAndCloses`, `searchAndExpectQuery`,
`resultsLineOf`, `searchAndExpectMatches`, `searchAndExpectSingleMatch`.
[`dashboard.js`](../features/address-book/fit/dashboard.js) —
`expectDashboard`.
[`axe.js`](../features/address-book/fit/axe.js) — the address-book group's
shared axe helper, `expectNoSeriousOrCriticalViolations`.
[`seed-address.js`](../features/address-book/fit/seed-address.js) —
`seedAddress`, the address the stub seeds for an ordinary organisation,
its `seedAddressLines`, and the unknown and malformed ids.
[`return-query.js`](../features/address-book/fit/return-query.js) —
`withReturn(path, returnTo)`. Page paths come from the app's own
[`shared/paths.js`](../shared/paths.js), never a literal in a spec.

Every test signs in with its own organisation id, because the
address-book stub keys its data by organisation; the `-empty` and
`-paginated` suffixes select those seeds (thirty addresses, four pages of eight). No sleeps, no page objects, and
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

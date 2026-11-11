# Services

`src/server/app/services/` holds one folder per upstream. Each holds
**`index.js`** the barrel a feature imports, **`client.js`** the HTTP client
and **`stub.js`** the in-memory stand-in, plus any module those share. The
address book also holds **`typed-seed.js`** (the stub's typed seed addresses,
each with its roles) and **`address-types.js`**, which exports:

- `ADDRESS_TYPES`, the address type values;
- `ROLES`, the role codes;
- `ROLES_BY_ADDRESS_TYPE`, the roles each address type groups, in the order
  the Type select offers them;
- `addressTypeOfRole`, the address type that groups a role;
- `keepRolesOfferedBy`, the given roles an address type offers, kept in
  `ROLES_BY_ADDRESS_TYPE`'s order, which is not the order the roles question
  shows them;
- `PLACE_ROLES`, the roles that name a place.

The barrel exports both. A feature imports only the barrel, and nothing
imports any other file from outside its folder.

Three of the four address types group roles for this service's screens (the
add flow's first step and the list's tabs): a role set
is never sent to the address book or read from it, and an address's type is
worked out from its roles. The fourth, Transporter, names the service's
transporters instead — their own records on their own address-book route,
carrying no roles and an intrinsic private-or-commercial type — so it leads
to the add-a-transporter pages rather than the address form, and the role map
in `address-types.js` keeps only the three role-backed types.

The [`transporters`](../services/transporters/) service follows the same
barrel/client/stub shape and the same shared-request module as `address-book`
(below), reading and writing the address book's transporter route rather than
its address route.

## Run mode

[`isStubMode()`](../../common/services/mode.js) selects stub or real. It is
one service-wide switch, `STUB_MODE`, which also decides how a trader signs
in — a stub run serves stub data and signs its own session, a real run uses
the HTTP clients and Defra ID. The module reads the switch through config
and refuses it in production.

Every barrel chooses per call (`isStubMode() ? stub : client`). There is no
priming at boot, so a reference-data outage does not stop the server
starting, and a test can switch modes with `config.set('stubMode', …)`.

## The services

### address-book

[`index.js`](../services/address-book/index.js) exports `listAddresses(organisationId,
listQuery)`, where `listQuery` is `{ page, pageSize, searchTerm, countryCodes, roles, searchRoles }`,
`createAddress(organisationId, address)`, `getAddress(organisationId, addressId)`,
`updateAddress(organisationId, addressId, address)`,
`deleteAddress(organisationId, addressId)`, plus `mapApiErrorsToFormErrors(problemBody)`
(the first message per field) and `isValidationFailure(err)` (a 400
carrying `errors`).

The [client](../services/address-book/client.js) sends the organisation as
the `Trade-Imports-Organisation-Id` header and in the path (the address
book runs no in-service authentication and trusts that header — it must
always come from the session), the trace id under the header named by
`tracing.header`, refuses a missing organisation rather than asking for
`undefined`, raises a 400 as a validation failure with the problem body,
and everything else through `throwOnError`. A list sends each of the
query's `roles` as a repeated `role` parameter (an address holding any of
them is kept), and each of its `searchRoles` as a repeated `searchRole`.
A save sends the address's `roles` and no address type.

The [stub](../services/address-book/stub.js) keeps a `Map` per
organisation, seeded by the id's suffix (`-empty`, `-paginated` for 30
addresses, `-typed` for addresses holding roles of all three address
types, otherwise `Stub Farm 1` at `000000000000000000000001`); an untyped
seed address is a place of origin and consignor. It mints 24-character hex
ids because the `{id}` routes validate an ObjectId. It lists newest first, a
created address ahead of the seeded ones, and at the page size the request
gives. With `roles`, it first keeps the addresses holding any of them. Of
those, an address matches when the search term appears in its name, address
lines, town, county or postcode, when its country code is one of the
request's country codes, or when it holds one of the request's search roles;
with none of these given, every address left is listed. A create or update
is refused, as the address book refuses it, with a 400 keyed `roles` when
the address holds no role or roles of more than one address type. A delete
marks the address deleted rather than removing it, so `getAddress` still
returns it.

### transporters

[`index.js`](../services/transporters/index.js) exports `listTransporters(organisationId,
listQuery)`, `createTransporter(organisationId, transporter)` and
`getTransporter(organisationId, transporterId)`, and
re-exports `TRANSPORTER_TYPES` and `NORTHERN_IRELAND_COUNTRY_CODE` from
`transporter-types.js`. The [client](../services/transporters/client.js)
reads [`services/address-book-request.js`](../services/address-book-request.js)
for what it shares with the addresses client — the organisation-scoped base
URL and its missing-organisation refusal, the header set, and the raise that
turns a 400 into a validation failure — and owns only its own `transporters`
resource segment and query parameters. The [stub](../services/transporters/stub.js)
keeps a `Map` per organisation, seeded empty, matches a search term against a
transporter's name, address lines, town, county, postcode and approval
number, narrows by country code and type, and refuses a create the way the
address book refuses it: a missing approval number on a commercial
transporter, one present on a private transporter, or a commercial country
that is not Northern Ireland. `getTransporter` throws the shared `notFound()`
for an id the organisation's `Map` does not hold.

### countries

[`index.js`](../services/countries/index.js) exports `getCountries()` and
`ensureLoaded()` — the reference-data `/countries` list, or, in stub mode,
the list captured from reference-data's unfiltered `/countries`
(`services/_capture/fixtures/countries.json`, refreshed with
`npm run capture:ins`). The list is fetched on the first read
and cached at module scope for the life of the process; a failed load
leaves the cache unloaded so the next read retries, and rejects with
`Boom.serverUnavailable`, which `catchAll` renders as the shared error
page with a 503. In stub mode the captured list plays the role of a
loaded cache and nothing is fetched.
Feature-side, [`address-countries.js`](../features/address-book/address-countries.js)
lists the countries alphabetically, United Kingdom included in its place, and rejects the same way on an empty list.

### ins-backend

[`index.js`](../services/ins-backend/index.js) exports
`listNotifications(stubSeedOrganisationId, { page, sort, referenceNumber })` —
the aggregated notifications the dashboard lists. The dashboard list is scoped to
the signed-in organisation: the client sends `Trade-Imports-Organisation-Id` to
the INS backend, and
only the stub reads `stubSeedOrganisationId`, which the real client does not
send. The stub holds four, one soft-deleted and never returned, for every
organisation except one whose id ends `-empty`, which has none.

### address-lookup

[`index.js`](../services/address-lookup/index.js) exports
`lookupDefaultPostcode()`, `lookupByPostcode(postcode)` and
`lookupByFind(find)`, which call `GET /address-lookup` on the INS backend
(`tradeImportsInsBackendApi.baseUrl`) with no parameter, with `postcode=`
or with `find=`. A lookup that fails downstream — for example a hop
answering 503 — or finds nothing comes back as a 200 whose `outcome`
says so (`FAILED` with a `failureReason`, or `RESULTS` with no results).
A non-2xx response from the INS backend itself, or a network failure,
makes the client reject through `throwOnError`, and the spike controller
renders its network-error state. The stub serves the same three
SW1A 1AA addresses for every search. The service is used only by the
temporary dev/local `address-lookup-spike` page.

## Configuration

| Convict key                            | Env var                              | Default                 |
| -------------------------------------- | ------------------------------------ | ----------------------- |
| `tradeImportsAddressBookApi.baseUrl`   | `TRADE_IMPORTS_ADDRESS_BOOK_URL`     | `http://localhost:8089` |
| `tradeImportsReferenceDataApi.baseUrl` | `TRADE_IMPORTS_REFERENCE_DATA_URL`   | `http://localhost:8086` |
| `tradeImportsInsBackendApi.baseUrl`    | `TRADE_IMPORTS_INS_BACKEND_URL`      | `http://localhost:8090` |
| `tradeImportsAnimalsFrontend.baseUrl`  | `TRADE_IMPORTS_ANIMALS_FRONTEND_URL` | `http://localhost:3000` |
| `tradeImportsPlantsFrontend.baseUrl`   | `TRADE_IMPORTS_PLANTS_FRONTEND_URL`  | `http://localhost:3003` |

The last two are browser-visible (the dashboard's row links, the notification
type question's hand-over to `<base><set>/start` and its return to a
notification's origin page, and the journey origins the
content-security-policy trusts for the handshake's form-action), so under the
workspace stack they stay `localhost` while the three API URLs use
`host.docker.internal`.

The form-action also trusts the origin of the browser-facing Defra ID URL, so
a hand-over to a journey frontend can pass through sign-in. That origin is
derived from `defraId.oidcDiscoveryUrl` with the `defraId.browserFacingHostnameRewrite`
rewrite applied; it needs no key of its own.

The rewrite settings also decide when the server-side `token_endpoint` and
`jwks_uri` are moved to the discovery hostname: when the rewrite is enabled and
that hostname is one of `from` or equal to `to`.

## Shared HTTP helpers

[`lib/http-client.js`](../lib/http-client.js): `throwOnError(response)`
(attaches `status`, `statusText`, `body`; the message comes from
`detail`/`message`/`title`/status text), `parseProblemBody`,
`errorMessageFromBody`. [`lib/http-status.js`](../lib/http-status.js): the
three constants controllers use.

## Testing a service

See [testing.md](testing.md#service-tests). Every client is tested
against nock at its base URL under `runInRealMode()`; every stub under
`refuseOutboundHttp()`.

## Out of scope

There is no document upload, no outbox and no event publishing here. The
notification itself is owned by the journey frontend the dashboard links
to.

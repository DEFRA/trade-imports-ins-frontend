# Services

`src/server/app/services/` holds one folder per upstream, each with the
same three files — **`index.js`** the barrel a feature imports,
**`client.js`** the HTTP client, **`stub.js`** the in-memory stand-in — and
nothing imports `client.js` or `stub.js` from outside its folder.

## Run mode

[`isStubMode()`](../../common/services/mode.js) selects stub or real. It is
one service-wide switch, `STUB_MODE`, which also decides how a trader signs
in — a stub run serves stub data and signs its own session, a real run uses
the HTTP clients and Defra ID. The module reads the switch through config
and refuses it in production.

Every barrel chooses per call (`isStubMode() ? stub : client`). There is no
priming at boot, so a reference-data outage does not stop the server
starting, and a test can switch modes with `config.set('stubMode', …)`.

## The three services

### address-book

[`index.js`](../services/address-book/index.js) exports `listAddresses(orgId,
{ page, q, countryCode })`, `createAddress(orgId, body)`,
`getAddress(orgId, id)`, `updateAddress(orgId, id, body)`,
`deleteAddress(orgId, id)`, plus `mapApiErrorsToFormErrors(problemBody)`
(the first message per field) and `isValidationFailure(err)` (a 400
carrying `errors`).

The [client](../services/address-book/client.js) sends the organisation as
the `Trade-Imports-Organisation-Id` header and in the path (the address
book runs no in-service authentication and trusts that header — it must
always come from the session), the trace id under the header named by
`tracing.header`, refuses a missing organisation rather than asking for
`undefined`, raises a 400 as a validation failure with the problem body,
and everything else through `throwOnError`.

The [stub](../services/address-book/stub.js) keeps a `Map` per
organisation, seeded by the id's suffix (`-empty`, `-paginated` for 30
addresses, otherwise `Stub Farm 1` at `000000000000000000000001`), and
mints 24-character hex ids because the `{id}` routes validate an
ObjectId.

### countries

[`index.js`](../services/countries/index.js) exports `getCountries()` and
`ensureLoaded()` — the reference-data `/countries` list, or the stub's
`COUNTRIES`. The list is fetched on the first read and cached at module
scope for the life of the process; a failed load leaves the cache unloaded
so the next read retries, and rejects with `Boom.serverUnavailable`, which
`catchAll` renders as the shared error page with a 503. In stub mode the
seed plays the role of a loaded cache and nothing is fetched.
Feature-side, [`address-countries.js`](../features/address-book/address-countries.js)
puts GB first and rejects the same way on an empty list.

### ins-backend

[`index.js`](../services/ins-backend/index.js) exports `listNotifications({
page, sort, referenceNumber })` — the aggregated notifications the
dashboard lists. The stub holds four, one soft-deleted and never returned.
The dashboard is not scoped to an organisation.

## Configuration

| Convict key                            | Env var                              | Default                 |
| -------------------------------------- | ------------------------------------ | ----------------------- |
| `tradeImportsAddressBookApi.baseUrl`   | `TRADE_IMPORTS_ADDRESS_BOOK_URL`     | `http://localhost:8089` |
| `tradeImportsReferenceDataApi.baseUrl` | `TRADE_IMPORTS_REFERENCE_DATA_URL`   | `http://localhost:8086` |
| `tradeImportsInsBackendApi.baseUrl`    | `TRADE_IMPORTS_INS_BACKEND_URL`      | `http://localhost:8090` |
| `tradeImportsAnimalsFrontend.baseUrl`  | `TRADE_IMPORTS_ANIMALS_FRONTEND_URL` | `http://localhost:3000` |

The last one is browser-visible (the dashboard's row links), so under the
workspace stack it stays `localhost` while the three API URLs use
`host.docker.internal`.

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

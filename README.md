# trade-imports-ins-frontend

[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_trade-imports-ins-frontend&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=DEFRA_trade-imports-ins-frontend)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_trade-imports-ins-frontend&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DEFRA_trade-imports-ins-frontend)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_trade-imports-ins-frontend&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DEFRA_trade-imports-ins-frontend)

The Import Notification Service front door: a notification dashboard and an
organisation's address book, signed in through Defra ID. It is a plain
Hapi + Nunjucks application: one `src/server/app/` with the pages under
`features/`, the HTTP clients under `services/`, and the page kit under
`shared/`. No obligation platform, no journey.

- [Application documentation](src/server/app/docs/README.md)
- [Add a page](src/server/app/docs/add-a-page.md)

## Current state

The service serves `/`, the dashboard. It lists, searches by reference and
sorts the aggregated notifications, and is not scoped to an organisation.
Each row links to the animals frontend, which owns the notification. It
also serves `/address-book` with `add`, `{id}`, `{id}/edit` and
`{id}/delete`, plus `/auth/*`, `/signout` and `/health`. See
[The served surface](src/server/app/docs/README.md#the-served-surface).

Deployed end-to-end tests for this service live in the shared tests
repository `trade-imports-animals-tests`, as its `ins` Playwright project
— see
[Deployed end-to-end tests](src/server/app/docs/testing.md#deployed-end-to-end-tests).

- [Requirements](#requirements)
- [Server-side caching](#server-side-caching)
- [Redis](#redis)
- [Local development](#local-development)
- [Auth](#authentication-trade-imports-defra-id-stub)
- [Docker](#docker)
- [Lighthouse](#lighthouse)
- [SonarCloud](#sonarcloud)
- [Licence](#licence)

## Requirements

### Node.js

Node 24 or later, and npm 11.6.2 — the version pinned by `packageManager`
in `package.json`. An ambient npm older than that rejects the lockfile.

To use the correct version of Node.js for this application, via nvm:

```bash
cd trade-imports-ins-frontend
nvm use
```

Then install with the pinned npm, so the lockfile you regenerate matches
the one CI and the Dockerfile install with:

```bash
npm run install:pinned-npm
```

## Server-side caching

We use Catbox for server-side caching. By default the service uses
CatboxRedis when deployed and CatboxMemory for local development.
Override with `SESSION_CACHE_ENGINE`, set to either `redis` or `memory`.

CatboxMemory (`memory`) is _not_ suitable for production use: the cache is
not shared between instances of the service and does not survive a
restart.

## Redis

Redis is an in-memory key-value store. Every instance of a service has
access to the same Redis key-value store, similar to how services might
have a database. All frontend services are given a namespaced prefix that
matches the service name, so `my-service` has access to everything in
Redis prefixed with `my-service`.

## Local development

### Setup

Install application dependencies:

```bash
npm install
```

### Git hooks

The pre-commit hook is opt-in: `npm run setup:husky` installs it; it runs
`npm run git:pre-commit-hook` — audit, format check, lint and the unit
suite.

### Development

To run the application in `development` mode:

```bash
npm run dev
```

It serves on port 3002. Run `npm run dev:debug` instead to attach the
inspector. A `.env` file at the repo root is read by nodemon's
`--env-file-if-exists`.

### Production

To mimic the application running in `production` mode locally:

```bash
npm start
```

It builds the client first.

### Npm scripts

All available npm scripts are in [package.json](./package.json). To list
them:

```bash
npm run
```

The ones you will use most:

```bash
npm test                        # builds the client, then the full Vitest suite with coverage
npm run test:watch              # Vitest in watch mode, no build, no coverage
npm run test:fit                # both Playwright projects, stub-backed, port 3002
npm run test:fit:smoke          # the one whole-service smoke spec under fit/
PORT=3052 npm run test:fit:features   # the co-located feature specs
npm run lint                    # JS, stylesheet and dependency-cruiser
npm run format
npm run build:frontend          # one webpack build into .public/
npm run fit:start:workspace     # the workspace-backed start, see below
```

`npm run fit:start:workspace` chains
[scripts/check-workspace-stack.js](./scripts/check-workspace-stack.js)
ahead of `fit:start`, probing `/health` on the INS backend (8090), the
address book (8089) and reference data (8086), and refusing to start
when any is down. Plain `npm run fit:start` — the one the Playwright web
server runs — stays stub-backed and needs no stack.

`npm run lint:arch` runs Dependency Cruiser over `src/server/app` and
enforces the four rules in `.dependency-cruiser.cjs` — see
[Enforced boundaries](src/server/app/docs/architecture.md#enforced-boundaries).

## AUTHENTICATION (trade-imports-defra-id-stub)

For local cross-service development the recommended path is the workspace
docker stack at <https://github.com/DEFRA/trade-imports-workspace> — it
stands the stub up alongside the frontend with the right env wiring; no
`/etc/hosts` edits required.

If running this service standalone against the stub on `localhost:3007`,
create `.env` at the repo root (read by `npm run dev`):

```
DEFRA_ID_OIDC_CONFIGURATION_URL=http://localhost:3007/idphub/b2c/b2c_1a_cui_cpdev_signupsigninsfi/.well-known/openid-configuration
DEFRA_ID_CLIENT_ID=8c5e0bd-8223-4908-a5aa-c9c1d7cddaac
DEFRA_ID_CLIENT_SECRET=test_value
DEFRA_ID_SERVICE_ID=aeaa0a80-15f3-48b2-8bd7-0e02874b3d32
DEFRA_ID_POLICY=b2c_1a_cui_cpdev_signupsigninsfi
```

Alternatively set `STUB_MODE=true`, which serves stub data and signs its
own session instead of doing the Defra ID OIDC exchange. Auth is still
enforced — only the external round-trip is bypassed — and the switch is
refused in production. The Playwright suite sets it for its own web
server, so `npm run test:fit` needs no other service running.

## Docker

The image's `ARG PORT` defaults to 3000; pass `PORT` to serve on the
service's port.

### Development image

> [!TIP]
> For Apple Silicon users, you may need to add `--platform linux/amd64` to
> the `docker run` command to ensure compatibility, for example
> `docker build --platform=linux/arm64 --no-cache --tag trade-imports-ins-frontend`

Build:

```bash
docker build --target development --no-cache --tag trade-imports-ins-frontend:development .
```

Run:

```bash
docker run -p 3002:3002 -e PORT=3002 trade-imports-ins-frontend:development
```

### Production image

Build:

```bash
docker build --no-cache --tag trade-imports-ins-frontend .
```

Run:

```bash
docker run -p 3002:3002 -e PORT=3002 trade-imports-ins-frontend
```

### Local stack

This repository carries no compose file of its own. The full local
environment (MongoDB, Floci, Redis, the stubs, and every trade-imports
service including this one) is the workspace stack in
[DEFRA/trade-imports-workspace](https://github.com/DEFRA/trade-imports-workspace):

```bash
# from the workspace root
./scripts/stack/run-stack.sh              # full stack from published images
./scripts/stack/run-stack.sh -d           # built from local source under repos/
./scripts/stack/run-stack.sh -e ins-frontend  # everything except this service (run it via npm run dev)
```

A cross-repo change must use the **same branch name** in every repository
it touches: the stack probes each repository for a branch-tagged image
and falls back to `:latest` per service, so a mismatched name silently
picks up someone else's image.

## Lighthouse

`npm run lighthouse` seeds its audit targets from the app's own registered
routes, then runs Lighthouse CI against them.

Every GET route the service registers is audited — the dashboard, the
address book list, add, view, edit and delete — on one address the setup
step creates through the app's own pages. The
[Lighthouse guide](src/server/app/docs/lighthouse.md) covers how to run it
against a locally started app, the score floors and the CI workflow.

## SonarCloud

Instructions for setting up SonarCloud are in
[sonar-project.properties](./sonar-project.properties).

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT
LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and
applications when using this information.

> Contains public sector information licensed under the Open Government license v3

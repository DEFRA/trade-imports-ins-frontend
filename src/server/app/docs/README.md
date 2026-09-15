# Application documentation

`src/server/app/` is the whole application — the pages a trader sees, the
clients that reach the services behind them, and the kit the pages share.
There is no platform/set split: `features/` sits one level down from `app/`,
and `routes.js` registers what `features/index.js` exports.

## The served surface

The application registers nine routes, exactly as
[`routes.test.js`](../routes.test.js) pins them:

- `GET /`
- `GET /address-book`
- `GET /address-book/add`, `POST /address-book/add`
- `GET /address-book/{id}`
- `GET /address-book/{id}/edit`, `POST /address-book/{id}/edit`
- `GET /address-book/{id}/delete`, `POST /address-book/{id}/delete`

Every one of them sits behind the `session` auth strategy, and every `{id}`
is validated by [`address-id-params.js`](../features/address-book/address-id-params.js)
as a 24-character hex Mongo ObjectId — a mismatch is a 404, not a validation
error on the page.

The chassis adds routes of its own outside this list: `/health`, `/auth/*`
(or `/auth/stub-sign-in` in stub mode), `/signout` and `/public/*`. The
dashboard's row links leave the service for the animals frontend
(`TRADE_IMPORTS_ANIMALS_FRONTEND_URL`), which owns the notification a row
represents.

## Guides

- [Architecture](architecture.md)
- [Feature anatomy](features.md)
- [Services](services.md)
- [Testing](testing.md)
- [Lighthouse](lighthouse.md)

## Recipes

- [Add a page](add-a-page.md)

Read [features.md](features.md) before adding a page. The copy convention
tests and the route list test are the guards that catch a half-finished
page.

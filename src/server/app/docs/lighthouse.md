# Lighthouse

Lighthouse CI audits the service's own pages. The source of truth is
[`lighthouserc.cjs`](../../../../lighthouserc.cjs) at the repository root,
plus the scripts under `scripts/lighthouse/`.

## What the run audits

Every GET route the service registers, derived from
[`features/index.js`](../features/index.js) at run time — the same list
[`routes.test.js`](../routes.test.js) pins:

- `/` — the dashboard
- `/address-book` — the list
- `/address-book/add`
- `/address-book/{id}` — view
- `/address-book/{id}/edit`
- `/address-book/{id}/delete`

The three `{id}` pages are audited on one address the setup step creates
through the app's own add page, named `Lighthouse seed address`. A run
that finds it already in the book reuses it rather than adding another.

`scripts/lighthouse/audit-targets.js` (with `audit-targets.test.js`) holds
the derivation and two maps, both empty today: `SKIPPED`, for a GET route
that must not be audited, with a reason; and `QUERY`, for a route that
needs a query string before it renders. Both are checked against the live
route table, so a stale entry fails the run rather than quietly shrinking
the audit. `scripts/lighthouse/seed-address.js` (with
`seed-address.test.js`) holds the seed address and the find-or-create walk
through the list and add pages.

## What the run does

`npm run lighthouse` is `run-s lighthouse:targets lighthouse:run`.

`lighthouse:targets` (`seed-audit-targets.js`) signs in through
`tests/lighthouse/auth-setup.cjs`, seeds the address, derives the audit
URLs from the app's registered routes and writes them to
`.lighthouse/targets.json`. It then re-fetches every URL and fails when one
does not return 200 for its own page — a redirected URL would silently
audit whatever it landed on.

`lighthouse:run` (`run-audit.js`) clears the previous run's reports, runs
`lhci autorun`, then renames each report from the LHCI filename pattern to
the page's own stable name from the targets file: `home`, `address_book`,
`address_book_add`, `address_book_id`, `address_book_id_edit`,
`address_book_id_delete`.

The config:

- collects the URLs from `.lighthouse/targets.json`, defaulting to
  `http://localhost:3002` (override with `LIGHTHOUSE_BASE_URL`)
- runs each URL once
- uses the desktop preset
- starts Chromium with `--no-sandbox` and `--disable-gpu`
- runs `tests/lighthouse/auth-setup.cjs` before each audit
- writes HTML and JSON output to `lighthouse-report/`

Never run `lhci autorun` on its own. The LHCI filename pattern only has to
be unique per URL; the stable per-page names are applied afterwards by
`lighthouse:run`.

## Run it against a locally started app

Two shells. In the first, start the app in stub mode — stub data and a
locally signed session, no other service needed:

```bash
STUB_MODE=true npm run fit:start
```

In the second:

```bash
npm run lighthouse
```

To audit the app the way CI does, start the workspace stack instead
(`./scripts/stack/run-stack.sh` from the workspace root), which serves
this frontend on 3002 against the real address book and the Defra ID stub,
and run `npm run lighthouse` from this repository. The sign-in script
fills the Defra ID stub's form as a single-organisation user; in stub mode
there is no form and it has nothing to do.

## Passing scores

The run fails below these category scores:

| Category       | Minimum |
| -------------- | ------- |
| Performance    | 0.60    |
| Accessibility  | 0.70    |
| Best practices | 0.70    |

There is no SEO assertion, and none should be added.

Treat the limits as a floor, not a target. A score above the floor can still
contain a simple finding that should be fixed.

## Add or change a page

The URL list is derived, not hand-maintained, so a new page joins the audit
by being a registered GET route. For a page that should be audited:

1. Check its stable report name. `reportName` derives it from the route
   path; `reportNames` refuses two routes that would claim the same name.
   A page that should not be audited needs a `SKIPPED` entry with a
   reason; a page that renders only with a query string needs a `QUERY`
   entry. A page with a path parameter other than `{id}` cannot be
   audited until the setup step can supply it — add it to `SKIPPED` with a
   reason, or extend the seed.
2. Make sure the page renders for the seeded address, signed in.
3. Run Lighthouse and open that page's HTML report.
4. Check all three asserted categories.

Do not lower a score to make a change pass without agreement. Record why a
URL is excluded. An excluded URL no longer has a Lighthouse check.

## Read the output

Each report is renamed to the page's stable name:

```text
lighthouse-report/<name>.report.<extension>
```

`scripts/lighthouse/flag-simple-findings.cjs` reads the manifest and the
representative JSON reports. It records weighted numeric or binary audits
with a score below 1 for the three asserted categories. The output is:

```text
lighthouse-report/flagged-audits.json
```

SEO findings are not included in that file.

## CI ownership

This repository has its own `.github/workflows/lighthouse.yml`. It runs
after a successful branch image publish, or by manual dispatch: it checks
out the workspace, starts the stack for the chosen branch, installs the
frontend, runs `npm run lighthouse`, always tears the stack down, uploads
the report for 14 days, publishes it to GitHub Pages and passes the result,
report URL and flagged findings to the workspace status action.

The workflow fires only once `lighthouse.yml` is on `main`: a
`workflow_run` trigger is read from the default branch, so a pull request
that adds the file does not get the check on itself. Run the audit locally
for that pull request, and expect the check on the next one.

A red result is a real failure to investigate from the uploaded report. It
is not a reason to lower a floor, stub a URL list or gate the workflow
behind manual dispatch. Reproduce it against the same route and stack
before changing code or limits.

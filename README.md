# ESPN Football API

Dependency-free Node.js 22 project. ESPN is the only match-data source. GitHub Actions refreshes persisted JSON; dynamic API requests read those stored files, never ESPN.

## Endpoints and deployment status

- Stored aggregate: `api/all.json`
- Stored league: `api/leagues/{league_id}.json`
- Refresh health: `api/health.json`
- Dynamic aggregate: `/api/all`
- Dynamic league: `/api/{league_id}`

Use the Raw button on a JSON file in GitHub for its direct anonymous JSON URL. A public repository is required for anonymous Raw access. An actual serverless host or Node server is required for dynamic routes; a GitHub repository or Pages site alone does not execute them. Hosting URLs are not supplied until an actual deployment is verified.

Supported IDs, checked against real ESPN league metadata: `eng.1`, `esp.1`, `ita.1`, `ger.1`, `fra.1`, `uefa.champions`, `uefa.europa`, `uefa.europa.conf`, `por.1`, `ned.1`, `tur.1`, `sco.1`.

## First setup

1. Keep this repository public for anonymous Raw access. Do not put passwords, account tokens or private content in it.
2. Enable GitHub Actions with repository contents-write permission. Run **Update ESPN snapshots** manually once. No npm install is required.
3. Inspect the run summary and `api/health.json`, and open `api/all.json` with GitHub's Raw button.
4. For dynamic hosting, import the repository into a compatible Node/Vercel host. The project includes one `api/[league].js` function and `vercel.json`. No ESPN credential or alternative sports API is needed. Vercel Hobby is only appropriate for eligible personal noncommercial use. Review the host's free limits and do not activate a paid plan without approval.
5. Check `/api/all`, each of the 12 league routes, and an invalid ID (must be 404) on the actual deployed host. Until this succeeds, dynamic hosting is not complete.

## Local operation

```sh
npm test
npm run update
npm start
# GET http://localhost:3000/api/all
# GET http://localhost:3000/api/eng.1
```

`npm start` serves cached public GitHub snapshots, not uncommitted local snapshots. The updater writes local JSON and the workflow commits it. Data files contain no fabricated matches. Test fixtures exist only in tests, not in served data.

## Scheduling and source requests

The cron requests a run at minutes 2,7,12,...57 (every 5 minutes, offset from the busy hour boundary), with manual dispatch also available. GitHub can delay/drop runs and disable inactive scheduled public workflows. This is not a guaranteed five-minute service-level agreement. Runs are serialized with one concurrency group. Workflow timeout is 12 minutes. Failures are visible as failed runs after healthy data has been committed.

ESPN's tested scoreboard date-range query returned HTTP 400 in this environment. The updater therefore queries individual UTC dates from yesterday through seven days ahead, inclusive. It also rechecks the date of every previously cached pre/live match outside that window, so stored events are not abandoned at a date boundary. This is an explicit rolling schedule horizon, not a complete future-season calendar. There are normally 9 requests per league, 108 per refresh before retries or exceptional old dates. Three league jobs run concurrently, each with sequential daily requests. Each HTTP request has a 20-second timeout and up to two retries with backoff. No published safe ESPN rate or uptime guarantee is assumed.

## Match correctness

- State comes only from `competitions[0].status.type.state`.
- `pre` and `in` are retained; `post` is omitted. Any confirmed final disappears on the next successful authoritative refresh.
- Teams, scores, clock, venue, broadcast and league names come from ESPN; unavailable values are `null`. Pre-game scores are `null`.
- IDs are deduplicated; matches are sorted chronologically.
- Missing previously tracked events are treated as uncertain, not assumed finished. A league with an invalid schema, unsupported state or uncertain missing event is preserved and marked stale rather than silently erased.
- Every league is updated independently. On an upstream failure its last valid matches and last-update timestamp remain, with `stale: true`. Other leagues continue.
- If the first fetch is incomplete, no partial all-league aggregate replaces a complete aggregate.

**An outage can preserve a match that has since ended.** It is impossible to both retain unverified cached data and guarantee all finals are removed while ESPN is unreachable. Never claim otherwise. Recovery rechecks the stored dates. The source has no supported public API contract; ESPN can change or block these endpoints.

## JSON and freshness

Each file has `last_update`, `total_matches`, `total_leagues`, `league_id`, `league_name`, `source`, `stale`, and `matches`. Aggregate league fields are `null`. Match entries have stable keys for ID, league, date, names, state/status, minute, teams, scores, venue and broadcast. All responses use arrays, including valid empty schedules.

`last_update` means the data file last changed, not the last successful check. Unchanged successful match payloads do not rewrite league files. `api/health.json` is a small explicit heartbeat with `last_attempt`, each league's `last_success`, `last_change`, status/error and failed league list. It changes on checks even when scores do not, enabling stale detection. A failure/recovery changes the data file's stale flag but not its retained match payload.

Dynamic routes add `last_check` and `league_health` and compute `stale` when a league failed, its last success is older than 10 minutes, or only a fallback Raw-cache value was available. They use 30-second in-process and HTTP caches. This is not a global synchronized cache; CDN and Raw propagation can add delay. On upstream Raw failure a warm instance may return the retained snapshot marked stale; a cold instance without stored data returns 503, never fabricated matches. Invalid routes return 404 JSON; unsupported methods return 405. GET, HEAD and OPTIONS are supported; CORS allows anonymous reads. No tokens are required by clients.

The displayed age includes ESPN delay, workflow queue/fetch time, Git commit/Raw propagation, route caching and KWGT's own refresh interval. Polling a stale file faster cannot make scores live.

## Free-plan and usage boundaries

Standard Actions runners on public repositories are free within GitHub policies; this is a software data-publication workflow, not a permanently running runner, tunneling server or a workaround for scheduling limits. No Codespaces production server is used. Hosting and GitHub bandwidth/rate/resource limits still apply. Do not describe the service as unlimited. Review ESPN rights and provider terms before commercial redistribution.

## Tests and verification

`npm test` checks pre/in/post behavior, live score changes, null fields, deduplication, malformed responses, old-date reconciliation, isolated failure preservation, aggregate JSON, unchanged writes, all 13 dynamic-route dispatches and invalid-ID 404. Unit fixtures do not prove actual hosting. Live fetch, live Actions, anonymous Raw responses and actual hosted routes must be checked separately. See workflow logs for current upstream results.

# ESPN Football API

Dependency-free Node.js 22 project. ESPN is the only match-data source. GitHub Actions refreshes persisted JSON; dynamic API requests read those stored files, never ESPN.

## Published endpoints

Verified anonymously on 2026-11-21. No token or sign-in required.

| Route | Live URL |
| --- | --- |
| all | https://api-football-vbqq.netlify.app/api/all |
| eng.1 | https://api-football-vbqq.netlify.app/api/eng.1 |
| esp.1 | https://api-football-vbqq.netlify.app/api/esp.1 |
| ita.1 | https://api-football-vbqq.netlify.app/api/ita.1 |
| ger.1 | https://api-football-vbqq.netlify.app/api/ger.1 |
| fra.1 | https://api-football-vbqq.netlify.app/api/fra.1 |
| uefa.champions | https://api-football-vbqq.netlify.app/api/uefa.champions |
| uefa.europa | https://api-football-vbqq.netlify.app/api/uefa.europa |
| uefa.europa.conf | https://api-football-vbqq.netlify.app/api/uefa.europa.conf |
| por.1 | https://api-football-vbqq.netlify.app/api/por.1 |
| ned.1 | https://api-football-vbqq.netlify.app/api/ned.1 |
| tur.1 | https://api-football-vbqq.netlify.app/api/tur.1 |
| sco.1 | https://api-football-vbqq.netlify.app/api/sco.1 |

Raw aggregate: https://raw.githubusercontent.com/unavailable0m-dev/api-football/refs/heads/main/api/all.json

Refresh health: https://raw.githubusercontent.com/unavailable0m-dev/api-football/main/api/health.json

The dynamic host is deployed on Netlify Free. Its routes read changing GitHub snapshots without redeploying for each data refresh. Deployment previews stay private; production is anonymously accessible.

## Project layout

- Stored aggregate: `api/all.json`
- Stored league: `api/leagues/{league_id}.json`
- Refresh health: `api/health.json`
- Dynamic aggregate: `/api/all`
- Dynamic league: `/api/{league_id}`

Use the Raw button on a JSON file in GitHub for its direct anonymous JSON URL. A public repository is required for anonymous Raw access. An actual serverless host or Node server is required for dynamic routes; a GitHub repository or Pages site alone does not execute them. The verified production links are listed above.

Supported IDs, checked against real ESPN league metadata: `eng.1`, `esp.1`, `ita.1`, `ger.1`, `fra.1`, `uefa.champions`, `uefa.europa`, `uefa.europa.conf`, `por.1`, `ned.1`, `tur.1`, `sco.1`.

## First setup

1. Keep this repository public for anonymous Raw access. Do not put passwords, account tokens or private content in it.
2. Enable GitHub Actions with repository contents-write permission. Run **Update ESPN snapshots** manually once. No npm install is required.
3. Inspect the run summary and `api/health.json`, and open `api/all.json` with GitHub's Raw button.
4. For dynamic hosting, import the repository into a compatible Node/Vercel host. The project includes one `api/[league].js` function and `vercel.json`. No ESPN credential or alternative sports API is needed. Vercel Hobby is only appropriate for eligible personal noncommercial use. Review the host's free limits and do not activate a paid plan without approval.
5. Check `/api/all`, each of the 12 league routes, and an invalid ID (must be 404) on the actual deployed host. This production HTTP check has passed for all 13 routes and invalid IDs. Repeat it after deployment changes.

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

ESPN's tested scoreboard date-range query returned HTTP 400 in this environment. The updater queries individual UTC dates from yesterday through seven days ahead, inclusive, and rechecks every previously cached pre/live match date outside that window. When a league has fewer than five upcoming (`pre`) matches, discovery follows ESPN's own season calendar whitelist in chronological order until at least five are found. It does not cap the result at five or discard live matches. The calendar search is bounded to one year ahead; if ESPN supplies no valid day-calendar whitelist, a bounded 90-day daily fallback is used. If the published schedule is exhausted, only real matches are returned and health reports `upcoming_count`, `upcoming_shortfall`, `discovery`, `queried_dates`, `searched_until` and `calendar_end`. A missing fifth match is never invented. A source outage still preserves prior valid data with stale status. There are normally 108 daily requests per refresh, with extra requests only for tracked old dates or minimum-five discovery. Three league workers run concurrently with sequential date requests. Each request has a 20-second timeout and up to two retries. No safe ESPN rate or uptime guarantee is assumed.

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

`npm test` has 13 groups covering pre/in/post behavior, live score changes, null fields, deduplication, malformed responses, old-date reconciliation, isolated failure preservation, aggregate JSON, unchanged writes, all 13 dynamic-route dispatches, invalid-ID 404, calendar expansion beyond seven days, retaining more than five upcoming, calendar-exhaustion shortfalls and the Netlify adapter. Unit fixtures do not prove actual hosting. Live fetch, live Actions, anonymous Raw responses and actual hosted routes must be checked separately. See workflow logs for current upstream results.

## Netlify Free deployment

`netlify/functions/api.js` adapts the shared stored-data handler to Netlify's standard Node serverless Functions. It routes `/api/*` dynamically, with the same validated league list, cache, CORS, method handling and 404 behavior. `netlify.toml` pins Node 22, runs tests before building and publishes the small `public` landing page. Its build-ignore command skips data-only JSON commits. Runtime reads always use the current public GitHub snapshots, so refreshing scores never requires a redeployment.

The deployed Free account has a 300-credit monthly hard cap with no automatic recharge. A production deployment consumes credits, and compute, requests and transfer also count. At the cap service may stop until credits reset. This is free, not unlimited or guaranteed uptime. No payment card or hold is used. Do not upgrade without approval.

Pricing and policies: https://www.netlify.com/pricing/ and https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans . Netlify explicitly permits commercial products within Free plan limits: https://www.netlify.com/solutions/web-applications/ . ESPN redistribution rights are separate and are not granted by the hosting plan.

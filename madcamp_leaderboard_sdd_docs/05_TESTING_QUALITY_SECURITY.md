# Testing, Quality, Fuzzing, and Security Requirements

## 1. Non-negotiable quality gates

Before marking the task complete, all of the following must pass.

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:fuzz
pnpm test:e2e
pnpm build
pnpm audit
```

If Docker support exists:

```bash
docker compose build
docker compose up -d
pnpm smoke:test
docker compose down
```

No lint errors. No TypeScript errors. No failing tests.

## 2. Unit tests

Minimum unit test targets:

- config schema validation
- KST week resolver
- repo naming parser
- participant CSV parser
- GitHub username normalization
- commit author mapping
- commit SHA deduplication
- personal ranking aggregation
- team ranking aggregation
- class ranking aggregation
- average vs total toggle
- unknown user handling
- sync error handling
- snapshot fallback

## 3. Property-based fuzzing

Use `fast-check`.

fast-check is a property-based testing framework for JavaScript/TypeScript that generates randomized inputs to check whether declared properties hold. [fast-check docs](https://fast-check.dev/docs/introduction/what-is-property-based-testing/)

### 3.1 Repo parser fuzzing

Properties:

- valid generated repo names always parse to original fields
- invalid random names never crash
- parsed week/class are positive integers
- season mismatch is rejected

### 3.2 CSV parser fuzzing

Properties:

- arbitrary CSV-like strings never crash parser
- duplicate usernames are always rejected
- empty username rows are rejected
- Korean names and Unicode do not crash parser
- BOM handling stable

### 3.3 KST boundary fuzzing

Properties:

- startAt included
- endAt included or excluded according to chosen policy, documented
- random time outside all weeks returns null
- overlapping weeks are rejected by config validator

### 3.4 Aggregation invariants

Properties:

- sum(personal commits) <= total mapped commits
- team totals equal repo totals after dedupe
- class average = total / denominator
- adding duplicate SHA does not change totals
- unknown users do not enter public personal ranking

## 4. API fuzzing

If the service exposes OpenAPI schema, use Schemathesis.

Schemathesis generates property-based test cases from OpenAPI or GraphQL schemas and is intended for API fuzz testing. [Schemathesis](https://schemathesis.io/)

Command example:

```bash
schemathesis run http://localhost:3000/openapi.json --base-url http://localhost:3000
```

Minimum targets:

- `/api/health`
- `/api/config/public`
- `/api/snapshots/latest`
- admin endpoints if auth can be provided safely

## 5. Whitebox fuzzing interpretation

For this TypeScript/Next.js project, “whitebox fuzzing” means property-based tests run directly against internal functions with code-level access:

- parser functions
- validators
- KST resolver
- aggregation engine
- snapshot serializer

This is preferable to blackbox-only HTTP fuzzing because core logic is pure and deterministic.

## 6. Sanitizer requirement interpretation

This project should avoid native addons. If there is no C/C++/Rust native component, ASan/UBSan/MSan are not directly applicable.

Use the following sanitizer equivalents:

- TypeScript strict mode
- zod runtime validation
- eslint security rules if added
- dependency audit
- property-based fuzzing
- Schemathesis API fuzzing
- OWASP ZAP baseline scan
- no raw HTML rendering of commit messages
- CSV upload size/type validation

If a native addon or Rust/Go helper is introduced, add sanitizer builds for that component. Prefer not to introduce native components.

## 7. E2E tests

Use Playwright.

Minimum scenarios:

1. dashboard loads latest snapshot
2. current week badge visible
3. personal/team/class tabs switch
4. class ranking average/total toggle works
5. week selector changes data
6. activity feed visible
7. heatmap tooltip works
8. mobile viewport renders card list
9. admin sync page requires auth
10. stale snapshot warning appears on simulated sync failure

## 8. Visual/design checks

Manual acceptance checklist:

- no huge hero
- no excessive glow
- no coin/NFT/reward feeling
- leaderboard visible above fold
- compact Top 3
- contribution heatmap visible
- sync status visible
- KST wording visible
- Korean copy natural
- mobile UI usable
- reduced motion supported

## 9. Accessibility

- keyboard navigation for tabs/selects/dialogs
- visible focus ring
- contrast adequate on dark background
- aria-label for icon-only buttons
- tooltips not required for core information
- prefers-reduced-motion respected

## 10. Security checks

### 10.1 Secret handling

- GitHub token server-only
- never expose token to client
- never print full token in logs
- admin UI only shows token presence, not value

### 10.2 CSV upload

- size limit
- UTF-8 handling
- no formula injection in exported CSV
- sanitize display

### 10.3 Commit messages

- do not render raw HTML
- truncate summaries
- avoid showing full commit message in public feed

### 10.4 Admin auth

MVP:

- `ADMIN_TOKEN` bearer token
- admin routes `no-store`

Later:

- passkey/OAuth allowed

## 11. OWASP ZAP baseline

Use ZAP baseline scan for passive security baseline. ZAP baseline Docker scan runs a short spider and passive scan rather than active attacks by default. [ZAP Baseline Scan](https://www.zaproxy.org/docs/docker/baseline-scan/)

Example:

```bash
docker run --rm -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t http://host.docker.internal:3000 -r zap-report.html
```

Do not run aggressive scans against public services without permission.

## 12. Performance tests

Create synthetic fixture:

- 80 participants
- 4 classes
- 4 weeks
- 80 repos total max
- 10,000 commits

Check:

- aggregation under 2 seconds locally
- snapshot size reasonable
- page loads without blocking
- heatmap rendering stable

## 13. CI

Required workflow:

```yaml
name: Quality

on:
  pull_request:
  push:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm format:check
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm test:fuzz
      - run: pnpm build
```

Optional e2e job with Playwright browser install.

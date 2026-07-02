# Security Baseline

- GitHub tokens are read only from server-side environment variables or CI secrets.
- Public routes return aggregate snapshot data only.
- Admin endpoints require `Authorization: Bearer $ADMIN_TOKEN`.
- Participant email is not included in the public snapshot.
- Commit summaries are treated as text, truncated, and never rendered as HTML.
- CSV parsing validates headers, duplicate usernames, and GitHub username shape.

## Checks

```bash
pnpm audit
docker run --rm -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t http://host.docker.internal:3000 -r zap-report.html
schemathesis run http://127.0.0.1:3000/openapi.json --base-url http://127.0.0.1:3000
```

ZAP baseline is passive and should be run only against a local or explicitly authorized preview.

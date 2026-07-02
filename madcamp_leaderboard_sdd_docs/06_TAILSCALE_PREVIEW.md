# Tailscale Preview Guide

## 1. Goal

모든 구현과 품질 검사가 끝난 뒤, 사용자가 Tailscale 내부망에서 UI를 확인할 수 있게 한다.

Public internet에 바로 노출하지 않는다. 우선 Tailscale 내부 IP로만 접근하게 한다.

## 2. Preconditions

- Tailscale이 machine에 설치되어 있고 로그인되어 있어야 한다.
- `tailscale status`가 정상이어야 한다.
- app build가 통과해야 한다.
- Docker 또는 local Next.js production server가 실행 가능해야 한다.

## 3. Local production preview

### 3.1 Next.js standalone/local

```bash
pnpm build
HOSTNAME=0.0.0.0 PORT=3000 pnpm start
```

Check:

```bash
curl http://127.0.0.1:3000/api/health
```

Tailscale IP 확인:

```bash
tailscale ip -4
```

접속 URL:

```txt
http://<tailscale-ip>:3000
```

## 4. Docker preview

### 4.1 Docker compose

```bash
docker compose up -d --build
```

Check:

```bash
docker compose ps
curl http://127.0.0.1:3000/api/health
```

Tailscale URL:

```txt
http://<tailscale-ip>:3000
```

### 4.2 PostgreSQL mode

If PostgreSQL is needed:

```bash
docker compose --profile postgres up -d --build
```

## 5. Firewall policy

Prefer allowing access only from Tailscale interface.

Options:

1. If using local machine only, do not expose via public firewall.
2. If using VPS, allow port 3000 only from Tailscale interface or Tailscale IP range.
3. Do not bind public domain until auth and security checks pass.

## 6. README addition required

After setting preview, update README with:

```md
## Tailscale Preview

1. Start the app:

```bash
docker compose up -d --build
```

2. Find Tailscale IP:

```bash
tailscale ip -4
```

3. Open:

```txt
http://<tailscale-ip>:3000
```

Admin page:

```txt
http://<tailscale-ip>:3000/admin
```

Admin auth uses `ADMIN_TOKEN`.
```

## 7. Final smoke checklist

- [ ] Tailscale IP reachable
- [ ] dashboard loads
- [ ] admin page protected
- [ ] latest snapshot visible
- [ ] sync status visible
- [ ] mobile viewport checked
- [ ] no secrets exposed in client source

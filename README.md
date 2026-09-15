# MihomoFastApi

A small FastAPI adapter for Mihomo's external controller API.

## Requirements

- Python 3.12+
- Mihomo running with `external-controller`, for example `127.0.0.1:9090`

## Setup

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

If Mihomo uses a secret:

```powershell
$env:MIHOMO_SECRET = "your-secret"
```

If Mihomo is not listening on the default address:

```powershell
$env:MIHOMO_API_URL = "http://127.0.0.1:9090"
```

Start the API:

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Open `http://127.0.0.1:8000/docs` for Swagger UI.

## Endpoints

- `GET /health` - API and Mihomo health
- `GET /api/version` - Mihomo version
- `GET /api/proxies` - raw Mihomo proxy data
- `GET /api/proxy-groups` - proxy groups plus resolved effective outbound
- `GET /api/proxy-groups/{group_name}` - one group plus its resolved effective outbound
- `PUT /api/proxy-groups/{group_name}/select` - select a proxy in a selector group
- `GET /api/connections` - active connections
- `GET /api/traffic` - traffic counters

### Effective outbound

`/api/proxy-groups` recursively follows each group's `now` value. For example:

```text
PROXY -> AUTO -> Japan 01
```

is returned with:

```json
{
  "name": "PROXY",
  "now": "AUTO",
  "effective": "Japan 01",
  "chain": ["PROXY", "AUTO", "Japan 01"],
  "cycle": false
}
```

This is intentionally the first piece of application logic: it makes the distinction between a group's selected value and the final selected node explicit.

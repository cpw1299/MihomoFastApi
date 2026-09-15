from __future__ import annotations

import os
from typing import Any
from urllib.parse import quote

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

MIHOMO_API_URL = os.getenv("MIHOMO_API_URL", "http://127.0.0.1:9090").rstrip("/")
MIHOMO_SECRET = os.getenv("MIHOMO_SECRET")

app = FastAPI(
    title="Mihomo FastAPI",
    version="0.1.0",
    description="A small FastAPI adapter for Mihomo's external controller API.",
)


class SelectProxyRequest(BaseModel):
    proxy: str = Field(min_length=1)


async def mihomo_request(
    method: str,
    path: str,
    *,
    json: Any | None = None,
    params: dict[str, Any] | None = None,
) -> Any:
    headers = {}
    if MIHOMO_SECRET:
        headers["Authorization"] = f"Bearer {MIHOMO_SECRET}"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.request(
                method,
                f"{MIHOMO_API_URL}{path}",
                headers=headers,
                json=json,
                params=params,
            )
    except httpx.RequestError as exc:
        raise HTTPException(502, detail=f"Cannot connect to Mihomo: {exc}") from exc

    if response.status_code >= 400:
        raise HTTPException(response.status_code, detail=response.text)

    if not response.content:
        return None
    return response.json()


def resolve_effective_proxy(proxies: dict[str, Any], group_name: str) -> dict[str, Any]:
    """Resolve a proxy-group's selected proxy recursively.

    This is the key behavior for this project: a group can select another group,
    so the UI should distinguish the group's selected value from the final node.
    """
    visited: list[str] = []
    current = group_name

    while current in proxies:
        if current in visited:
            return {
                "group": group_name,
                "effective": None,
                "chain": visited,
                "cycle": True,
            }

        visited.append(current)
        item = proxies[current]
        selected = item.get("now")

        if not selected:
            return {
                "group": group_name,
                "effective": None,
                "chain": visited,
                "cycle": False,
            }

        if selected not in proxies:
            return {
                "group": group_name,
                "effective": selected,
                "chain": visited + [selected],
                "cycle": False,
            }

        current = selected

    return {
        "group": group_name,
        "effective": current,
        "chain": visited + [current],
        "cycle": False,
    }


@app.get("/health")
async def health() -> dict[str, Any]:
    try:
        await mihomo_request("GET", "/version")
        return {"status": "ok", "mihomo": "up"}
    except HTTPException as exc:
        return {"status": "degraded", "mihomo": "down", "detail": exc.detail}


@app.get("/api/version")
async def version() -> Any:
    return await mihomo_request("GET", "/version")


@app.get("/api/proxies")
async def proxies() -> Any:
    return await mihomo_request("GET", "/proxies")


@app.get("/api/proxy-groups")
async def proxy_groups() -> dict[str, Any]:
    data = await mihomo_request("GET", "/proxies")
    all_proxies = data.get("proxies", {})

    groups: list[dict[str, Any]] = []
    group_types = {
        "Selector",
        "URLTest",
        "Fallback",
        "LoadBalance",
        "Relay",
        "Smart",
    }

    for name, item in all_proxies.items():
        if item.get("type") in group_types:
            effective = resolve_effective_proxy(all_proxies, name)
            groups.append(
                {
                    "name": name,
                    "type": item.get("type"),
                    "now": item.get("now"),
                    "all": item.get("all", []),
                    "effective": effective["effective"],
                    "chain": effective["chain"],
                    "cycle": effective["cycle"],
                }
            )

    return {"groups": groups}


@app.get("/api/proxy-groups/{group_name}")
async def proxy_group(group_name: str) -> dict[str, Any]:
    data = await mihomo_request("GET", "/proxies")
    all_proxies = data.get("proxies", {})
    if group_name not in all_proxies:
        raise HTTPException(404, detail=f"Proxy group not found: {group_name}")

    item = all_proxies[group_name]
    effective = resolve_effective_proxy(all_proxies, group_name)
    return {
        "name": group_name,
        "type": item.get("type"),
        "now": item.get("now"),
        "all": item.get("all", []),
        "effective": effective["effective"],
        "chain": effective["chain"],
        "cycle": effective["cycle"],
    }


@app.put("/api/proxy-groups/{group_name}/select")
async def select_proxy(group_name: str, body: SelectProxyRequest) -> Any:
    path = f"/proxies/{quote(group_name, safe='') }"
    return await mihomo_request("PUT", path, json={"name": body.proxy})


@app.get("/api/connections")
async def connections() -> Any:
    return await mihomo_request("GET", "/connections")


@app.get("/api/traffic")
async def traffic() -> Any:
    return await mihomo_request("GET", "/traffic")

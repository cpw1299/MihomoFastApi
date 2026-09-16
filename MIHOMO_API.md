# Mihomo 9090 API 完整参考

> 面向 `external-controller: 127.0.0.1:9090` 的 RESTful API 参考文档。
>
> 本文按 Mihomo 官方 API 文档整理，覆盖当前官方文档列出的 Controller API：日志、流量、内存、版本、缓存、运行配置、重启、升级、策略组、代理、代理提供者、规则、规则提供者、连接、DNS、存储以及 Debug/pprof。
>
> **版本说明**：Mihomo API 会随版本演进。本文以 2026-07-18 发布的官方 API 文档页面为基准；实际使用时，应以运行中的 Mihomo 版本为准。

## 1. 基本信息

### 1.1 Controller 地址

典型配置：

```yaml
external-controller: 127.0.0.1:9090
```

API 根地址：

```text
http://127.0.0.1:9090
```

也可以使用 `0.0.0.0:9090` 监听所有 IPv4 地址，但不建议在没有访问控制的情况下暴露到公网。

### 1.2 Secret 鉴权

如果配置：

```yaml
secret: "your-secret"
```

请求应携带：

```http
Authorization: Bearer your-secret
```

示例：

```bash
curl -H "Authorization: Bearer your-secret" \
  http://127.0.0.1:9090/version
```

### 1.3 CORS

浏览器前端调用 API 时，可以配置：

```yaml
external-controller-cors:
  allow-origins:
    - '*'
  allow-private-network: true
```

### 1.4 通用约定

- `GET`：读取状态、查询信息或执行查询类测试。
- `POST`：执行动作，例如刷新缓存、重启、升级。
- `PUT`：替换/更新资源或执行部分控制操作。
- `PATCH`：部分修改运行配置或规则状态。
- `DELETE`：删除、关闭或清除资源。
- `WS`：实时数据流。
- 控制类 API 成功但没有响应正文时通常返回 `204 No Content`。
- 路径中的 `{name}`、`:id`、`providers_name` 等均代表实际值，包含中文、空格、`/`、`#` 等字符时必须正确 URL 编码。

---

# 2. API 总览

| 分类 | Endpoint | 方法 | 说明 |
|---|---|---|---|
| 日志 | `/logs` | GET / WS | 实时日志 |
| 流量 | `/traffic` | GET / WS | 实时上下行速率及累计流量 |
| 内存 | `/memory` | GET / WS | 实时内存 |
| 版本 | `/version` | GET | Mihomo 版本 |
| 缓存 | `/cache/fakeip/flush` | POST | 清空 Fake-IP 缓存 |
| 缓存 | `/cache/dns/flush` | POST | 清空 DNS 缓存 |
| 配置 | `/configs` | GET / PUT / PATCH | 读取、重载、修改运行配置 |
| GEO | `/configs/geo` | POST | 更新 GEO 数据库 |
| 内核 | `/restart` | POST | 重启 Mihomo |
| 升级 | `/upgrade` | POST | 升级 Mihomo 内核 |
| 升级 | `/upgrade/ui` | POST | 更新外部 UI |
| 升级 | `/upgrade/geo` | POST | 更新 GEO 数据库 |
| 策略组 | `/group` | GET | 获取全部策略组 |
| 策略组 | `/group/{name}` | GET | 获取指定策略组 |
| 策略组 | `/group/{name}/delay` | GET | 批量测试策略组成员 |
| 代理 | `/proxies` | GET | 获取全部代理 |
| 代理 | `/proxies/{name}` | GET / PUT / DELETE | 查询、选择、清除固定选择 |
| 延迟 | `/proxies/{name}/delay` | GET | 测试单个代理 |
| 代理提供者 | `/providers/proxies` | GET | 获取全部代理提供者 |
| 代理提供者 | `/providers/proxies/{name}` | GET / PUT | 查询/更新代理提供者 |
| 代理提供者 | `/providers/proxies/{name}/healthcheck` | GET | 健康检查 |
| 提供者节点 | `/providers/proxies/{provider}/{proxy}` | GET | 查询指定提供者节点 |
| 提供者节点 | `/providers/proxies/{provider}/{proxy}/healthcheck` | GET | 测试指定提供者节点 |
| 规则 | `/rules` | GET | 获取规则 |
| 规则 | `/rules/disable` | PATCH | 临时启用/禁用规则 |
| 规则提供者 | `/providers/rules` | GET | 获取全部规则提供者 |
| 规则提供者 | `/providers/rules/{name}` | PUT | 更新规则提供者 |
| 连接 | `/connections` | GET / WS / DELETE | 查询/实时订阅/关闭全部连接 |
| 连接 | `/connections/{id}` | DELETE | 关闭指定连接 |
| DNS | `/dns/query` | GET | DNS 查询 |
| 存储 | `/storage/{key}` | GET / PUT / DELETE | 读写持久化 JSON 数据 |
| Debug | `/debug/gc` | PUT | 主动 GC |
| Debug | `/debug/pprof` | GET | Go pprof 调试入口 |

---

# 3. Request / Authentication

## 3.1 请求示例

官方文档示例：

```bash
curl -H 'Authorization: Bearer ${secret}' \
  'http://${controller-api}/configs?force=true' \
  -d '{"path":"", "payload":""}' \
  -X PUT
```

如果请求中的 `path` 不在 Mihomo 工作目录内，需要通过 `SAFE_PATHS` 环境变量加入允许路径。

## 3.2 JSON Content-Type

发送 JSON 请求体时建议使用：

```http
Content-Type: application/json
```

## 3.3 WebSocket

如果 Controller 为：

```text
http://127.0.0.1:9090
```

对应 WebSocket 一般使用：

```text
ws://127.0.0.1:9090/<endpoint>
```

HTTPS Controller 则使用：

```text
wss://127.0.0.1:9443/<endpoint>
```

---

# 4. Logs

## `GET /logs`

获取实时日志。

### Query 参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `level` | string | 否 | `info`、`warning`、`error`、`debug` |
| `format` | string | 否 | 设置为 `structured` 后使用结构化日志格式 |

示例：

```text
GET /logs?level=info
GET /logs?level=debug&format=structured
```

标准模式每行一个 JSON：

```json
{
  "type": "info",
  "payload": "log message"
}
```

结构化模式：

```json
{
  "time": "12:34:56",
  "level": "info",
  "message": "log message",
  "fields": []
}
```

## `WS /logs`

实时接收日志，参数与 GET 形式一致。

---

# 5. Traffic

## `GET /traffic`

获取实时流量。

响应通常每秒推送一次：

```json
{
  "up": 1024,
  "down": 2048,
  "upTotal": 123456,
  "downTotal": 654321
}
```

| 字段 | 类型 | 单位 | 说明 |
|---|---|---|---|
| `up` | number | bytes/s | 当前上传速率 |
| `down` | number | bytes/s | 当前下载速率 |
| `upTotal` | number | byte | 累计上传 |
| `downTotal` | number | byte | 累计下载 |

## `WS /traffic`

实时推送上述流量对象，官方实现通常每秒推送一次。

---

# 6. Memory

## `GET /memory`

获取实时内存。

```json
{
  "inuse": 12345678,
  "oslimit": 0
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `inuse` | number | 当前使用内存，byte |
| `oslimit` | number | OS 内存限制，官方 API 文档中为 `0` |

## `WS /memory`

持续推送内存数据，通常每秒一次。

---

# 7. Version

## `GET /version`

获取 Mihomo 版本。

```json
{
  "meta": true,
  "version": "Mihomo version"
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `meta` | boolean | 是否为 Meta 构建 |
| `version` | string | 版本字符串 |

---

# 8. Cache

## `POST /cache/fakeip/flush`

清空 Fake-IP 缓存。

成功：`204 No Content`。

## `POST /cache/dns/flush`

清空 DNS 缓存。

成功：`204 No Content`。

---

# 9. Running Configuration

## `GET /configs`

获取当前运行配置。

返回 JSON 对象，可能包含：

- `port`
- `socks-port`
- `mixed-port`
- `mode`
- `log-level`
- `allow-lan`
- `ipv6`
- `tun`
- `dns`
- `proxies`
- `proxy-groups`
- `proxy-providers`
- `rule-providers`
- 以及当前版本支持的其他运行配置。

## `PUT /configs`

重新加载基础配置。

### Query

| 参数 | 类型 | 说明 |
|---|---|---|
| `force` | boolean | `true` 时强制重新加载 |

示例：

```bash
curl -X PUT 'http://127.0.0.1:9090/configs?force=true'
```

成功：`204`。

## `PATCH /configs`

部分修改运行配置。

### 请求体

```json
{
  "mixed-port": 7890
}
```

可以提交需要修改的配置字段，而无需重新提交完整配置。

成功：`204`。

## `POST /configs/geo`

更新 GEO 数据库。

### 请求体

官方示例格式：

```json
{
  "path": "",
  "payload": ""
}
```

成功：`204`。

## `POST /restart`

重启 Mihomo 内核。

### 请求体

官方文档给出的请求格式为：

```json
{
  "path": "",
  "payload": ""
}
```

成功：`204`。

> 这是高影响操作。调用后 Controller 连接可能短暂中断。

---

# 10. Updates

## `POST /upgrade`

升级 Mihomo 内核。

### Query

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `channel` | string | 否 | 指定升级 channel |
| `force` | boolean | 否 | 是否强制升级 |

### 请求体

官方 API 文档示例：

```json
{
  "path": "",
  "payload": ""
}
```

### 返回

```json
{
  "status": "ok"
}
```

## `POST /upgrade/ui`

更新外部 UI。

要求配置 `external-ui`。

返回：

```json
{
  "status": "ok"
}
```

## `POST /upgrade/geo`

更新 GEO 数据库。

### 请求体

```json
{
  "path": "",
  "payload": ""
}
```

成功：`204`。

---

# 11. Policy Groups

## `GET /group`

获取全部策略组。

```json
{
  "proxies": [
    {
      "name": "PROXY",
      "type": "Selector"
    }
  ]
}
```

每个对象与 `/proxies/{name}` 中的策略组对象格式相同。

## `GET /group/{name}`

获取指定策略组。

返回策略组对象。

## `GET /group/{name}/delay`

批量测试指定策略组内的节点/策略组，并返回最新延迟；对自动策略组还会清除固定选择。

### Query 参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `url` | string | 是 | 测试 URL |
| `timeout` | integer | 是 | 超时时间，ms |
| `expected` | string | 否 | 期望 HTTP 状态码，可使用 `200/204`、`200-299` 等范围 |

示例：

```text
GET /group/PROXY/delay?url=https%3A%2F%2Fwww.gstatic.com%2Fgenerate_204&timeout=5000&expected=204
```

### 返回

```json
{
  "节点A": 120,
  "节点B": 350
}
```

value 为延迟毫秒数。

---

# 12. Proxies

## `GET /proxies`

获取全部代理和策略组。

```json
{
  "proxies": {
    "DIRECT": {
      "name": "DIRECT",
      "type": "Direct",
      "udp": true,
      "alive": true,
      "history": []
    },
    "PROXY": {
      "name": "PROXY",
      "type": "Selector",
      "now": "节点A",
      "all": ["节点A", "节点B"],
      "testUrl": "https://www.gstatic.com/generate_204"
    }
  }
}
```

### 通用代理字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `name` | string | 节点/策略组名称 |
| `type` | string | 类型，如 `Shadowsocks`、`VMess`、`Trojan`、`DIRECT`、`Selector` 等 |
| `udp` | boolean | UDP 支持 |
| `uot` | boolean | UDP over TCP 支持 |
| `xudp` | boolean | XUDP 支持 |
| `tfo` | boolean | TCP Fast Open |
| `mptcp` | boolean | MPTCP |
| `smux` | object/boolean | 多路复用相关状态 |
| `alive` | boolean | 当前是否可用 |
| `history` | array | 延迟历史 |
| `extra` | object | 按测试 URL 分类的额外延迟历史 |
| `interface` | string | 绑定网络接口 |
| `routing-mark` | number | 路由标记 |
| `provider-name` | string | 所属 provider |
| `dialer-proxy` | string | 底层拨号代理 |

### `history`

```json
[
  {
    "time": "2026-09-16T09:00:00Z",
    "delay": 120
  }
]
```

### 策略组额外字段

`Selector`、`URLTest`、`Fallback`、`LoadBalance` 等策略组可能包含：

| 字段 | 说明 |
|---|---|
| `now` | 当前选择的节点；LoadBalance 等类型可能没有 |
| `all` | 成员名称数组 |
| `testUrl` | 健康检查 URL |
| `hidden` | 是否在 Dashboard 隐藏 |
| `icon` | 图标 URL |
| `emptyFallback` | 全部成员不可用时的备用节点 |
| `expectedStatus` | 健康检查期望状态；Selector 不一定存在 |
| `fixed` | 当前固定节点，主要用于 URLTest/Fallback |

## `GET /proxies/{name}`

查询指定代理或策略组。

返回与 `/proxies` 中对应对象一致。

## `PUT /proxies/{name}`

选择策略组节点。

### 请求体

```json
{
  "name": "节点A"
}
```

成功：`204`。

## `DELETE /proxies/{name}`

清除代理/策略组的固定选择，`Selector` 不支持该操作。

成功：`204`。

## `GET /proxies/{name}/delay`

测试指定代理延迟。

### Query

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `url` | string | 是 | 测试目标 URL |
| `timeout` | integer | 是 | 超时时间，ms |
| `expected` | string | 否 | 期望 HTTP 状态码/范围 |

示例：

```text
GET /proxies/节点A/delay?url=https%3A%2F%2Fwww.gstatic.com%2Fgenerate_204&timeout=5000&expected=204
```

返回：

```json
{
  "delay": 123
}
```

`delay` 单位为 ms。

---

# 13. Proxy Providers

## `GET /providers/proxies`

获取全部代理提供者。

```json
{
  "providers": {
    "provider1": {
      "name": "provider1",
      "type": "HTTP",
      "proxies": []
    }
  }
}
```

实际对象可能包含更多 provider 元数据。

## `GET /providers/proxies/{provider}`

获取指定代理提供者，包括其配置元数据和 `proxies` 列表。

## `PUT /providers/proxies/{provider}`

更新指定代理提供者。

成功：`204`。

## `GET /providers/proxies/{provider}/healthcheck`

触发指定代理提供者健康检查。

成功：`204`。

## `GET /providers/proxies/{provider}/{proxy}`

获取 provider 中指定节点。

返回结构与 `/proxies/{name}` 的代理对象基本一致。

## `GET /providers/proxies/{provider}/{proxy}/healthcheck`

测试 provider 中指定节点。

### Query

```text
?url=https://www.gstatic.com/generate_204&timeout=5000
```

也可以传 `expected`。

### 返回

```json
{
  "delay": 123
}
```

---

# 14. Rules

## `GET /rules`

获取当前规则。

```json
{
  "rules": [
    {
      "index": 0,
      "type": "DOMAIN-SUFFIX",
      "payload": "example.com",
      "proxy": "PROXY",
      "size": -1
    }
  ]
}
```

### Rule 字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `index` | integer | 规则索引，从 0 开始 |
| `type` | string | 规则类型，如 `DOMAIN`、`DOMAIN-SUFFIX`、`IP-CIDR`、`GEOIP`、`GEOSITE` 等 |
| `payload` | string | 匹配内容 |
| `proxy` | string | 目标代理/策略组 |
| `size` | integer | GEOIP/GEOSITE 等规则集大小；其他通常为 `-1` |
| `extra` | object | 可选运行时信息 |

`extra` 可能包含：

- `disabled`：是否禁用
- `hitCount`：命中次数
- `hitAt`：最近命中时间
- `missCount`：未命中次数
- `missAt`：最近未命中时间

## `PATCH /rules/disable`

临时启用/禁用规则。

请求体 key 为规则 index，value 为布尔值：

```json
{
  "0": false,
  "1": true
}
```

- `true`：禁用
- `false`：启用

该状态在重启后恢复。

成功：`204`。

---

# 15. Rule Providers

## `GET /providers/rules`

获取全部规则提供者：

```json
{
  "providers": {
    "provider1": {}
  }
}
```

## `PUT /providers/rules/{provider}`

更新指定规则提供者。

成功：`204`。

> 当前官方 API 页面没有为该 Endpoint 单独列出 GET 方法；不要把它与代理 provider 的 GET API 混淆。

---

# 16. Connections

## `GET /connections`

获取当前连接和流量统计。

### Query

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `interval` | integer | `1000` | 实时刷新间隔，ms |

### 返回

```json
{
  "downloadTotal": 123456,
  "uploadTotal": 45678,
  "memory": 12345678,
  "connections": []
}
```

### Connection 字段

| 字段 | 说明 |
|---|---|
| `id` | 连接唯一 ID |
| `metadata` | 源/目标地址、协议、进程等元数据 |
| `upload` | 当前连接上传字节数 |
| `download` | 当前连接下载字节数 |
| `start` | 连接开始时间 |
| `chains` | 代理链 |
| `providerChains` | provider 代理链 |
| `rule` | 命中的规则类型 |
| `rulePayload` | 命中的规则内容 |

## `WS /connections`

实时推送连接数据。

例如：

```text
ws://127.0.0.1:9090/connections?interval=1000
```

## `DELETE /connections`

关闭全部连接。

成功：`204`。

## `DELETE /connections/{id}`

关闭指定连接。

成功：`204`。

---

# 17. DNS Query

## `GET /dns/query`

查询 DNS。

### Query

| 参数 | 类型 | 必填 | 示例 | 说明 |
|---|---|---|---|---|
| `name` | string | 是 | `example.com` | 查询名称 |
| `type` | string | 是 | `A` | DNS 类型，例如 A、AAAA、CNAME |

示例：

```text
GET /dns/query?name=example.com&type=A
```

### 返回字段

| 字段 | 说明 |
|---|---|
| `Status` | DNS RCODE |
| `Question` | 查询问题 |
| `TC` | 是否截断 |
| `RD` | 是否请求递归 |
| `RA` | 是否支持递归 |
| `AD` | Authenticated Data |
| `CD` | Checking Disabled |
| `Answer` | Answer 记录，可选 |
| `Authority` | Authority 记录，可选 |
| `Additional` | Additional 记录，可选 |

记录一般包含：

```json
{
  "name": "example.com.",
  "type": 1,
  "TTL": 60,
  "data": "93.184.216.34"
}
```

---

# 18. Storage

## `GET /storage/{key}`

读取指定 key 的持久化 JSON 值。

如果不存在，返回：

```json
null
```

## `PUT /storage/{key}`

写入指定 key。

### 请求体

必须是合法 JSON，最大 1 MB：

```json
{
  "foo": "bar"
}
```

也可以写入合法的 JSON 字符串、数字、数组、布尔值或 `null`，只要满足接口对 JSON 的要求。

成功：`204`。

## `DELETE /storage/{key}`

删除指定 key。

成功：`204`。

---

# 19. Debug

> Debug API 要求 Mihomo 内核以 `debug` 日志级别启动。

## `PUT /debug/gc`

主动执行垃圾回收。

成功：`204`。

## `GET /debug/pprof`

打开 Go pprof 调试页面：

```text
http://127.0.0.1:9090/debug/pprof
```

常用报告：

```text
/debug/pprof/heap
/debug/pprof/allocs
```

也可以使用：

```bash
go tool pprof -http=:8080 http://127.0.0.1:9090/debug/pprof/heap
```

下载原始 heap 报告：

```text
/debug/pprof/heap?raw=true
```

### 安全说明

pprof 会暴露运行时调试信息，只应在受信任环境使用。

---

# 20. WebSocket API 速查

| Endpoint | 主要用途 | 常见推送内容 |
|---|---|---|
| `WS /logs` | 实时日志 | 日志事件 |
| `WS /traffic` | 实时流量 | up/down/upTotal/downTotal |
| `WS /memory` | 实时内存 | inuse/oslimit |
| `WS /connections` | 实时连接 | connections + 流量统计 |

---

# 21. 常用参数速查

| 参数 | Endpoint | 类型 | 说明 |
|---|---|---|---|
| `level` | `/logs` | string | `info` / `warning` / `error` / `debug` |
| `format` | `/logs` | string | `structured` 启用结构化日志 |
| `interval` | `/connections` | integer | 刷新间隔，ms |
| `force` | `/configs`、`/upgrade` | boolean | 强制操作 |
| `channel` | `/upgrade` | string | 内核升级 channel |
| `url` | delay/healthcheck | string | 测试 URL |
| `timeout` | delay/healthcheck | integer | 超时，ms |
| `expected` | delay/healthcheck | string | 期望 HTTP 状态码或范围 |
| `name` | `/dns/query` | string | DNS 名称 |
| `type` | `/dns/query` | string | DNS 查询类型 |
| `{name}` | 多个资源 API | path | 节点、策略组、provider 名称 |
| `{id}` | `/connections/{id}` | path | 连接 ID |
| `{key}` | `/storage/{key}` | path | Storage key |

---

# 22. HTTP 方法与成功响应速查

| Endpoint 类型 | 方法 | 成功响应 |
|---|---|---|
| 查询 | GET | JSON |
| 实时流 | WS | 持续 JSON/事件 |
| 控制操作 | POST | 常见为 204；升级接口可能返回 JSON |
| 更新资源 | PUT | 常见为 204 |
| 部分更新 | PATCH | 常见为 204 |
| 删除/关闭 | DELETE | 常见为 204 |

`204 No Content` 表示操作成功且没有响应正文，不是错误。

---

# 23. 常见错误

## 401 Unauthorized

通常表示配置了 `secret`，但请求没有正确携带：

```http
Authorization: Bearer <secret>
```

## 404 Not Found

可能原因：

- 当前 Mihomo 版本没有该 API。
- 路径错误。
- 节点/策略组/provider/key 不存在。
- 路径参数没有正确 URL 编码。

## 400 Bad Request

常见原因：

- 缺少必要 query 参数。
- JSON 请求体格式错误。
- 参数值不符合当前 API 要求。

## 204 No Content

控制操作成功但没有响应正文时属于正常结果。

## 浏览器跨域失败

检查：

```yaml
external-controller-cors:
  allow-origins:
    - '*'
  allow-private-network: true
```

并确认浏览器页面可以访问 Controller 地址。

---

# 24. 安全建议

1. 不要把 `external-controller: 0.0.0.0:9090` 无保护地暴露到公网。
2. 配置随机、足够复杂的 `secret`。
3. 只在需要时开放 CORS。
4. Unix Socket / Windows Named Pipe 的访问不依赖 API secret 时，应使用操作系统权限保护。
5. `external-doh-server` 不验证 API secret，应避免无保护暴露。
6. `/restart`、`/upgrade`、`/configs`、`/connections` 等 API 具有明显控制能力，不应作为普通只读接口开放。
7. `/debug/pprof` 仅应在受信环境使用。
8. 对浏览器前端而言，不要把 Mihomo API secret 硬编码到公开网页中。

---

# 25. 本项目常用 API

本项目的节点管理页面主要使用：

## 获取全部节点

```text
GET /proxies
```

## 获取策略组

```text
GET /proxies/PROXY
```

## 切换节点

```text
PUT /proxies/PROXY
```

请求体：

```json
{
  "name": "节点名称"
}
```

## 单节点延迟

```text
GET /proxies/{node}/delay?url=...&timeout=...&expected=...
```

## 全部节点延迟

```text
GET /group/PROXY/delay?url=...&timeout=...&expected=...
```

批量测速优先使用 `/group/{name}/delay`，因为它可以一次返回策略组成员的延迟结果。

---

# 26. 官方参考

- Mihomo API：https://wiki.metacubex.one/en/api/
- Mihomo General Configuration：https://wiki.metacubex.one/en/config/general/
- Mihomo Proxy Providers：https://wiki.metacubex.one/en/config/proxy-providers/
- Mihomo Rule Providers：https://wiki.metacubex.one/en/config/rule-providers/

本文以官方 API 页面列出的公开 Controller Endpoint 为范围，不把配置文件中的代理协议字段、策略组字段等误认为 9090 Controller API。

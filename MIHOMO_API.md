# Mihomo 9090 API 完整参考

> 面向 `external-controller: 127.0.0.1:9090` 的 RESTful API 参考文档。
>
> **适用范围**：本文按 Mihomo 官方 External Controller API 文档整理，覆盖运行信息、配置、代理、代理提供者、规则、规则提供者、连接、DNS、日志、脚本、缓存、TUN、健康检查等常用/公开 API，并说明请求方法、参数、请求体和典型返回值。
>
> **重要**：API 版本会随 Mihomo 版本演进。若实际运行版本与本文档存在差异，应以对应版本的 Mihomo API 文档和实际返回结果为准。

## 1. 基本信息

### 1.1 Controller 地址

典型配置：

```yaml
external-controller: 127.0.0.1:9090
```

因此 API 根地址通常为：

```text
http://127.0.0.1:9090
```

也可以配置为 `0.0.0.0:9090` 监听所有 IPv4 地址，但不建议在没有访问控制的情况下直接暴露到公网。

### 1.2 Secret 鉴权

如果配置了：

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

浏览器直接调用 API 时，需要正确配置 CORS，例如：

```yaml
external-controller-cors:
  allow-origins:
    - '*'
  allow-private-network: true
```

### 1.4 通用约定

- `GET`：读取状态、查询信息、执行部分测试操作。
- `POST`：执行动作，例如刷新缓存。
- `PUT`：修改资源或提交配置。
- `PATCH`：部分修改。
- `DELETE`：删除/关闭资源。
- `WS`：实时推送数据，主要用于日志和连接等接口。
- 成功但没有响应正文的操作通常返回 HTTP `204 No Content`。
- 路径中的 `:name`、`{name}`、`providers_name` 等均表示实际名称，需要进行 URL 编码。

---

# 2. API 总览

| 分类 | Endpoint | 方法 | 作用 |
|---|---|---|---|
| 版本 | `/version` | GET | 获取 Mihomo 版本 |
| 内存 | `/memory` | GET / WS | 获取实时内存信息 |
| 日志 | `/logs` | GET / WS | 获取日志/实时日志 |
| 配置 | `/configs` | GET / PUT | 读取/更新运行配置 |
| 配置 | `/configs/geo` | PUT | 更新 Geo 数据 |
| 配置 | `/configs?force=true` | PUT | 强制重新加载配置 |
| 缓存 | `/cache/fakeip/flush` | POST | 清空 Fake-IP 缓存 |
| 缓存 | `/cache/dns/flush` | POST | 清空 DNS 缓存 |
| 代理 | `/proxies` | GET | 获取全部代理和策略组 |
| 代理 | `/proxies/{name}` | GET | 获取指定代理 |
| 代理 | `/proxies/{name}` | PUT | 切换策略组节点 |
| 代理 | `/proxies/{name}` | DELETE | 清除固定选择 |
| 延迟 | `/proxies/{name}/delay` | GET | 测试单个代理 |
| 策略组 | `/group/{name}/delay` | GET | 批量测试策略组成员 |
| 代理提供者 | `/providers/proxies` | GET | 获取全部代理提供者 |
| 代理提供者 | `/providers/proxies/{name}` | GET / PUT | 查询/更新代理提供者 |
| 代理提供者 | `/providers/proxies/{name}/healthcheck` | GET | 健康检查 |
| 提供者节点 | `/providers/proxies/{provider}/{proxy}` | GET | 获取提供者中的指定节点 |
| 提供者节点 | `/providers/proxies/{provider}/{proxy}/healthcheck` | GET | 测试指定节点 |
| 规则 | `/rules` | GET | 获取规则 |
| 规则 | `/rules/disable` | PATCH | 临时启用/禁用规则 |
| 规则提供者 | `/providers/rules` | GET | 获取全部规则提供者 |
| 规则提供者 | `/providers/rules/{name}` | GET / PUT | 查询/更新规则提供者 |
| 连接 | `/connections` | GET / WS | 获取连接和流量统计 |
| 连接 | `/connections` | DELETE | 关闭全部连接 |
| 连接 | `/connections/{id}` | DELETE | 关闭指定连接 |
| DNS | `/dns/query` | GET | DNS 查询 |
| TUN | `/restart` 等 | POST | 部分运行时控制 |

> 不同 Mihomo 版本可能增加或调整 Endpoint。本文优先描述官方 API 文档中公开的 Controller API。

---

# 3. Version

## `GET /version`

获取 Mihomo 版本信息。

### 请求

```http
GET /version
```

### 返回

```json
{
  "meta": true,
  "version": "Mihomo version"
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `meta` | boolean | 是否为 Meta/Mihomo 构建 |
| `version` | string | 当前版本字符串 |

---

# 4. Memory

## `GET /memory`

获取当前内存使用情况。

### 返回

```json
{
  "inuse": 12345678,
  "oslimit": 0
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `inuse` | number | 当前使用的内存，单位 byte |
| `oslimit` | number | OS 内存限制，通常为 `0` 表示未设置 |

## `WS /memory`

通过 WebSocket 持续接收内存数据，通常每秒推送一次。

---

# 5. Logs

## `GET /logs`

获取日志。

### 查询参数

| 参数 | 类型 | 说明 |
|---|---|---|
| `level` | string | 日志等级过滤，例如 `debug`、`info`、`warning`、`error`、`silent` |

示例：

```text
GET /logs?level=info
```

## `WS /logs`

建立 WebSocket 后持续接收日志事件。

典型日志对象包含：

```json
{
  "type": "info",
  "payload": "log message"
}
```

---

# 6. Running Configuration

## `GET /configs`

获取当前运行配置。

### 返回

返回当前运行中的配置 JSON，可能包含：

- `port`
- `socks-port`
- `redir-port`
- `tproxy-port`
- `mixed-port`
- `allow-lan`
- `bind-address`
- `mode`
- `log-level`
- `ipv6`
- `tun`
- `dns`
- `proxies`
- `proxy-groups`
- `proxy-providers`
- `rule-providers`
- 以及其他当前版本支持的配置项。

> 该接口返回的是运行时配置对象，不应简单理解为原始 YAML 文件内容。

## `PUT /configs`

更新/重新加载配置。

### Query 参数

| 参数 | 类型 | 说明 |
|---|---|---|
| `force` | boolean | 某些配置更新场景需要设置为 `true` |

### 请求体

```json
{
  "path": "",
  "payload": ""
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `path` | string | 配置文件路径 |
| `payload` | string | 配置内容/更新载荷 |

示例：

```bash
curl -X PUT \
  'http://127.0.0.1:9090/configs?force=true' \
  -H 'Content-Type: application/json' \
  -d '{"path":"config.yaml","payload":""}'
```

### 路径安全

如果 `path` 位于 Mihomo 工作目录之外，需要通过 `SAFE_PATHS` 环境变量加入允许路径。

---

# 7. Geo 配置

## `PUT /configs/geo`

用于更新 Geo 数据相关资源。

> 具体可更新项目和请求字段可能随 Mihomo 版本变化，使用时应以运行版本 API 实现为准。

---

# 8. Cache

## `POST /cache/fakeip/flush`

清空 Fake-IP 缓存。

```http
POST /cache/fakeip/flush
```

成功通常返回：

```text
HTTP 204 No Content
```

## `POST /cache/dns/flush`

清空 DNS 缓存。

```http
POST /cache/dns/flush
```

成功通常返回 `204`。

---

# 9. Proxies

## `GET /proxies`

获取全部代理节点和策略组。

### 返回结构

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

### 普通代理常见字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `name` | string | 节点名称 |
| `type` | string | 节点类型，例如 `Shadowsocks`、`VMess`、`Trojan`、`DIRECT` 等 |
| `udp` | boolean | 是否支持 UDP |
| `uot` | boolean | 是否支持 UDP over TCP |
| `xudp` | boolean | 是否支持 XUDP |
| `tfo` | boolean | TCP Fast Open 状态 |
| `mptcp` | boolean | MPTCP 状态 |
| `smux` | boolean/object | 多路复用相关信息 |
| `alive` | boolean | 当前是否可用 |
| `history` | array | 延迟历史 |
| `extra` | object | 按测试 URL 保存的额外延迟历史 |
| `interface` | string | 绑定网卡 |
| `routing-mark` | number | 路由标记 |
| `provider-name` | string | 所属代理提供者 |
| `dialer-proxy` | string | 底层拨号代理 |

### `history`

典型结构：

```json
[
  {
    "time": "2026-09-16T09:00:00Z",
    "delay": 120
  }
]
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `time` | string | 测试时间 |
| `delay` | number | 延迟，单位 ms |

### 策略组额外字段

`Selector`、`URLTest`、`Fallback`、`LoadBalance` 等策略组可能包含：

| 字段 | 类型 | 说明 |
|---|---|---|
| `now` | string | 当前选择的节点；LoadBalance 等类型可能不存在 |
| `all` | string[] | 组内所有成员 |
| `testUrl` | string | 健康检查 URL |
| `hidden` | boolean | 是否在 Dashboard 中隐藏 |
| `icon` | string | 图标 URL |
| `emptyFallback` | string | 全部成员不可用时的备用节点 |
| `expectedStatus` | number/string | 健康检查期望 HTTP 状态 |
| `fixed` | string | 当前固定节点，主要用于 URLTest/Fallback |

---

## `GET /proxies/{name}`

获取指定节点或策略组信息。

示例：

```http
GET /proxies/PROXY
```

名称必须进行 URL 编码。例如节点名包含 `/`、`#`、空格等字符时，应使用编码后的路径。

---

## `PUT /proxies/{name}`

切换策略组当前节点。

### 请求体

```json
{
  "name": "节点A"
}
```

示例：

```bash
curl -X PUT \
  http://127.0.0.1:9090/proxies/PROXY \
  -H 'Content-Type: application/json' \
  -d '{"name":"节点A"}'
```

成功通常返回 `204`。

> 对 `Selector` 等支持手动选择的策略组，该接口用于切换当前选择；并非所有代理类型都接受此操作。

---

## `DELETE /proxies/{name}`

清除策略组的固定选择。

```http
DELETE /proxies/PROXY
```

`Selector` 类型不支持该操作。

---

# 10. Proxy Delay

## `GET /proxies/{name}/delay`

测试指定代理的实际延迟。

### 参数

| 参数 | 必填 | 类型 | 默认/示例 | 说明 |
|---|---|---|---|---|
| `url` | 是 | string | `https://www.gstatic.com/generate_204` | 用于测试的目标 URL |
| `timeout` | 是 | integer | `5000` | 超时时间，单位 ms |
| `expected` | 否 | string | `204` | 期望 HTTP 状态码；支持 `200/204`、`200-299` 等范围表达式 |

示例：

```text
GET /proxies/节点A/delay?url=https%3A%2F%2Fwww.gstatic.com%2Fgenerate_204&timeout=5000&expected=204
```

### 返回

```json
{
  "delay": 123
}
```

`delay` 单位为毫秒。

### 失败

如果目标无法访问、超时或返回状态不符合 `expected`，API 会返回 HTTP 错误，而不是正常的 `delay` 数值。

---

# 11. Proxy Group Delay

## `GET /group/{name}/delay`

一次测试策略组内多个节点。这是批量测速最实用的接口。

### 参数

与单节点 `/proxies/{name}/delay` 类似：

| 参数 | 类型 | 说明 |
|---|---|---|
| `url` | string | 测试 URL |
| `timeout` | integer | 单节点测试超时时间，ms |
| `expected` | string | 期望 HTTP 状态码/范围 |

示例：

```text
GET /group/PROXY/delay?url=https%3A%2F%2Fwww.gstatic.com%2Fgenerate_204&timeout=5000&expected=204
```

### 返回

返回节点名称到延迟的映射，例如：

```json
{
  "节点A": 123,
  "节点B": 256,
  "节点C": 0
}
```

其中 key 是策略组成员名称，value 是对应延迟毫秒数。

> 如果前端需要“测试全部节点”，优先使用该接口；对于没有返回或测试失败的成员，再根据需要退回逐节点 `/proxies/{name}/delay`。

---

# 12. Proxy Providers

## `GET /providers/proxies`

获取全部代理提供者。

### 返回

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

实际 provider 对象还可能包含 URL、更新时间、健康检查配置等元数据。

## `GET /providers/proxies/{provider}`

获取指定代理提供者。

### 路径参数

| 参数 | 说明 |
|---|---|
| `{provider}` | 代理提供者名称 |

## `PUT /providers/proxies/{provider}`

更新指定代理提供者。

成功通常返回 `204`。

请求体以当前 Mihomo 版本实现为准。

## `GET /providers/proxies/{provider}/healthcheck`

触发指定代理提供者的健康检查。

成功通常返回 `204`。

## `GET /providers/proxies/{provider}/{proxy}`

获取代理提供者中的指定节点。

返回结构与 `/proxies/{name}` 中的单个代理对象基本一致。

## `GET /providers/proxies/{provider}/{proxy}/healthcheck`

测试代理提供者中的指定节点。

### 参数

```text
?url=https://www.gstatic.com/generate_204&timeout=5000
```

可使用 `expected` 指定期望 HTTP 状态码。

### 返回

```json
{
  "delay": 123
}
```

---

# 13. Rules

## `GET /rules`

获取当前规则。

### 返回

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
| `payload` | string | 规则匹配内容 |
| `proxy` | string | 命中后使用的代理/策略组 |
| `size` | integer | GEOIP/GEOSITE 等规则集的条目数量；其他情况通常为 `-1` |
| `extra` | object | 规则运行统计和禁用状态等附加信息 |

### `extra`

可能包含：

| 字段 | 类型 | 说明 |
|---|---|---|
| `disabled` | boolean | 是否临时禁用 |
| `hitCount` | number | 命中次数 |
| `hitAt` | string | 最近命中时间 |
| `missCount` | number | 未命中次数 |
| `missAt` | string | 最近未命中时间 |

---

# 14. Disable Rules

## `PATCH /rules/disable`

临时启用/禁用规则。

### 请求体

key 是规则 `index`，value 是布尔值：

```json
{
  "0": false,
  "1": true,
  "2": true
}
```

含义：

- `true`：禁用该规则。
- `false`：启用该规则。

这是运行时临时状态，重启后会恢复。

成功通常返回 `204`。

---

# 15. Rule Providers

## `GET /providers/rules`

获取所有规则提供者。

返回：

```json
{
  "providers": {
    "provider1": {
      "name": "provider1"
    }
  }
}
```

## `GET /providers/rules/{provider}`

获取指定规则提供者信息。

## `PUT /providers/rules/{provider}`

更新/刷新指定规则提供者。

成功通常返回 `204`。

> 具体 provider 元数据取决于当前配置及 Mihomo 版本。

---

# 16. Connections

## `GET /connections`

获取当前连接、累计流量以及连接占用内存。

### Query 参数

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `interval` | integer | `1000` | WebSocket/实时刷新间隔，单位 ms |

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

每个连接可能包含：

| 字段 | 说明 |
|---|---|
| `id` | 连接唯一 ID |
| `metadata` | 源地址、目标地址、协议、进程等元数据 |
| `upload` | 当前连接上传字节数 |
| `download` | 当前连接下载字节数 |
| `start` | 连接开始时间 |
| `chains` | 实际代理链 |
| `providerChains` | 代理提供者链 |
| `rule` | 命中的规则类型 |
| `rulePayload` | 命中的规则内容 |

## `WS /connections`

实时推送连接状态。

### `interval`

可以通过查询参数指定刷新间隔，例如：

```text
ws://127.0.0.1:9090/connections?interval=1000
```

## `DELETE /connections`

关闭所有连接。

成功通常返回 `204`。

## `DELETE /connections/{id}`

关闭指定连接。

示例：

```http
DELETE /connections/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

成功通常返回 `204`。

---

# 17. DNS Query

## `GET /dns/query`

通过 Mihomo DNS 系统执行一次 DNS 查询。

### 参数

| 参数 | 必填 | 类型 | 说明 |
|---|---|---|---|
| `name` | 是 | string | DNS 查询名称，例如 `example.com` |
| `type` | 是 | string | DNS 类型，例如 `A`、`AAAA`、`CNAME` |

示例：

```text
GET /dns/query?name=example.com&type=A
```

### 返回

响应遵循 DNS JSON 结构，常见字段：

| 字段 | 说明 |
|---|---|
| `Status` | DNS RCODE |
| `Question` | 查询问题 |
| `TC` | 是否截断 |
| `RD` | 是否请求递归 |
| `RA` | DNS 服务器是否支持递归 |
| `AD` | Authenticated Data |
| `CD` | Checking Disabled |
| `Answer` | Answer 记录 |
| `Authority` | Authority 记录 |
| `Additional` | Additional 记录 |

记录通常包含：

```json
{
  "name": "example.com.",
  "type": 1,
  "TTL": 60,
  "data": "93.184.216.34"
}
```

---

# 18. External DoH

如果配置：

```yaml
external-doh-server: /dns-query
```

Mihomo 可以在 REST API 端口提供 DoH 服务。

> **安全注意**：该 URL 不验证 API secret，因此如果 Controller 暴露在非受信网络中，应特别注意访问控制。

---

# 19. Unix Socket / Windows Named Pipe / HTTPS

Mihomo 的 External Controller 不仅可以监听 TCP。

### Unix Socket

```yaml
external-controller-unix: mihomo.sock
```

通过 Unix Socket 访问时不验证 secret，应自行做好文件权限和本地安全控制。

### Windows Named Pipe

```yaml
external-controller-pipe: \\\\.\\pipe\\mihomo
```

同样不依赖 API secret，应自行控制访问权限。

### HTTPS Controller

```yaml
external-controller-tls: 127.0.0.1:9443
```

需要同时配置 TLS 证书和私钥，并配置 `external-controller`。

---

# 20. API 鉴权示例

## curl

```bash
curl \
  -H 'Authorization: Bearer your-secret' \
  http://127.0.0.1:9090/proxies
```

## JavaScript

```javascript
fetch('http://127.0.0.1:9090/proxies', {
  headers: {
    Authorization: 'Bearer your-secret'
  }
}).then(r => r.json())
```

## Python

```python
import requests

url = 'http://127.0.0.1:9090/proxies'
headers = {'Authorization': 'Bearer your-secret'}
response = requests.get(url, headers=headers, timeout=5)
print(response.json())
```

---

# 21. 常用操作示例

## 21.1 获取所有节点

```bash
curl http://127.0.0.1:9090/proxies
```

## 21.2 获取当前策略组

```bash
curl http://127.0.0.1:9090/proxies/PROXY
```

## 21.3 切换节点

```bash
curl -X PUT \
  http://127.0.0.1:9090/proxies/PROXY \
  -H 'Content-Type: application/json' \
  -d '{"name":"节点A"}'
```

## 21.4 测试单个节点

```bash
curl 'http://127.0.0.1:9090/proxies/节点A/delay?url=https%3A%2F%2Fwww.gstatic.com%2Fgenerate_204&timeout=5000&expected=204'
```

## 21.5 测试策略组全部成员

```bash
curl 'http://127.0.0.1:9090/group/PROXY/delay?url=https%3A%2F%2Fwww.gstatic.com%2Fgenerate_204&timeout=5000&expected=204'
```

## 21.6 查看规则

```bash
curl http://127.0.0.1:9090/rules
```

## 21.7 查看连接

```bash
curl http://127.0.0.1:9090/connections
```

## 21.8 关闭全部连接

```bash
curl -X DELETE http://127.0.0.1:9090/connections
```

## 21.9 清理 DNS 缓存

```bash
curl -X POST http://127.0.0.1:9090/cache/dns/flush
```

## 21.10 查看版本

```bash
curl http://127.0.0.1:9090/version
```

---

# 22. 参数速查表

| 参数 | 常见 Endpoint | 说明 |
|---|---|---|
| `url` | `/proxies/{name}/delay`、provider healthcheck | 延迟/健康检查目标 URL |
| `timeout` | delay/healthcheck | 超时时间，ms |
| `expected` | delay | 期望 HTTP 状态码或范围 |
| `interval` | `/connections` | 实时连接刷新间隔，ms |
| `level` | `/logs` | 日志级别过滤 |
| `force` | `/configs` | 强制配置更新/重载 |
| `name` | `/dns/query` | DNS 查询域名 |
| `type` | `/dns/query` | DNS 查询类型 |

---

# 23. 常见错误与排查

## 401 Unauthorized

通常表示：

- 配置了 `secret` 但请求没有 `Authorization`。
- Bearer token 不正确。

检查：

```http
Authorization: Bearer <secret>
```

## 404 Not Found

常见原因：

- Endpoint 不属于当前 Mihomo 版本。
- 路径中的节点/策略组名称没有正确 URL 编码。
- provider 或 proxy 名称不存在。

## 400 Bad Request

通常表示参数或请求体格式不正确，例如缺少 `url`、`timeout`，或者 JSON 格式错误。

## 204 No Content

对于切换节点、刷新 provider、关闭连接、刷新缓存等控制类 API，`204` 通常代表成功，不代表“没有执行”。

## 浏览器跨域失败

检查：

```yaml
external-controller-cors:
  allow-origins:
    - '*'
  allow-private-network: true
```

同时确认浏览器页面访问地址与 Mihomo Controller 的网络访问策略允许互通。

---

# 24. 安全建议

1. **不要把 `external-controller: 0.0.0.0:9090` 直接暴露到公网。**
2. 配置强随机 `secret`。
3. 浏览器前端只在必要时开放 CORS。
4. Unix Socket / Windows Named Pipe 访问不依赖 secret 时，应依赖操作系统权限保护。
5. `external-doh-server` 不验证 API secret，应避免无保护地暴露。
6. API 可以切换代理、修改运行配置、关闭连接，因此不应视为只读接口。
7. 如果通过 HTTPS Controller 对外提供服务，应正确配置 TLS 证书和私钥。

---

# 25. 与本项目节点管理页面的关系

本项目当前节点管理页面主要使用以下接口：

### 获取节点

```text
GET /proxies
```

### 切换策略组节点

```text
PUT /proxies/PROXY
Body: {"name":"节点名称"}
```

### 测试单节点延迟

```text
GET /proxies/{node}/delay?url=...&timeout=...&expected=...
```

### 批量测试策略组节点

```text
GET /group/PROXY/delay?url=...&timeout=...&expected=...
```

其中批量测试接口适合前端一次获取多个节点的延迟结果。

---

# 26. 官方参考

- Mihomo API 文档：https://wiki.metacubex.one/en/api/
- Mihomo General Configuration：https://wiki.metacubex.one/en/config/general/
- Mihomo Proxy Providers：https://wiki.metacubex.one/en/config/proxy-providers/
- Mihomo Rule Providers：https://wiki.metacubex.one/en/config/rule-providers/

> 本文档以 Mihomo 官方文档为主要依据整理。由于 Mihomo API 会随版本增加新 Endpoint 或字段，建议升级 Mihomo 后重新核对官方 API 文档。

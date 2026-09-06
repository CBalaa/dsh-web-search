# 方案：接入「设置 → 插件-插件配置」

> 目标：让 `dsh-web-search` 的供应商选择（search/fetch vendor）与 API key 可以通过
> DSH 设置页图形化管理，并全程热生效、无需重启。
>
> 分两个阶段：**阶段 A 是地基（声明式 settings namespace，独立交付价值）**，
> **阶段 B 是图形卡片（依赖 client bundle，建议但可选）**。B 失败不影响 A 可用。

---

## 背景机制（已核实，实现者不必再查）

| 机制 | 事实 | 出处 |
|---|---|---|
| 声明式设置 | `ctx.settings.installSection(ownerCtx, namespace, Schema, compositionConfig, { setSource, onChange })`；解析值 = schema 默认 < 组合层 base < 用户文档（`~/.dsh/settings.yaml`），用户覆盖赢；服务缺失时插件回退 composition config 继续工作 | `dsh-settings` README；`dsh-web-search-deepseek/lib/index.js` 的 `apply` |
| 设置页卡片 | 「插件配置」tab 把 Host 服务的 namespace 与 `settings.plugin.item` slot 里 `key === namespace` 的卡片配对渲染；**没有卡片的 namespace 不渲染任何东西** | `dsh-client-ui-settings-plugins` README |
| 卡片注册 | `ctx.slots.inject("settings.plugin.item", function* () { yield ctx.slots.register({ name: "settings.plugin.item", key: NS, locale: NS_LOCALE, inject: () => controller.inject() }, CardComponent) })` | 同上 `lib/client.js`（`WEB_SEARCH_NS = "web-search-deepseek"` 内置卡） |
| 卡片数据 | `ctx.settingsScope.bind({ namespace })` → `getSnapshot()`（value+revision）/ `subscribe()` / revision-fenced update（底层 `remote.settings.mutate(ns, ops, revision)`，陈旧修订被拒绝） | `dsh-client-ui-settings/lib/client.js` |
| Key 控件 | secret 字段**不走 settings 文档**：卡片用 `ctx.remote.credentials.describe([ref])` 只显示"已配置"徽章、`credentials.set(ref, value)` 写入 credentials 域（`~/.dsh/.credentials.yaml`）；空提交不动现有 key；监听 `remote.$on("credentials/reference-updated", …)` 刷新 | 内置 `WebSearchCardController` |
| 外部插件 client 能力 | 外部插件 client bundle 可以 `ctx.slots.register/inject`（better-sidebar 的 `lib/client.js` 就在用）；client bundle 打包格式（lazy-CJS 单文件）由 better-sidebar 的 `tsdown.config.ts` 里自复制的 `clientBundle()` 产出；package.json 需声明 `dsh.client: { inject: [...], platform: "web" }` | better-sidebar 仓库 |
| schemastery | 支持 `Schema.object/string/number/boolean/const/union/intersect/transform`、`.default()`、`.role("secret")` / `.role("credential-ref")` | schemastery README + deepseek provider Config |

---

## 阶段 A：声明式 settings namespace（地基，无 GUI 也交付价值）

完成后用户可直接编辑 `~/.dsh/settings.yaml` 的 `web-search:` 段，**保存即热生效**（含 vendor 切换）。

### A1. 依赖与注入

- `package.json`：`dependencies` 加 `@deepseek-ai/schemastery`（^3.18.2，harness 树必带，是唯一新增 runtime dep）；`peerDependencies` 加 `@deepseek-ai/dsh-settings`（**可选**消费，代码里用 `ctx.inject(["settings"], cb)` 可选注入，**不**加进插件 `inject` 数组，否则服务缺失时插件整体不挂载）。

### A2. 新建 `lib/config-schema.js`

- vendor 枚举从 registry 名单生成（`z.union(vendors.map(z.const))`），保证"加 vendor 只动 registry + 此处一行"。
- 结构（与现有 cordis 配置**向后兼容**——当前 profile 的 `providers.tavily: {}` / `search: tavily` / `fetch: tavily` 必须原样通过校验）：

```
Config = z.object({
  search: <vendor 枚举>.default("tavily"),
  fetch:  z.union([z.const("off"), ...vendor 枚举]).default("off"),   // 见「注意 4」迁移
  providers: z.object({
    tavily: z.object({
      apiKey:    z.string().role("secret"),                            // 仅组合层逃生口；GUI 不渲染
      apiKeyEnv: z.string().role("credential-ref").default("TAVILY_API_KEY"),
      baseURL:   z.string().default("https://api.tavily.com"),
      maxResults: z.number().step(1).min(1).max(20).default(8),
      searchDepth: z.union([z.const("basic"), z.const("advanced")]).default("basic"),
      includeAnswer: z.boolean().default(true),
      transport: z.union([z.const("auto"), z.const("curl"), z.const("fetch")]).default("auto"),
      timeoutSec: z.number().min(1).default(30),
    }).default({}),
    firecrawl: z.object({
      apiKey:    z.string().role("secret"),
      apiKeyEnv: z.string().role("credential-ref").default("FIRECRAWL_API_KEY"),
      baseURL:   z.string().default("https://api.firecrawl.dev/v2"),
      limit:     z.number().step(1).min(1).max(50),
      transport: z.union([z.const("auto"), z.const("curl"), z.const("fetch")]).default("auto"),
      timeoutSec: z.number().min(1).default(30),
    }).default({}),
  }).default({}),
})
```

注意：现配置里 `transport` 接受 `"curl" | "fetch"` 字符串，schema 加了 `"auto"`，语义=缺省自动检测（与 `resolveTransport(undefined)` 一致）。

### A3. `lib/index.js` 重构（热更新接线）

1. `let current = () => config`；`ctx.inject(["settings"], (sctx) => { sctx.settings.installSection(ctx, "web-search", Config, config, { setSource: (source) => { current = source; reconcile(); }, onChange: () => {} }) })`。
2. **provider 改收 thunk**：`registry.createProviders(name, () => current().providers?.[name], helpers)`；vendor 模块的 `options()` 每次请求调用该 thunk（现结构已是每次请求读 env，只多一层 config 取值，改动极小）→ **key/baseURL/参数修改热生效**。
3. **vendor 切换热生效**：`reconcile()` 对比 `current().search/.fetch` 与已注册状态；`registerSearchProvider`/`registerFetchProvider` 返回 disposer，保存之；切换时**先 dispose 旧、再 register 新**（固定 id，避免 `WEB_DUPLICATE_PROVIDER`）。`search` 置空/未知时只 dispose 不注册（seam 报 `WEB_PROVIDER_CONFIGURED_MISSING`，错误可读）。
4. **key 解析链升级**（为 B 铺路）：vendor options 的 apiKey 解析改为
   `config.apiKey → credentials 服务解析 apiKeyEnv → process.env[apiKeyEnv] → ~/.tavily/config.json（仅 tavily）`。
   credentials 消费对齐 deepseek provider：`ctx.get("credentials")` 可选取，`credentialRef` 从 `@deepseek-ai/dsh-credentials` import（type 可选、运行时 try/catch 降级纯 env）。
   **`available()` 语义照抄 deepseek**：有字面 key **或**存在 resolveApiKey 通道即 true（同步方法不能 await resolve）。

### A4. 阶段 A 验证

- 单测（mock）：mock `ctx.web`（收集注册/返回 disposer 计数）+ mock settings 服务（捕获 hooks，手动推 `setSource`）。断言：a) 推新 config 后下次 `search()` 用新 baseURL/key；b) `tavily→firecrawl` 后旧 search disposer 被调一次、新 provider 以固定 id 注册；c) 无 settings 服务时全程用 composition config；d) 现有 profile cordis 配置对象能过 schema 校验（向后兼容用例）。
- 实机：装包重启 → 编辑 `~/.dsh/settings.yaml` 加 `web-search: { search: firecrawl }` → 不重启直接 `web_search`，应报 firecrawl 缺 key（证明切换热生效）→ 改回 tavily 再验证恢复。

---

## 阶段 B：设置页卡片 UI（可选，建议做）

### B1. client bundle 打包

- 复制 DSH-better-sidebar `tsdown.config.ts` 的 `clientBundle()` 思路：`format: 'cjs'`、单文件、外置白名单（react、`@deepseek-ai/dsh-client-*` 等宿主提供项）、产出 `lib/client.js`；入口源码放 `src/client/settings-card.tsx`。
- `package.json` 加：`"dsh": { "client": { "inject": ["@deepseek-ai/dsh-client-locale", "@deepseek-ai/dsh-client-ui-slots"], "platform": "web" } }`（对齐 better-sidebar 声明形状）。
- client 入口 `export const inject = ["slots", "locale", "remote", "remote.credentials", "settingsScope"]`。

### B2. 卡片（`src/client/settings-card.tsx`）

1. `apply(ctx)`：`const ctrl = new CardController(ctx.settingsScope.bind({ namespace: "web-search" }), ctx)`；按「背景机制」第 3 行注册 `settings.plugin.item`、`key: "web-search"`。
2. 控件集（React，受控草稿 + Save/Discard，**不**用未发布的内置 CardForm，自实现约 200 行）：
   - `search`: select（枚举来自 schema 描述或硬编码 vendor 名单）
   - `fetch`: select（off + vendors）
   - 每个 vendor 一块（随选择显隐）：**apiKey 密钥框**（初始空白；`remote.credentials.describe([apiKeyEnv])` 显示"已配置/未配置"徽章；`credentials.set(apiKeyEnv, value)` 写入；空提交不动现有 key；监听 `credentials/reference-updated` 刷新）+ `baseURL` + 特化字段（tavily: maxResults/searchDepth/includeAnswer；firecrawl: limit）+ `transport` 三态 + `timeoutSec`
3. 保存：按 `getSnapshot().revision` 做 revision-fenced 顺序 mutate；失败保留草稿并显示错误（行为对齐内置卡契约：Host 是接受的唯一权威）。重置=清该字段的用户层 presence。
4. locale：注册 `zh`/`en` 字典（`ctx.locale.register(NS, {...})`）。

### B3. 阶段 B 验证

- `pnpm build` → `dsh plugin --profile web add file:<repo>` → 重启 dsh web → 设置→插件→插件配置出现「web-search」卡片 → 下拉切 `search: firecrawl` 保存 → 立即 `web_search` 应报 firecrawl 缺 key → 在卡片写入 firecrawl key → 徽章变已配置 → `web_search`/`web_fetch` 实通 → 切回 tavily 复验。
- 回归：`settings.yaml` 手改与卡片改写互不覆盖（revision 拒绝陈旧写）。

---

## 风险与注意（实现前必读）

1. **阶段 B 无第三方端到端先例**：机制逐条核实过、better-sidebar 证明外部 client bundle 可行，但目前没有任何外部插件注册过 `settings.plugin.item` 卡片。若卡片不渲染：查浏览器 console、`ctx.slots.entries("settings.plugin.item")` 是否有 key=`web-search` 条目、namespace 是否被 Host 服务（已知限制：namespace 注册晚于 tab 首次读取时，要等下次文档提交或重连才出现——boot 即注册则无碍）。**阶段 A 不受影响，始终可用。**
2. **嵌套 `role("secret")`/`role("credential-ref")` 无内置先例**（内置卡都是顶层字段）：role 仅是 schema 元数据，我们的卡片自己控制 credentials 写路径，不依赖内置 secret 控件的自动发现；settings 文档里嵌套字段的 presence 语义（overridden 标记）按字段路径记录，卡片更新时带上完整嵌套路径。
3. **schema 双向约束**：同一 schema 既校验 cordis 组合层 config 又校验 settings 文档——所有字段必须带 default，嵌套对象 `.default({})`，否则现有 profile 配置会在 boot 时被拒。**A4-d 的兼容用例必须通过。**
4. **`fetch` 语义迁移**：现状 cordis 配置是 `fetch: tavily`（无 fetch 键=不注册）。新 schema 用显式 `"off"`。迁移：profile `cordis.patch.yml` 里 `fetch: tavily` 保留有效；文档里写明「缺省 off」。若用户文档曾写过 `fetch:` 空字符串需在 README 注明改为 `off`。
5. **零依赖哲学**：只新增 schemastery 一个 runtime dep；`dsh-settings`/`dsh-credentials` 均为可选运行时消费（服务缺失时行为=现状）。transport 的 curl 路径不依赖任何新包。
6. **不要动的**：profile `cordis.patch.yml` 的 `web` 行（`searchProvider: dsh-web-search` / `fetchProvider: dsh-web-fetch`）保持不变——本方案全部变化都在插件内部。

/**
 * dsh-web-search settings card (browser half): one `settings.plugin.item`
 * entry keyed by the `web-search` settings namespace, which the Host-side
 * plugin (lib/index.js) registers while a settings service is mounted. The
 * Settings → Plugins → Plugin configuration tab pairs this card with the
 * served namespace.
 *
 * The card stages edits over the bound settings scope and writes them on
 * save through one revision-fenced mutate per field (the scope serializes
 * and refreshes revisions between queued writes). Secrets never ride the
 * settings document — the API keys are supplied by the user in the card and
 * written through the credentials domain, addressed by the apiKeyEnv
 * reference of the vendor each capability currently selects. Keys are
 * capability-scoped: "Search API key" is always shown; "Fetch API key"
 * appears only when the fetch vendor differs from the search vendor (a
 * shared vendor needs a single key, entered once).
 */
import { useEffect, useRef, useState } from 'react'
import { IconChevronDownOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import css from './settings-card.module.css'

/** Settings namespace the host plugin registers (keep in sync with lib/index.js). */
const NS = 'web-search'
/** Locale dictionary namespace owned by this client bundle. */
const LOCALE_NS = 'dsh-web-search'

/** Required client services (cordis fiber inject on the client side). */
export const inject = ['slots', 'locale', 'remote', 'remote.credentials', 'settingsScope']

/** Registered vendor names — keep in sync with lib/registry.js. */
const VENDORS = ['firecrawl', 'tavily']

/** Per-vendor option descriptors the card renders (nested section paths).
 *  The apiKey/apiKeyEnv controls live at the card top, capability-scoped, so
 *  they are deliberately absent from this list. */
const VENDOR_FIELD_DEFS = {
  tavily: {
    defaults: {
      baseURL: 'https://api.tavily.com',
      apiKeyEnv: 'TAVILY_API_KEY',
      transport: 'auto',
      timeoutSec: 30,
      maxResults: 8,
      searchDepth: 'basic',
      includeAnswer: true,
    },
    fields: [
      { key: 'baseURL', kind: 'text', labelKey: 'baseURL', hintKey: 'baseURLHint' },
      { key: 'maxResults', kind: 'number', labelKey: 'maxResults', hintKey: 'maxResultsHint' },
      {
        key: 'searchDepth',
        kind: 'select',
        labelKey: 'searchDepth',
        hintKey: 'searchDepthHint',
        options: [
          { value: 'basic', labelKey: 'depthBasic' },
          { value: 'advanced', labelKey: 'depthAdvanced' },
        ],
      },
      { key: 'includeAnswer', kind: 'checkbox', labelKey: 'includeAnswer', hintKey: 'includeAnswerHint' },
      {
        key: 'transport',
        kind: 'select',
        labelKey: 'transport',
        hintKey: 'transportHint',
        options: [
          { value: 'auto', labelKey: 'transportAuto' },
          { value: 'curl', labelKey: 'transportCurl' },
          { value: 'fetch', labelKey: 'transportFetch' },
        ],
      },
      { key: 'timeoutSec', kind: 'number', labelKey: 'timeoutSec', hintKey: 'timeoutSecHint' },
    ],
  },
  firecrawl: {
    defaults: {
      baseURL: 'https://api.firecrawl.dev/v2',
      apiKeyEnv: 'FIRECRAWL_API_KEY',
      transport: 'auto',
      timeoutSec: 30,
    },
    fields: [
      { key: 'baseURL', kind: 'text', labelKey: 'baseURL', hintKey: 'baseURLHint' },
      { key: 'limit', kind: 'number', labelKey: 'limit', hintKey: 'limitHint' },
      {
        key: 'transport',
        kind: 'select',
        labelKey: 'transport',
        hintKey: 'transportHint',
        options: [
          { value: 'auto', labelKey: 'transportAuto' },
          { value: 'curl', labelKey: 'transportCurl' },
          { value: 'fetch', labelKey: 'transportFetch' },
        ],
      },
      { key: 'timeoutSec', kind: 'number', labelKey: 'timeoutSec', hintKey: 'timeoutSecHint' },
    ],
  },
}

/** English copy. */
const en = {
  title: 'Web search',
  description: 'Multi-vendor web_search / web_fetch providers (dsh-web-search).',
  expand: 'Show settings',
  collapse: 'Hide settings',
  overridden: 'Overridden',
  reset: 'Reset to default',
  readOnly: 'This deployment stores settings read-only.',
  save: 'Save',
  saving: 'Saving…',
  discard: 'Discard',
  unsaved: 'Unsaved',
  saveFailed: 'The deployment did not accept these values; they were left for you to correct.',
  invalidNumber: 'Enter a number, or leave blank to use the default.',
  searchVendor: 'Search vendor',
  searchVendorHint: 'Provider used for web_search tool calls; applies on save.',
  fetchVendor: 'Fetch vendor',
  fetchVendorHint: 'Provider used for web_fetch; "off" registers no fetch provider.',
  fetchOff: 'off (no fetch provider)',
  searchApiKey: 'Search API key',
  searchApiKeyHint: 'Enter the search vendor key here (stored outside the settings file). Leave blank to keep the current key.',
  fetchApiKey: 'Fetch API key',
  fetchApiKeyHint: 'Enter the fetch vendor key here (stored outside the settings file). Leave blank to keep the current key.',
  apiKeySet: 'A key is configured.',
  apiKeyUnset: 'No key is configured; this vendor is unavailable until one is provided.',
  baseURL: 'Endpoint',
  baseURLHint: 'Leave blank to use the vendor default.',
  maxResults: 'Max results',
  maxResultsHint: 'Results per search (1–20). Blank uses the default (8).',
  searchDepth: 'Search depth',
  searchDepthHint: 'Advanced searches cost more credits per request.',
  depthBasic: 'basic',
  depthAdvanced: 'advanced',
  includeAnswer: 'Include answer',
  includeAnswerHint: 'Ask Tavily to also return a short synthesized answer.',
  limit: 'Result limit',
  limitHint: 'Results per search (1–50). Blank uses the vendor default.',
  transport: 'Transport',
  transportHint: 'auto picks curl when a *_proxy env var is set, otherwise fetch.',
  transportAuto: 'auto',
  transportCurl: 'curl',
  transportFetch: 'fetch',
  timeoutSec: 'Timeout (s)',
  timeoutSecHint: 'Per-request budget in seconds.',
}

/** Simplified Chinese copy. */
const zh = {
  title: '网页搜索',
  description: '多供应商 web_search / web_fetch 后端（dsh-web-search）。',
  expand: '展开设置',
  collapse: '收起设置',
  overridden: '已覆盖',
  reset: '恢复默认',
  readOnly: '本部署的设置为只读。',
  save: '保存',
  saving: '保存中…',
  discard: '放弃修改',
  unsaved: '未保存',
  saveFailed: '本部署没有接受这些值，已保留供你修改。',
  invalidNumber: '请填数字；留空表示使用默认值。',
  searchVendor: '搜索供应商',
  searchVendorHint: 'web_search 工具调用使用的供应商，保存后立即生效。',
  fetchVendor: '抓取供应商',
  fetchVendorHint: 'web_fetch 使用的供应商；off 表示不注册抓取服务。',
  fetchOff: 'off（不注册抓取服务）',
  searchApiKey: '搜索 API Key',
  searchApiKeyHint: '在此填写搜索供应商的密钥（不写入设置文件）。留空表示保持当前密钥。',
  fetchApiKey: '抓取 API Key',
  fetchApiKeyHint: '在此填写抓取供应商的密钥（不写入设置文件）。留空表示保持当前密钥。',
  apiKeySet: '已配置密钥。',
  apiKeyUnset: '未配置密钥；提供之前该供应商不可用。',
  baseURL: '接口地址',
  baseURLHint: '留空则使用供应商默认地址。',
  maxResults: '最大结果数',
  maxResultsHint: '每次搜索返回的结果数（1–20）。留空使用默认值 8。',
  searchDepth: '搜索深度',
  searchDepthHint: 'advanced 每次请求消耗更多额度。',
  depthBasic: 'basic（基本）',
  depthAdvanced: 'advanced（高级）',
  includeAnswer: '附带答案',
  includeAnswerHint: '让 Tavily 同时返回一段简短合成答案。',
  limit: '结果上限',
  limitHint: '每次搜索返回的结果数（1–50）。留空使用供应商默认值。',
  transport: '传输方式',
  transportHint: 'auto 在存在 *_proxy 环境变量时使用 curl，否则使用 fetch。',
  transportAuto: 'auto（自动）',
  transportCurl: 'curl',
  transportFetch: 'fetch',
  timeoutSec: '超时（秒）',
  timeoutSecHint: '单次请求的时间预算（秒）。',
}

/** Read one nested path from a plain object (undefined when absent). */
function pathGet(obj, path) {
  let node = obj
  for (const key of path) {
    if (typeof node !== 'object' || node === null) return undefined
    node = node[key]
  }
  return node
}

/** True when the user layer carries (a prefix or the exact node of) a path. */
function pathPresent(obj, path) {
  let node = obj
  for (const key of path) {
    if (typeof node !== 'object' || node === null || !Object.hasOwn(node, key)) return false
    node = node[key]
  }
  return true
}

/**
 * Staged form over the `web-search` section. Field ids are either bare
 * top-level names ("search", "fetch"), the capability-scoped secret drafts
 * ("searchKey", "fetchKey"), or "<vendor>.<key>" nested option paths. Secrets
 * write outside the section through the credentials domain, addressed by the
 * apiKeyEnv reference of the vendor each capability selects.
 */
class WebSearchForm {
  constructor(scope, ctx) {
    this.scope = scope
    this.ctx = ctx
    this.staged = new Map()
    this.listeners = new Set()
    this.saving = false
    this.failed = false
    // Credential state per capability: { search, fetch } of { ref, configured, writable }.
    this.credentials = {
      search: { ref: '', configured: false, writable: true },
      fetch: { ref: '', configured: false, writable: true },
    }
    scope.subscribe(() => {
      this.readCredentials()
      this.publish()
    })
    this.readCredentials()
  }

  bind() {
    const store = createSnapshotStore(this.projection())
    this.listeners.add(() => store.set(this.projection()))
    return store
  }

  publish() {
    for (const listener of this.listeners) listener()
  }

  snapshotOf() {
    return this.scope.getSnapshot()
  }

  shell() {
    const snapshot = this.snapshotOf()
    const plan = this.plan()
    return {
      available: snapshot.status === 'ready',
      writable: snapshot.writable,
      dirty: plan.length > 0,
      invalid: plan.some((item) => item.run === undefined),
      saving: this.saving,
      failed: this.failed,
    }
  }

  /** Map a form field id to its section path (vendor fields nest under providers). */
  sectionPathOf(field) {
    const parts = field.split('.')
    return parts.length === 1 ? parts : ['providers', ...parts]
  }

  /** The effective value of one field (value layer), formatted for its control. */
  sectionValue(field) {
    return pathGet(this.snapshotOf().value, this.sectionPathOf(field))
  }

  baseValue(field) {
    return pathGet(this.snapshotOf().base, this.sectionPathOf(field))
  }

  stored(field) {
    return pathPresent(this.snapshotOf().user, this.sectionPathOf(field))
  }

  /** The staged-or-effective vendor selection for a capability select. */
  effectiveSelect(name) {
    const staged = this.staged.get(name)
    if (staged !== undefined) return staged.clear ? this.baseValue(name) : staged.text
    return this.sectionValue(name)
  }

  /** The vendor name each capability currently resolves to. */
  searchVendor() {
    return this.effectiveSelect('search')
  }

  fetchVendor() {
    return this.effectiveSelect('fetch')
  }

  defOf(field) {
    if (field === 'searchKey' || field === 'fetchKey') return { kind: 'secret' }
    const [vendor, key] = field.split('.')
    if (key === undefined) {
      return field === 'fetch'
        ? { kind: 'select', options: [{ value: 'off' }, ...VENDORS.map((value) => ({ value }))] }
        : { kind: 'select', options: VENDORS.map((value) => ({ value })) }
    }
    return VENDOR_FIELD_DEFS[vendor]?.fields.find((def) => def.key === key)
  }

  formatValue(def, value) {
    if (value === undefined || value === null) return ''
    if (def?.kind === 'checkbox') return value === true
    return String(value)
  }

  /** One control's state: draft text, override presence, validity. */
  field(field) {
    const def = this.defOf(field)
    const staged = this.staged.get(field)
    if (def?.kind === 'secret') {
      return { text: staged?.text ?? '', overridden: false, invalid: false }
    }
    if (staged === undefined) {
      return { text: this.formatValue(def, this.sectionValue(field)), overridden: this.stored(field), invalid: false }
    }
    const write = this.parseWith(def, staged.text)
    return {
      text: staged.text,
      overridden: write?.kind === 'set',
      invalid: write === undefined,
    }
  }

  parseWith(def, text) {
    if (def === undefined) return undefined
    if (def.kind === 'number') {
      const trimmed = String(text).trim()
      if (trimmed === '') return { kind: 'clear' }
      const parsed = Number(trimmed)
      return Number.isFinite(parsed) ? { kind: 'set', value: parsed } : undefined
    }
    if (def.kind === 'checkbox') return { kind: 'set', value: text === true }
    const trimmed = String(text).trim()
    if (def.kind === 'select') {
      const allowed = def.options.some((option) => option.value === trimmed)
      return allowed ? { kind: 'set', value: trimmed } : undefined
    }
    return trimmed === '' ? { kind: 'clear' } : { kind: 'set', value: trimmed }
  }

  stage(field, edit) {
    this.staged.set(field, edit)
    this.failed = false
    if (field === 'search' || field === 'fetch') this.readCredentials()
    this.publish()
  }

  actions() {
    return {
      edit: (field, text) => this.stage(field, { text }),
      resetField: (field) => {
        const def = this.defOf(field)
        this.stage(field, { text: this.formatValue(def, this.baseValue(field)), clear: true })
      },
      save: () => this.save(),
      discard: () => {
        if (this.staged.size === 0 && !this.failed) return
        this.staged.clear()
        this.failed = false
        this.publish()
      },
    }
  }

  /** Every staged edit a save would write, in staging order. */
  plan() {
    const plan = []
    for (const [field, staged] of this.staged) {
      const def = this.defOf(field)
      if (def?.kind === 'secret') {
        const value = String(staged.text).trim()
        if (value !== '') plan.push({ field, run: () => this.writeKey(field, value) })
        continue
      }
      if (staged.clear) {
        if (this.stored(field)) plan.push({ field, run: () => this.clearField(field) })
        continue
      }
      if (staged.text === this.formatValue(def, this.sectionValue(field))) continue
      const write = this.parseWith(def, staged.text)
      if (write === undefined) plan.push({ field, run: undefined })
      else if (write.kind === 'clear') plan.push({ field, run: () => this.clearField(field) })
      else plan.push({ field, run: () => this.writeValue(field, write.value) })
    }
    return plan
  }

  /**
   * Write every staged edit, then re-seed from what the Host accepted. A save
   * that did not land keeps its drafts for correction.
   */
  async save() {
    const plan = this.plan()
    const writes = plan.flatMap((item) => (item.run === undefined ? [] : [item.run]))
    if (plan.length === 0 || this.saving || writes.length !== plan.length) return
    this.saving = true
    this.failed = false
    this.publish()
    let landed = true
    for (const write of writes) landed = (await write()) && landed
    if (landed) this.staged.clear()
    this.saving = false
    this.failed = !landed
    this.publish()
  }

  async clearField(field) {
    await this.scope.mutate([{ op: 'unset', path: this.sectionPathOf(field) }])
    return !this.stored(field)
  }

  async writeValue(field, value) {
    await this.scope.mutate([{ op: 'set', path: this.sectionPathOf(field), value }])
    return this.stored(field)
  }

  /** The apiKeyEnv reference a vendor section currently names. */
  refOf(vendor) {
    const declared = this.sectionValue(`${vendor}.apiKeyEnv`)
    const fallback = VENDOR_FIELD_DEFS[vendor]?.defaults.apiKeyEnv ?? ''
    return typeof declared === 'string' && declared.length > 0 ? declared : fallback
  }

  /** Ask the credentials domain about the references the two capabilities name. */
  async readCredentials() {
    const caps = []
    const sv = this.searchVendor()
    if (sv !== undefined && sv !== 'off') caps.push({ cap: 'search', ref: this.refOf(sv) })
    const fv = this.fetchVendor()
    if (fv !== undefined && fv !== 'off') caps.push({ cap: 'fetch', ref: this.refOf(fv) })
    for (const { cap, ref } of caps) {
      const held = this.credentials[cap]
      if (held.ref !== ref) {
        this.credentials[cap] = { ref, configured: false, writable: true }
        this.publish()
      }
    }
    if (caps.length === 0) return
    const refs = [...new Set(caps.map((c) => c.ref))]
    let response
    try {
      response = await this.ctx.remote.credentials.describe(refs)
    } catch {
      return // no credentials provider: keep the unset badge, stay env-driven
    }
    if (!response?.ok) return
    for (const { cap, ref } of caps) {
      const vendor = cap === 'search' ? this.searchVendor() : this.fetchVendor()
      if (vendor === undefined || vendor === 'off' || this.refOf(vendor) !== ref) continue
      const view = response.value[ref]
      const next = { ref, configured: view?.configured ?? false, writable: view?.writable ?? true }
      const current = this.credentials[cap]
      if (current.configured === next.configured && current.writable === next.writable) continue
      this.credentials[cap] = next
      this.publish()
    }
  }

  /** Re-read after the Host reports a reference change the card watches. */
  refreshCredential(ref) {
    for (const cap of ['search', 'fetch']) {
      const vendor = cap === 'search' ? this.searchVendor() : this.fetchVendor()
      if (vendor === undefined || vendor === 'off') continue
      if (this.refOf(vendor) === ref && this.credentials[cap].ref === ref) {
        void this.readCredentials()
        return
      }
    }
  }

  /** Write the staged key for one capability, then re-read the configured state. */
  async writeKey(field, value) {
    const cap = field === 'searchKey' ? 'search' : 'fetch'
    const vendor = cap === 'search' ? this.searchVendor() : this.fetchVendor()
    try {
      await this.ctx.remote.credentials.set(this.refOf(vendor), value)
    } catch {
      return false
    }
    await this.readCredentials()
    return this.credentials[cap].configured
  }

  projection() {
    const shell = this.shell()
    const search = this.field('search')
    const fetch = this.field('fetch')
    const searchVendor = this.searchVendor()
    const fetchVendor = this.fetchVendor()
    const fetchKeyVisible = fetchVendor !== undefined && fetchVendor !== 'off' && fetchVendor !== searchVendor
    const activeVendors = [...new Set([searchVendor, fetchVendor].filter((v) => v !== undefined && v !== 'off'))]
    const vendors = {}
    for (const vendor of VENDORS) {
      vendors[vendor] = {
        fields: Object.fromEntries(
          VENDOR_FIELD_DEFS[vendor].fields.map((def) => [def.key, this.field(`${vendor}.${def.key}`)]),
        ),
      }
    }
    const searchCred = this.credentials.search
    const fetchCred = this.credentials.fetch
    return {
      ...shell,
      search,
      fetch,
      searchVendor,
      fetchVendor,
      fetchKeyVisible,
      activeVendors,
      searchKey: { ...this.field('searchKey'), configured: searchCred.configured, writable: searchCred.writable, ref: searchCred.ref },
      fetchKey: { ...this.field('fetchKey'), configured: fetchCred.configured, writable: fetchCred.writable, ref: fetchCred.ref },
      ...vendors,
    }
  }

  inject() {
    return {
      hooks: { webSearchCard: this.store },
      ...this.actions(),
    }
  }
}

/** A staged value control: label, override badge/reset, input, hint. */
function ValueField(props) {
  return (
    <div className={css.field}>
      <div className={css.head}>
        <label className={css.label} htmlFor={props.id}>
          {props.label}
        </label>
        {props.overridden ? (
          <span className={css.badges}>
            <span className={css.badge}>{props.overriddenLabel}</span>
            <button type="button" className={css.reset} disabled={props.disabled} onClick={props.onReset}>
              {props.resetLabel}
            </button>
          </span>
        ) : null}
      </div>
      {props.control === 'select' ? (
        <select
          id={props.id}
          className={`${css.input} ${css.select}`}
          value={String(props.text)}
          disabled={props.disabled}
          onChange={(event) => props.onEdit(event.target.value)}
        >
          {props.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : props.control === 'checkbox' ? (
        <div className={css.checkboxRow}>
          <input
            id={props.id}
            className={css.checkbox}
            type="checkbox"
            checked={props.text === true}
            disabled={props.disabled}
            onChange={(event) => props.onEdit(event.target.checked)}
          />
        </div>
      ) : (
        <input
          id={props.id}
          className={props.invalid ? `${css.input} ${css.inputInvalid}` : css.input}
          type="text"
          {...(props.numeric === true ? { inputMode: 'numeric' } : {})}
          {...(props.invalid ? { 'aria-invalid': true } : {})}
          value={String(props.text)}
          placeholder={props.placeholder ?? ''}
          disabled={props.disabled}
          onChange={(event) => props.onEdit(event.target.value)}
        />
      )}
      <p className={props.invalid ? css.invalid : css.hint}>{props.invalid ? props.invalidLabel : props.hint}</p>
    </div>
  )
}

/** A write-only credential control: blank by design; blank saves nothing. */
function SecretField(props) {
  return (
    <div className={css.field}>
      <div className={css.head}>
        <label className={css.label} htmlFor={props.id}>
          {props.label}
        </label>
        <span className={css.badges}>
          <span className={props.configured ? css.badge : css.badgeMuted}>{props.stateLabel}</span>
        </span>
      </div>
      <input
        id={props.id}
        className={css.input}
        type="password"
        autoComplete="off"
        value={props.text}
        disabled={props.disabled}
        onChange={(event) => props.onEdit(event.target.value)}
      />
      <p className={css.hint}>{props.hint}</p>
    </div>
  )
}

/** One vendor's option block (keys live at the card top, capability-scoped). */
function VendorOptions(props) {
  const { t, vendor, state, disabled, edit, resetField } = props
  const defs = VENDOR_FIELD_DEFS[vendor]
  return (
    <div className={css.vendorBlock}>
      <p className={css.vendorTitle}>{vendor}</p>
      {defs.fields.map((def) => {
        const field = `${vendor}.${def.key}`
        const fieldState = state[vendor].fields[def.key]
        return (
          <ValueField
            key={def.key}
            id={`plugin-config-web-search-${vendor}-${def.key}`}
            label={t(def.labelKey)}
            hint={t(def.hintKey)}
            overriddenLabel={t('overridden')}
            resetLabel={t('reset')}
            invalidLabel={t('invalidNumber')}
            disabled={disabled}
            control={def.kind}
            numeric={def.kind === 'number'}
            {...(def.options !== undefined
              ? { options: def.options.map((option) => ({ value: option.value, label: t(option.labelKey ?? option.value) })) }
              : {})}
            text={fieldState.text}
            overridden={fieldState.overridden}
            invalid={fieldState.invalid}
            onEdit={(text) => edit(field, text)}
            onReset={() => resetField(field)}
          />
        )
      })}
    </div>
  )
}

/** The card component: collapsible shell, capability selects + keys, vendor options. */
function WebSearchCard(props) {
  const { t } = props
  const state = props.useWebSearchCard((snapshot) => snapshot)
  const [open, setOpen] = useState(false)
  const saveStarted = useRef(false)
  useEffect(() => {
    if (state.saving) {
      saveStarted.current = true
      return
    }
    if (!saveStarted.current) return
    saveStarted.current = false
    if (!state.dirty && !state.failed) setOpen(false)
  }, [state.dirty, state.failed, state.saving])
  if (!state.available) return null
  const disabled = !state.writable
  const blocked = !state.dirty || state.invalid || state.saving
  return (
    <li className={css.card}>
      <button
        type="button"
        className={css.header}
        aria-expanded={open}
        aria-label={`${t(open ? 'collapse' : 'expand')}: ${t('title')}`}
        onClick={() => setOpen(!open)}
      >
        <span className={css.headText}>
          <span className={css.name}>{t('title')}</span>
          <span className={css.description}>{t('description')}</span>
        </span>
        {state.dirty ? <span className={css.pending}>{t('unsaved')}</span> : null}
        <IconChevronDownOutline14 className={open ? `${css.chevron} ${css.chevronOpen}` : css.chevron} />
      </button>
      {open ? (
        <div className={css.body}>
          {!state.writable ? (
            <p className={css.readOnly} role="status">
              {t('readOnly')}
            </p>
          ) : null}
          <ValueField
            id="plugin-config-web-search-vendor"
            label={t('searchVendor')}
            hint={t('searchVendorHint')}
            overriddenLabel={t('overridden')}
            resetLabel={t('reset')}
            invalidLabel={t('invalidNumber')}
            disabled={disabled}
            control="select"
            options={VENDORS.map((value) => ({ value, label: value }))}
            text={state.search.text}
            overridden={state.search.overridden}
            invalid={state.search.invalid}
            onEdit={(text) => props.edit('search', text)}
            onReset={() => props.resetField('search')}
          />
          <SecretField
            id="plugin-config-web-search-key"
            label={t('searchApiKey')}
            hint={t('searchApiKeyHint')}
            disabled={!state.searchKey.writable || disabled}
            text={state.searchKey.text}
            configured={state.searchKey.configured}
            stateLabel={state.searchKey.configured ? t('apiKeySet') : t('apiKeyUnset')}
            onEdit={(text) => props.edit('searchKey', text)}
          />
          <ValueField
            id="plugin-config-web-fetch-vendor"
            label={t('fetchVendor')}
            hint={t('fetchVendorHint')}
            overriddenLabel={t('overridden')}
            resetLabel={t('reset')}
            invalidLabel={t('invalidNumber')}
            disabled={disabled}
            control="select"
            options={[{ value: 'off', label: t('fetchOff') }, ...VENDORS.map((value) => ({ value, label: value }))]}
            text={state.fetch.text}
            overridden={state.fetch.overridden}
            invalid={state.fetch.invalid}
            onEdit={(text) => props.edit('fetch', text)}
            onReset={() => props.resetField('fetch')}
          />
          {state.fetchKeyVisible ? (
            <SecretField
              id="plugin-config-web-fetch-key"
              label={t('fetchApiKey')}
              hint={t('fetchApiKeyHint')}
              disabled={!state.fetchKey.writable || disabled}
              text={state.fetchKey.text}
              configured={state.fetchKey.configured}
              stateLabel={state.fetchKey.configured ? t('apiKeySet') : t('apiKeyUnset')}
              onEdit={(text) => props.edit('fetchKey', text)}
            />
          ) : null}
          {state.activeVendors.map((vendor) => (
            <VendorOptions
              key={vendor}
              t={t}
              vendor={vendor}
              state={state}
              disabled={disabled}
              edit={props.edit}
              resetField={props.resetField}
            />
          ))}
          <div className={css.footer}>
            {state.failed ? (
              <p className={css.failed} role="status">
                {t('saveFailed')}
              </p>
            ) : null}
            <button
              type="button"
              className={css.discard}
              disabled={!state.dirty || state.saving}
              onClick={props.discard}
            >
              {t('discard')}
            </button>
            <button type="button" className={css.save} disabled={blocked} onClick={props.save}>
              {t(state.saving ? 'saving' : 'save')}
            </button>
          </div>
        </div>
      ) : null}
    </li>
  )
}

/**
 * Mount the card: bind the namespace scope, stage the form, register the
 * `settings.plugin.item` entry keyed by the namespace the Host serves.
 */
export function apply(ctx) {
  ctx.effect(() => ctx.locale.register(LOCALE_NS, { zh, en }), 'dsh-web-search: dictionaries')

  const form = new WebSearchForm(ctx.settingsScope.bind({ namespace: NS }), ctx)
  form.store = form.bind()

  ctx.effect(
    () =>
      ctx.remote.$on('credentials/reference-updated', (ref) => {
        form.refreshCredential(ref)
      }),
    'dsh-web-search: credential invalidations',
  )

  ctx.slots.inject('settings.plugin.item', function* () {
    yield ctx.slots.register(
      {
        name: 'settings.plugin.item',
        key: NS,
        locale: LOCALE_NS,
        inject: () => form.inject(),
      },
      WebSearchCard,
    )
  })
}

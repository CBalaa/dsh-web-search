window.__ModuleLoader__.load({
	id: "dsh-web-search",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region \0dsh-css:src/client/settings-card.module.css.mjs
		const css = "/* dsh-web-search settings card — mirrors the DSH plugin-configuration card\n   recipe (hairline separators, layer fills, alias tokens). Scoping: the\n   build rewrites every class to ws_<name>. */\n\n.ws_card {\n  list-style: none;\n  border: 0.5px solid var(--dsw-alias-border-l2);\n  border-radius: 16px;\n  background: var(--dsw-alias-bg-layer-3);\n  overflow: hidden;\n}\n\n.ws_header {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  width: 100%;\n  padding: 14px 16px;\n  font: inherit;\n  text-align: left;\n  color: var(--dsw-alias-label-primary);\n  background: none;\n  border: none;\n  cursor: pointer;\n}\n\n.ws_headText {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n  min-width: 0;\n  flex: 1;\n}\n\n.ws_name {\n  font-size: 13px;\n  font-weight: 600;\n  line-height: 1.5;\n}\n\n.ws_description {\n  font-size: 12px;\n  line-height: 1.5;\n  color: var(--dsw-alias-label-tertiary);\n}\n\n.ws_pending {\n  white-space: nowrap;\n  background: var(--dsw-alias-bg-module-platform);\n  color: var(--dsw-alias-brand-primary);\n  border-radius: 999px;\n  padding: 1px 8px;\n  font-size: 11px;\n  font-weight: 500;\n  line-height: 17px;\n}\n\n.ws_chevron {\n  flex: none;\n  color: var(--dsw-alias-label-tertiary);\n  transition: transform 0.15s ease;\n}\n\n.ws_chevronOpen {\n  transform: rotate(180deg);\n}\n\n.ws_body {\n  display: flex;\n  flex-direction: column;\n  padding: 0 16px 16px;\n}\n\n.ws_readOnly {\n  margin: 0 0 4px;\n  font-size: 12px;\n  line-height: 1.5;\n  color: var(--dsw-alias-label-tertiary);\n}\n\n.ws_vendorBlock {\n  border-top: 0.5px solid var(--dsw-alias-border-l2);\n  margin-top: 4px;\n  padding-top: 2px;\n}\n\n.ws_vendorTitle {\n  margin: 10px 0 2px;\n  font-size: 12px;\n  font-weight: 600;\n  line-height: 1.5;\n  color: var(--dsw-alias-label-secondary);\n  text-transform: uppercase;\n  letter-spacing: 0.04em;\n}\n\n/* --- field recipe (label + badges left, control below) --- */\n\n.ws_field {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  padding: 12px 0;\n}\n\n.ws_field + .ws_field {\n  border-top: 0.5px solid var(--dsw-alias-border-l2);\n}\n\n.ws_head {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n\n.ws_label {\n  flex: 1;\n  min-width: 0;\n  font-size: 13px;\n  font-weight: 500;\n  line-height: 1.5;\n  color: var(--dsw-alias-label-primary);\n}\n\n.ws_badges {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n}\n\n.ws_badge {\n  white-space: nowrap;\n  background: var(--dsw-alias-bg-module-platform);\n  color: var(--dsw-alias-label-secondary);\n  border-radius: 999px;\n  padding: 1px 8px;\n  font-size: 11px;\n  font-weight: 500;\n  line-height: 17px;\n}\n\n.ws_badgeMuted {\n  white-space: nowrap;\n  color: var(--dsw-alias-label-tertiary);\n  border-radius: 999px;\n  padding: 1px 8px;\n  font-size: 11px;\n  line-height: 17px;\n}\n\n.ws_reset {\n  font: inherit;\n  font-size: 12px;\n  line-height: 1.5;\n  color: var(--dsw-alias-label-secondary);\n  background: none;\n  border: none;\n  padding: 0;\n  cursor: pointer;\n}\n\n.ws_reset:hover:not(:disabled) {\n  color: var(--dsw-alias-label-primary);\n}\n\n.ws_reset:disabled {\n  cursor: default;\n}\n\n.ws_input {\n  height: 34px;\n  padding: 0 12px;\n  font: inherit;\n  font-size: 13px;\n  line-height: 1.5;\n  color: var(--dsw-alias-label-primary);\n  background: var(--dsw-alias-bg-layer-3);\n  border: 0.5px solid var(--dsw-alias-border-l4);\n  border-radius: 8px;\n}\n\n.ws_input:focus-visible {\n  border-color: var(--dsw-alias-brand-primary);\n  outline: none;\n}\n\n.ws_input:disabled {\n  color: var(--dsw-alias-label-tertiary);\n  cursor: default;\n}\n\n.ws_inputInvalid {\n  border-color: var(--dsw-alias-label-error);\n}\n\n.ws_select {\n  appearance: none;\n  padding-right: 28px;\n}\n\n.ws_checkbox {\n  width: 16px;\n  height: 16px;\n  accent-color: var(--dsw-alias-brand-primary);\n  cursor: pointer;\n}\n\n.ws_checkboxRow {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  min-height: 34px;\n}\n\n.ws_hint {\n  margin: 0;\n  font-size: 12px;\n  line-height: 1.5;\n  color: var(--dsw-alias-label-tertiary);\n}\n\n.ws_invalid {\n  margin: 0;\n  font-size: 12px;\n  line-height: 1.5;\n  color: var(--dsw-alias-label-error);\n}\n\n.ws_footer {\n  display: flex;\n  align-items: center;\n  justify-content: flex-end;\n  gap: 12px;\n  border-top: 0.5px solid var(--dsw-alias-border-l2);\n  padding-top: 12px;\n}\n\n.ws_failed {\n  flex: 1;\n  margin: 0;\n  font-size: 12px;\n  line-height: 1.5;\n  color: var(--dsw-alias-label-error);\n}\n\n.ws_save {\n  height: 30px;\n  padding: 0 14px;\n  font: inherit;\n  font-size: 13px;\n  font-weight: 500;\n  appearance: none;\n  cursor: pointer;\n  border: none;\n  border-radius: 8px;\n  background: var(--dsw-alias-label-primary);\n  color: var(--dsw-alias-bg-layer-3);\n}\n\n.ws_save:disabled {\n  opacity: 0.4;\n  cursor: default;\n}\n\n.ws_save:focus-visible {\n  outline: 2px solid var(--dsw-alias-brand-primary);\n  outline-offset: 1px;\n}\n\n.ws_discard {\n  height: 30px;\n  padding: 0 14px;\n  font: inherit;\n  font-size: 13px;\n  appearance: none;\n  color: var(--dsw-alias-label-secondary);\n  background: transparent;\n  border: 0.5px solid var(--dsw-alias-border-l2);\n  border-radius: 8px;\n  cursor: pointer;\n}\n\n.ws_discard:hover:not(:disabled) {\n  color: var(--dsw-alias-label-primary);\n  border-color: var(--dsw-alias-label-dimmed);\n}\n\n.ws_discard:disabled {\n  opacity: 0.4;\n  cursor: default;\n}\n";
		const tagId = "dsh-web-search/settings-card.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-web-search";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var settings_card_module_css_default = {
			"card": "ws_card",
			"header": "ws_header",
			"headText": "ws_headText",
			"name": "ws_name",
			"description": "ws_description",
			"pending": "ws_pending",
			"chevron": "ws_chevron",
			"chevronOpen": "ws_chevronOpen",
			"body": "ws_body",
			"readOnly": "ws_readOnly",
			"vendorBlock": "ws_vendorBlock",
			"vendorTitle": "ws_vendorTitle",
			"field": "ws_field",
			"head": "ws_head",
			"label": "ws_label",
			"badges": "ws_badges",
			"badge": "ws_badge",
			"badgeMuted": "ws_badgeMuted",
			"reset": "ws_reset",
			"input": "ws_input",
			"inputInvalid": "ws_inputInvalid",
			"select": "ws_select",
			"checkbox": "ws_checkbox",
			"checkboxRow": "ws_checkboxRow",
			"hint": "ws_hint",
			"invalid": "ws_invalid",
			"footer": "ws_footer",
			"failed": "ws_failed",
			"save": "ws_save",
			"discard": "ws_discard"
		};
		//#endregion
		//#region src/client/settings-card.tsx
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
		/** Settings namespace the host plugin registers (keep in sync with lib/index.js). */
		const NS = "web-search";
		/** Locale dictionary namespace owned by this client bundle. */
		const LOCALE_NS = "dsh-web-search";
		/** Required client services (cordis fiber inject on the client side). */
		const inject = [
			"slots",
			"locale",
			"remote",
			"remote.credentials",
			"settingsScope"
		];
		/** Registered vendor names — keep in sync with lib/registry.js. */
		const VENDORS = ["firecrawl", "tavily"];
		/** Per-vendor option descriptors the card renders (nested section paths).
		*  The apiKey/apiKeyEnv controls live at the card top, capability-scoped, so
		*  they are deliberately absent from this list. */
		const VENDOR_FIELD_DEFS = {
			tavily: {
				defaults: {
					baseURL: "https://api.tavily.com",
					apiKeyEnv: "TAVILY_API_KEY",
					transport: "auto",
					timeoutSec: 30,
					maxResults: 8,
					searchDepth: "basic",
					includeAnswer: true
				},
				fields: [
					{
						key: "baseURL",
						kind: "text",
						labelKey: "baseURL",
						hintKey: "baseURLHint"
					},
					{
						key: "maxResults",
						kind: "number",
						labelKey: "maxResults",
						hintKey: "maxResultsHint"
					},
					{
						key: "searchDepth",
						kind: "select",
						labelKey: "searchDepth",
						hintKey: "searchDepthHint",
						options: [{
							value: "basic",
							labelKey: "depthBasic"
						}, {
							value: "advanced",
							labelKey: "depthAdvanced"
						}]
					},
					{
						key: "includeAnswer",
						kind: "checkbox",
						labelKey: "includeAnswer",
						hintKey: "includeAnswerHint"
					},
					{
						key: "transport",
						kind: "select",
						labelKey: "transport",
						hintKey: "transportHint",
						options: [
							{
								value: "auto",
								labelKey: "transportAuto"
							},
							{
								value: "curl",
								labelKey: "transportCurl"
							},
							{
								value: "fetch",
								labelKey: "transportFetch"
							}
						]
					},
					{
						key: "timeoutSec",
						kind: "number",
						labelKey: "timeoutSec",
						hintKey: "timeoutSecHint"
					}
				]
			},
			firecrawl: {
				defaults: {
					baseURL: "https://api.firecrawl.dev/v2",
					apiKeyEnv: "FIRECRAWL_API_KEY",
					transport: "auto",
					timeoutSec: 30
				},
				fields: [
					{
						key: "baseURL",
						kind: "text",
						labelKey: "baseURL",
						hintKey: "baseURLHint"
					},
					{
						key: "limit",
						kind: "number",
						labelKey: "limit",
						hintKey: "limitHint"
					},
					{
						key: "transport",
						kind: "select",
						labelKey: "transport",
						hintKey: "transportHint",
						options: [
							{
								value: "auto",
								labelKey: "transportAuto"
							},
							{
								value: "curl",
								labelKey: "transportCurl"
							},
							{
								value: "fetch",
								labelKey: "transportFetch"
							}
						]
					},
					{
						key: "timeoutSec",
						kind: "number",
						labelKey: "timeoutSec",
						hintKey: "timeoutSecHint"
					}
				]
			}
		};
		/** English copy. */
		const en = {
			title: "Web search",
			description: "Multi-vendor web_search / web_fetch providers (dsh-web-search).",
			expand: "Show settings",
			collapse: "Hide settings",
			overridden: "Overridden",
			reset: "Reset to default",
			readOnly: "This deployment stores settings read-only.",
			save: "Save",
			saving: "Saving…",
			discard: "Discard",
			unsaved: "Unsaved",
			saveFailed: "The deployment did not accept these values; they were left for you to correct.",
			invalidNumber: "Enter a number, or leave blank to use the default.",
			searchVendor: "Search vendor",
			searchVendorHint: "Provider used for web_search tool calls; applies on save.",
			fetchVendor: "Fetch vendor",
			fetchVendorHint: "Provider used for web_fetch; \"off\" registers no fetch provider.",
			fetchOff: "off (no fetch provider)",
			searchApiKey: "Search API key",
			searchApiKeyHint: "Enter the search vendor key here (stored outside the settings file). Leave blank to keep the current key.",
			fetchApiKey: "Fetch API key",
			fetchApiKeyHint: "Enter the fetch vendor key here (stored outside the settings file). Leave blank to keep the current key.",
			apiKeySet: "A key is configured.",
			apiKeyUnset: "No key is configured; this vendor is unavailable until one is provided.",
			baseURL: "Endpoint",
			baseURLHint: "Leave blank to use the vendor default.",
			maxResults: "Max results",
			maxResultsHint: "Results per search (1–20). Blank uses the default (8).",
			searchDepth: "Search depth",
			searchDepthHint: "Advanced searches cost more credits per request.",
			depthBasic: "basic",
			depthAdvanced: "advanced",
			includeAnswer: "Include answer",
			includeAnswerHint: "Ask Tavily to also return a short synthesized answer.",
			limit: "Result limit",
			limitHint: "Results per search (1–50). Blank uses the vendor default.",
			transport: "Transport",
			transportHint: "auto picks curl when a *_proxy env var is set, otherwise fetch.",
			transportAuto: "auto",
			transportCurl: "curl",
			transportFetch: "fetch",
			timeoutSec: "Timeout (s)",
			timeoutSecHint: "Per-request budget in seconds."
		};
		/** Simplified Chinese copy. */
		const zh = {
			title: "网页搜索",
			description: "多供应商 web_search / web_fetch 后端（dsh-web-search）。",
			expand: "展开设置",
			collapse: "收起设置",
			overridden: "已覆盖",
			reset: "恢复默认",
			readOnly: "本部署的设置为只读。",
			save: "保存",
			saving: "保存中…",
			discard: "放弃修改",
			unsaved: "未保存",
			saveFailed: "本部署没有接受这些值，已保留供你修改。",
			invalidNumber: "请填数字；留空表示使用默认值。",
			searchVendor: "搜索供应商",
			searchVendorHint: "web_search 工具调用使用的供应商，保存后立即生效。",
			fetchVendor: "抓取供应商",
			fetchVendorHint: "web_fetch 使用的供应商；off 表示不注册抓取服务。",
			fetchOff: "off（不注册抓取服务）",
			searchApiKey: "搜索 API Key",
			searchApiKeyHint: "在此填写搜索供应商的密钥（不写入设置文件）。留空表示保持当前密钥。",
			fetchApiKey: "抓取 API Key",
			fetchApiKeyHint: "在此填写抓取供应商的密钥（不写入设置文件）。留空表示保持当前密钥。",
			apiKeySet: "已配置密钥。",
			apiKeyUnset: "未配置密钥；提供之前该供应商不可用。",
			baseURL: "接口地址",
			baseURLHint: "留空则使用供应商默认地址。",
			maxResults: "最大结果数",
			maxResultsHint: "每次搜索返回的结果数（1–20）。留空使用默认值 8。",
			searchDepth: "搜索深度",
			searchDepthHint: "advanced 每次请求消耗更多额度。",
			depthBasic: "basic（基本）",
			depthAdvanced: "advanced（高级）",
			includeAnswer: "附带答案",
			includeAnswerHint: "让 Tavily 同时返回一段简短合成答案。",
			limit: "结果上限",
			limitHint: "每次搜索返回的结果数（1–50）。留空使用供应商默认值。",
			transport: "传输方式",
			transportHint: "auto 在存在 *_proxy 环境变量时使用 curl，否则使用 fetch。",
			transportAuto: "auto（自动）",
			transportCurl: "curl",
			transportFetch: "fetch",
			timeoutSec: "超时（秒）",
			timeoutSecHint: "单次请求的时间预算（秒）。"
		};
		/** Read one nested path from a plain object (undefined when absent). */
		function pathGet(obj, path) {
			let node = obj;
			for (const key of path) {
				if (typeof node !== "object" || node === null) return void 0;
				node = node[key];
			}
			return node;
		}
		/** True when the user layer carries (a prefix or the exact node of) a path. */
		function pathPresent(obj, path) {
			let node = obj;
			for (const key of path) {
				if (typeof node !== "object" || node === null || !Object.hasOwn(node, key)) return false;
				node = node[key];
			}
			return true;
		}
		/**
		* Staged form over the `web-search` section. Field ids are either bare
		* top-level names ("search", "fetch"), the capability-scoped secret drafts
		* ("searchKey", "fetchKey"), or "<vendor>.<key>" nested option paths. Secrets
		* write outside the section through the credentials domain, addressed by the
		* apiKeyEnv reference of the vendor each capability selects.
		*/
		var WebSearchForm = class {
			constructor(scope, ctx) {
				this.scope = scope;
				this.ctx = ctx;
				this.staged = /* @__PURE__ */ new Map();
				this.listeners = /* @__PURE__ */ new Set();
				this.saving = false;
				this.failed = false;
				this.credentials = {
					search: {
						ref: "",
						configured: false,
						writable: true
					},
					fetch: {
						ref: "",
						configured: false,
						writable: true
					}
				};
				scope.subscribe(() => {
					this.readCredentials();
					this.publish();
				});
				this.readCredentials();
			}
			bind() {
				const store = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(this.projection());
				this.listeners.add(() => store.set(this.projection()));
				return store;
			}
			publish() {
				for (const listener of this.listeners) listener();
			}
			snapshotOf() {
				return this.scope.getSnapshot();
			}
			shell() {
				const snapshot = this.snapshotOf();
				const plan = this.plan();
				return {
					available: snapshot.status === "ready",
					writable: snapshot.writable,
					dirty: plan.length > 0,
					invalid: plan.some((item) => item.run === void 0),
					saving: this.saving,
					failed: this.failed
				};
			}
			/** Map a form field id to its section path (vendor fields nest under providers). */
			sectionPathOf(field) {
				const parts = field.split(".");
				return parts.length === 1 ? parts : ["providers", ...parts];
			}
			/** The effective value of one field (value layer), formatted for its control. */
			sectionValue(field) {
				return pathGet(this.snapshotOf().value, this.sectionPathOf(field));
			}
			baseValue(field) {
				return pathGet(this.snapshotOf().base, this.sectionPathOf(field));
			}
			stored(field) {
				return pathPresent(this.snapshotOf().user, this.sectionPathOf(field));
			}
			/** The staged-or-effective vendor selection for a capability select. */
			effectiveSelect(name) {
				const staged = this.staged.get(name);
				if (staged !== void 0) return staged.clear ? this.baseValue(name) : staged.text;
				return this.sectionValue(name);
			}
			/** The vendor name each capability currently resolves to. */
			searchVendor() {
				return this.effectiveSelect("search");
			}
			fetchVendor() {
				return this.effectiveSelect("fetch");
			}
			defOf(field) {
				if (field === "searchKey" || field === "fetchKey") return { kind: "secret" };
				const [vendor, key] = field.split(".");
				if (key === void 0) return field === "fetch" ? {
					kind: "select",
					options: [{ value: "off" }, ...VENDORS.map((value) => ({ value }))]
				} : {
					kind: "select",
					options: VENDORS.map((value) => ({ value }))
				};
				return VENDOR_FIELD_DEFS[vendor]?.fields.find((def) => def.key === key);
			}
			formatValue(def, value) {
				if (value === void 0 || value === null) return "";
				if (def?.kind === "checkbox") return value === true;
				return String(value);
			}
			/** One control's state: draft text, override presence, validity. */
			field(field) {
				const def = this.defOf(field);
				const staged = this.staged.get(field);
				if (def?.kind === "secret") return {
					text: staged?.text ?? "",
					overridden: false,
					invalid: false
				};
				if (staged === void 0) return {
					text: this.formatValue(def, this.sectionValue(field)),
					overridden: this.stored(field),
					invalid: false
				};
				const write = this.parseWith(def, staged.text);
				return {
					text: staged.text,
					overridden: write?.kind === "set",
					invalid: write === void 0
				};
			}
			parseWith(def, text) {
				if (def === void 0) return void 0;
				if (def.kind === "number") {
					const trimmed = String(text).trim();
					if (trimmed === "") return { kind: "clear" };
					const parsed = Number(trimmed);
					return Number.isFinite(parsed) ? {
						kind: "set",
						value: parsed
					} : void 0;
				}
				if (def.kind === "checkbox") return {
					kind: "set",
					value: text === true
				};
				const trimmed = String(text).trim();
				if (def.kind === "select") return def.options.some((option) => option.value === trimmed) ? {
					kind: "set",
					value: trimmed
				} : void 0;
				return trimmed === "" ? { kind: "clear" } : {
					kind: "set",
					value: trimmed
				};
			}
			stage(field, edit) {
				this.staged.set(field, edit);
				this.failed = false;
				if (field === "search" || field === "fetch") this.readCredentials();
				this.publish();
			}
			actions() {
				return {
					edit: (field, text) => this.stage(field, { text }),
					resetField: (field) => {
						const def = this.defOf(field);
						this.stage(field, {
							text: this.formatValue(def, this.baseValue(field)),
							clear: true
						});
					},
					save: () => this.save(),
					discard: () => {
						if (this.staged.size === 0 && !this.failed) return;
						this.staged.clear();
						this.failed = false;
						this.publish();
					}
				};
			}
			/** Every staged edit a save would write, in staging order. */
			plan() {
				const plan = [];
				for (const [field, staged] of this.staged) {
					const def = this.defOf(field);
					if (def?.kind === "secret") {
						const value = String(staged.text).trim();
						if (value !== "") plan.push({
							field,
							run: () => this.writeKey(field, value)
						});
						continue;
					}
					if (staged.clear) {
						if (this.stored(field)) plan.push({
							field,
							run: () => this.clearField(field)
						});
						continue;
					}
					if (staged.text === this.formatValue(def, this.sectionValue(field))) continue;
					const write = this.parseWith(def, staged.text);
					if (write === void 0) plan.push({
						field,
						run: void 0
					});
					else if (write.kind === "clear") plan.push({
						field,
						run: () => this.clearField(field)
					});
					else plan.push({
						field,
						run: () => this.writeValue(field, write.value)
					});
				}
				return plan;
			}
			/**
			* Write every staged edit, then re-seed from what the Host accepted. A save
			* that did not land keeps its drafts for correction.
			*/
			async save() {
				const plan = this.plan();
				const writes = plan.flatMap((item) => item.run === void 0 ? [] : [item.run]);
				if (plan.length === 0 || this.saving || writes.length !== plan.length) return;
				this.saving = true;
				this.failed = false;
				this.publish();
				let landed = true;
				for (const write of writes) landed = await write() && landed;
				if (landed) this.staged.clear();
				this.saving = false;
				this.failed = !landed;
				this.publish();
			}
			async clearField(field) {
				await this.scope.mutate([{
					op: "unset",
					path: this.sectionPathOf(field)
				}]);
				return !this.stored(field);
			}
			async writeValue(field, value) {
				await this.scope.mutate([{
					op: "set",
					path: this.sectionPathOf(field),
					value
				}]);
				return this.stored(field);
			}
			/** The apiKeyEnv reference a vendor section currently names. */
			refOf(vendor) {
				const declared = this.sectionValue(`${vendor}.apiKeyEnv`);
				const fallback = VENDOR_FIELD_DEFS[vendor]?.defaults.apiKeyEnv ?? "";
				return typeof declared === "string" && declared.length > 0 ? declared : fallback;
			}
			/** Ask the credentials domain about the references the two capabilities name. */
			async readCredentials() {
				const caps = [];
				const sv = this.searchVendor();
				if (sv !== void 0 && sv !== "off") caps.push({
					cap: "search",
					ref: this.refOf(sv)
				});
				const fv = this.fetchVendor();
				if (fv !== void 0 && fv !== "off") caps.push({
					cap: "fetch",
					ref: this.refOf(fv)
				});
				for (const { cap, ref } of caps) if (this.credentials[cap].ref !== ref) {
					this.credentials[cap] = {
						ref,
						configured: false,
						writable: true
					};
					this.publish();
				}
				if (caps.length === 0) return;
				const refs = [...new Set(caps.map((c) => c.ref))];
				let response;
				try {
					response = await this.ctx.remote.credentials.describe(refs);
				} catch {
					return;
				}
				if (!response?.ok) return;
				for (const { cap, ref } of caps) {
					const vendor = cap === "search" ? this.searchVendor() : this.fetchVendor();
					if (vendor === void 0 || vendor === "off" || this.refOf(vendor) !== ref) continue;
					const view = response.value[ref];
					const next = {
						ref,
						configured: view?.configured ?? false,
						writable: view?.writable ?? true
					};
					const current = this.credentials[cap];
					if (current.configured === next.configured && current.writable === next.writable) continue;
					this.credentials[cap] = next;
					this.publish();
				}
			}
			/** Re-read after the Host reports a reference change the card watches. */
			refreshCredential(ref) {
				for (const cap of ["search", "fetch"]) {
					const vendor = cap === "search" ? this.searchVendor() : this.fetchVendor();
					if (vendor === void 0 || vendor === "off") continue;
					if (this.refOf(vendor) === ref && this.credentials[cap].ref === ref) {
						this.readCredentials();
						return;
					}
				}
			}
			/** Write the staged key for one capability, then re-read the configured state. */
			async writeKey(field, value) {
				const cap = field === "searchKey" ? "search" : "fetch";
				const vendor = cap === "search" ? this.searchVendor() : this.fetchVendor();
				try {
					await this.ctx.remote.credentials.set(this.refOf(vendor), value);
				} catch {
					return false;
				}
				await this.readCredentials();
				return this.credentials[cap].configured;
			}
			projection() {
				const shell = this.shell();
				const search = this.field("search");
				const fetch = this.field("fetch");
				const searchVendor = this.searchVendor();
				const fetchVendor = this.fetchVendor();
				const fetchKeyVisible = fetchVendor !== void 0 && fetchVendor !== "off" && fetchVendor !== searchVendor;
				const activeVendors = [...new Set([searchVendor, fetchVendor].filter((v) => v !== void 0 && v !== "off"))];
				const vendors = {};
				for (const vendor of VENDORS) vendors[vendor] = { fields: Object.fromEntries(VENDOR_FIELD_DEFS[vendor].fields.map((def) => [def.key, this.field(`${vendor}.${def.key}`)])) };
				const searchCred = this.credentials.search;
				const fetchCred = this.credentials.fetch;
				return {
					...shell,
					search,
					fetch,
					searchVendor,
					fetchVendor,
					fetchKeyVisible,
					activeVendors,
					searchKey: {
						...this.field("searchKey"),
						configured: searchCred.configured,
						writable: searchCred.writable,
						ref: searchCred.ref
					},
					fetchKey: {
						...this.field("fetchKey"),
						configured: fetchCred.configured,
						writable: fetchCred.writable,
						ref: fetchCred.ref
					},
					...vendors
				};
			}
			inject() {
				return {
					hooks: { webSearchCard: this.store },
					...this.actions()
				};
			}
		};
		/** A staged value control: label, override badge/reset, input, hint. */
		function ValueField(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: settings_card_module_css_default.field,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: settings_card_module_css_default.head,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							className: settings_card_module_css_default.label,
							htmlFor: props.id,
							children: props.label
						}), props.overridden ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: settings_card_module_css_default.badges,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: settings_card_module_css_default.badge,
								children: props.overriddenLabel
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: settings_card_module_css_default.reset,
								disabled: props.disabled,
								onClick: props.onReset,
								children: props.resetLabel
							})]
						}) : null]
					}),
					props.control === "select" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
						id: props.id,
						className: `${settings_card_module_css_default.input} ${settings_card_module_css_default.select}`,
						value: String(props.text),
						disabled: props.disabled,
						onChange: (event) => props.onEdit(event.target.value),
						children: props.options.map((option) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: option.value,
							children: option.label
						}, option.value))
					}) : props.control === "checkbox" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: settings_card_module_css_default.checkboxRow,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							id: props.id,
							className: settings_card_module_css_default.checkbox,
							type: "checkbox",
							checked: props.text === true,
							disabled: props.disabled,
							onChange: (event) => props.onEdit(event.target.checked)
						})
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						id: props.id,
						className: props.invalid ? `${settings_card_module_css_default.input} ${settings_card_module_css_default.inputInvalid}` : settings_card_module_css_default.input,
						type: "text",
						...props.numeric === true ? { inputMode: "numeric" } : {},
						...props.invalid ? { "aria-invalid": true } : {},
						value: String(props.text),
						placeholder: props.placeholder ?? "",
						disabled: props.disabled,
						onChange: (event) => props.onEdit(event.target.value)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: props.invalid ? settings_card_module_css_default.invalid : settings_card_module_css_default.hint,
						children: props.invalid ? props.invalidLabel : props.hint
					})
				]
			});
		}
		/** A write-only credential control: blank by design; blank saves nothing. */
		function SecretField(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: settings_card_module_css_default.field,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: settings_card_module_css_default.head,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							className: settings_card_module_css_default.label,
							htmlFor: props.id,
							children: props.label
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: settings_card_module_css_default.badges,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: props.configured ? settings_card_module_css_default.badge : settings_card_module_css_default.badgeMuted,
								children: props.stateLabel
							})
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						id: props.id,
						className: settings_card_module_css_default.input,
						type: "password",
						autoComplete: "off",
						value: props.text,
						disabled: props.disabled,
						onChange: (event) => props.onEdit(event.target.value)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: settings_card_module_css_default.hint,
						children: props.hint
					})
				]
			});
		}
		/** One vendor's option block (keys live at the card top, capability-scoped). */
		function VendorOptions(props) {
			const { t, vendor, state, disabled, edit, resetField } = props;
			const defs = VENDOR_FIELD_DEFS[vendor];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: settings_card_module_css_default.vendorBlock,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: settings_card_module_css_default.vendorTitle,
					children: vendor
				}), defs.fields.map((def) => {
					const field = `${vendor}.${def.key}`;
					const fieldState = state[vendor].fields[def.key];
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
						id: `plugin-config-web-search-${vendor}-${def.key}`,
						label: t(def.labelKey),
						hint: t(def.hintKey),
						overriddenLabel: t("overridden"),
						resetLabel: t("reset"),
						invalidLabel: t("invalidNumber"),
						disabled,
						control: def.kind,
						numeric: def.kind === "number",
						...def.options !== void 0 ? { options: def.options.map((option) => ({
							value: option.value,
							label: t(option.labelKey ?? option.value)
						})) } : {},
						text: fieldState.text,
						overridden: fieldState.overridden,
						invalid: fieldState.invalid,
						onEdit: (text) => edit(field, text),
						onReset: () => resetField(field)
					}, def.key);
				})]
			});
		}
		/** The card component: collapsible shell, capability selects + keys, vendor options. */
		function WebSearchCard(props) {
			const { t } = props;
			const state = props.useWebSearchCard((snapshot) => snapshot);
			const [open, setOpen] = (0, react.useState)(false);
			const saveStarted = (0, react.useRef)(false);
			(0, react.useEffect)(() => {
				if (state.saving) {
					saveStarted.current = true;
					return;
				}
				if (!saveStarted.current) return;
				saveStarted.current = false;
				if (!state.dirty && !state.failed) setOpen(false);
			}, [
				state.dirty,
				state.failed,
				state.saving
			]);
			if (!state.available) return null;
			const disabled = !state.writable;
			const blocked = !state.dirty || state.invalid || state.saving;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: settings_card_module_css_default.card,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: settings_card_module_css_default.header,
					"aria-expanded": open,
					"aria-label": `${t(open ? "collapse" : "expand")}: ${t("title")}`,
					onClick: () => setOpen(!open),
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: settings_card_module_css_default.headText,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: settings_card_module_css_default.name,
								children: t("title")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: settings_card_module_css_default.description,
								children: t("description")
							})]
						}),
						state.dirty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: settings_card_module_css_default.pending,
							children: t("unsaved")
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: open ? `${settings_card_module_css_default.chevron} ${settings_card_module_css_default.chevronOpen}` : settings_card_module_css_default.chevron })
					]
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: settings_card_module_css_default.body,
					children: [
						!state.writable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: settings_card_module_css_default.readOnly,
							role: "status",
							children: t("readOnly")
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
							id: "plugin-config-web-search-vendor",
							label: t("searchVendor"),
							hint: t("searchVendorHint"),
							overriddenLabel: t("overridden"),
							resetLabel: t("reset"),
							invalidLabel: t("invalidNumber"),
							disabled,
							control: "select",
							options: VENDORS.map((value) => ({
								value,
								label: value
							})),
							text: state.search.text,
							overridden: state.search.overridden,
							invalid: state.search.invalid,
							onEdit: (text) => props.edit("search", text),
							onReset: () => props.resetField("search")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SecretField, {
							id: "plugin-config-web-search-key",
							label: t("searchApiKey"),
							hint: t("searchApiKeyHint"),
							disabled: !state.searchKey.writable || disabled,
							text: state.searchKey.text,
							configured: state.searchKey.configured,
							stateLabel: state.searchKey.configured ? t("apiKeySet") : t("apiKeyUnset"),
							onEdit: (text) => props.edit("searchKey", text)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
							id: "plugin-config-web-fetch-vendor",
							label: t("fetchVendor"),
							hint: t("fetchVendorHint"),
							overriddenLabel: t("overridden"),
							resetLabel: t("reset"),
							invalidLabel: t("invalidNumber"),
							disabled,
							control: "select",
							options: [{
								value: "off",
								label: t("fetchOff")
							}, ...VENDORS.map((value) => ({
								value,
								label: value
							}))],
							text: state.fetch.text,
							overridden: state.fetch.overridden,
							invalid: state.fetch.invalid,
							onEdit: (text) => props.edit("fetch", text),
							onReset: () => props.resetField("fetch")
						}),
						state.fetchKeyVisible ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SecretField, {
							id: "plugin-config-web-fetch-key",
							label: t("fetchApiKey"),
							hint: t("fetchApiKeyHint"),
							disabled: !state.fetchKey.writable || disabled,
							text: state.fetchKey.text,
							configured: state.fetchKey.configured,
							stateLabel: state.fetchKey.configured ? t("apiKeySet") : t("apiKeyUnset"),
							onEdit: (text) => props.edit("fetchKey", text)
						}) : null,
						state.activeVendors.map((vendor) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(VendorOptions, {
							t,
							vendor,
							state,
							disabled,
							edit: props.edit,
							resetField: props.resetField
						}, vendor)),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: settings_card_module_css_default.footer,
							children: [
								state.failed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: settings_card_module_css_default.failed,
									role: "status",
									children: t("saveFailed")
								}) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: settings_card_module_css_default.discard,
									disabled: !state.dirty || state.saving,
									onClick: props.discard,
									children: t("discard")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: settings_card_module_css_default.save,
									disabled: blocked,
									onClick: props.save,
									children: t(state.saving ? "saving" : "save")
								})
							]
						})
					]
				}) : null]
			});
		}
		/**
		* Mount the card: bind the namespace scope, stage the form, register the
		* `settings.plugin.item` entry keyed by the namespace the Host serves.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(LOCALE_NS, {
				zh,
				en
			}), "dsh-web-search: dictionaries");
			const form = new WebSearchForm(ctx.settingsScope.bind({ namespace: NS }), ctx);
			form.store = form.bind();
			ctx.effect(() => ctx.remote.$on("credentials/reference-updated", (ref) => {
				form.refreshCredential(ref);
			}), "dsh-web-search: credential invalidations");
			ctx.slots.inject("settings.plugin.item", function* () {
				yield ctx.slots.register({
					name: "settings.plugin.item",
					key: NS,
					locale: LOCALE_NS,
					inject: () => form.inject()
				}, WebSearchCard);
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
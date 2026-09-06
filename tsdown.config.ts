/**
 * Client bundle build for dsh-web-search, modeled on the official DSH client
 * preset (and DSH-better-sidebar's self-contained tsdown.config.ts):
 *
 * - entry `src/client/settings-card.tsx` → single-file `lib/client.js`, CJS
 *   closure factory registered through `window.__ModuleLoader__.load({id})`
 *   with id = the package name (the client-modules composer keys on it),
 * - externals resolve through the browser module table at runtime: the
 *   PLATFORM_MODULES seed list (react, react-dom, cordis,
 *   dsh-client-store, dsh-client-ui-slots, dsh-client-ui-primitives) —
 *   everything else must not be imported as a value (the purity gate throws),
 * - CSS Modules compile to hashed class maps and inject
 *   <style data-plugin="dsh-web-search"> tags when the factory executes.
 */
import { readFile } from 'node:fs/promises'
import { basename, dirname, relative, resolve as resolvePath, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { builtinModules } from 'node:module'
import type { UserConfig } from 'tsdown'

/** Repo root — CSS virtual ids are made relative to this so the shipped bundle
 *  and sourcemap never carry a machine-specific absolute path. */
const REPOSITORY_ROOT = fileURLToPath(new URL('.', import.meta.url))

/** Node builtins must never survive into the browser module-loader factory. */
const NODE_BUILTINS = new Set([
  ...builtinModules,
  ...builtinModules.map(id => `node:${id}`),
])

/** Specifiers the web shell shares into the frozen module table (PLATFORM_MODULES). */
const CLIENT_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
]

/** Virtual-id wrapper keeping module CSS away from tsdown's own css pipeline. */
const CSS_VIRTUAL_PREFIX = '\0dsh-css:'
const CSS_VIRTUAL_SUFFIX = '.mjs'

/** The style-injection prologue shared by module css loads. */
function injectTag(pluginId: string, fileId: string, cssText: string): string {
  const tagId = `${pluginId}/${basename(fileId)}`
  return [
    `const css = ${JSON.stringify(cssText)};`,
    `const tagId = ${JSON.stringify(tagId)};`,
    `if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css=' + JSON.stringify(tagId) + ']') === null) {`,
    `  const tag = document.createElement('style');`,
    `  tag.dataset.plugin = ${JSON.stringify(pluginId)};`,
    `  tag.dataset.pluginCss = tagId;`,
    `  tag.textContent = css;`,
    `  document.head.appendChild(tag);`,
    `}`,
  ].join('\n')
}

/**
 * The client-bundle purity gate: cross-plugin value imports are forbidden —
 * collaboration goes through cordis services. Type-only imports are erased
 * before this hook sees them.
 */
function purityGatePlugin(): NonNullable<UserConfig['plugins']>[number] {
  return {
    name: 'dsh-client-bundle-purity',
    resolveId(source: string) {
      if (NODE_BUILTINS.has(source)) {
        throw new Error(
          `client bundle purity: Node builtin "${source}" cannot run in the browser module table`,
        )
      }
      if (source.startsWith('@deepseek-ai/') && !CLIENT_EXTERNALS.includes(source)) {
        throw new Error(
          `client bundle purity: "${source}" is not a platform module (CLIENT_EXTERNALS) — collaborate through cordis services`,
        )
      }
      return null
    },
  }
}

/** CSS Modules → hashed class maps + one <style data-plugin> tag per file. */
function makeCssPlugin(pluginId: string): NonNullable<UserConfig['plugins']>[number] {
  return {
    name: 'dsh-css-inline',
    resolveId(source: string, importer: string | undefined) {
      if (!source.endsWith('.css')) return null
      const abs =
        source.startsWith('.') || source.startsWith('/')
          ? importer === undefined
            ? source
            : resolvePath(dirname(importer), source)
          : source
      // Virtual id is repo-relative, so the bundled region comment carries no
      // absolute path; load() resolves it back to read the file.
      const rel = relative(REPOSITORY_ROOT, abs).split(sep).join('/')
      return CSS_VIRTUAL_PREFIX + rel + CSS_VIRTUAL_SUFFIX
    },
    async load(virtualId: string) {
      if (!virtualId.startsWith(CSS_VIRTUAL_PREFIX)) return null
      const relId = virtualId.slice(CSS_VIRTUAL_PREFIX.length, -CSS_VIRTUAL_SUFFIX.length)
      const fileId = resolvePath(REPOSITORY_ROOT, relId)
      this.addWatchFile(fileId)
      const source = await readFile(fileId, 'utf8')
      // Hand-rolled module css scoping (no postcss): prefix every class
      // selector token with ws_. The leading boundary keeps decimals (0.5px)
      // and url() contents untouched.
      const classMap: Record<string, string> = {}
      const scoped = source.replace(
        /(^|[\s,{>+~])\.([a-zA-Z][a-zA-Z0-9_-]*)/gm,
        (match, boundary: string, name: string) => {
          classMap[name] = `ws_${name}`
          return `${boundary}.ws_${name}`
        },
      )
      return [injectTag(pluginId, fileId, scoped), `export default ${JSON.stringify(classMap)};`].join('\n')
    },
  }
}

export default [
  {
    entry: { client: 'src/client/settings-card.tsx' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    dts: false,
    sourcemap: true,
    clean: false,
    external: [...CLIENT_EXTERNALS],
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
      'import.meta.resolve': 'undefined',
    },
    inputOptions: {
      resolve: {
        conditionNames: ['browser', 'import', 'require', 'default'],
      },
    },
    noExternal: (id: string) => (CLIENT_EXTERNALS.includes(id) ? undefined : true),
    plugins: [purityGatePlugin(), makeCssPlugin('dsh-web-search')],
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: "dsh-web-search", factory: (require) => {`,
      footer: `return module.exports; } });`,
      intro: 'var module = { exports: {} }; var exports = module.exports;',
      codeSplitting: false,
    },
  },
] satisfies UserConfig[]

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'

const root = fileURLToPath(new URL('..', import.meta.url))
const require = createRequire(import.meta.url)
const { version: vueVersion } = require('vue/package.json')
const app = await mkdtemp(join(tmpdir(), 'vue-grid-package-'))
const pkg = '@nocopypaste/vue-grid'
const npmCli = process.env.npm_execpath
const runNpm = (args, options) =>
  execFileSync(npmCli ? process.execPath : 'npm', npmCli ? [npmCli, ...args] : args, options)
const styles = {
  'sort-indicator.css': 'vg-sort-indicator-end',
  'scroll-chain.css': 'vg-scroll-chain-y',
  'cell-borders.css': 'vg-restore-cell-borders',
}

try {
  const packResult = JSON.parse(
    runNpm(['pack', '--json', '-w', pkg, '--pack-destination', app], {
      cwd: root,
      encoding: 'utf8',
    }),
  )
  const packed = Array.isArray(packResult) ? packResult[0] : packResult[pkg]
  assert.ok(packed?.filename, 'npm pack did not report the grid tarball')
  await writeFile(join(app, 'package.json'), JSON.stringify({ private: true, type: 'module' }))
  runNpm(
    [
      'install',
      '--prefer-offline',
      '--no-audit',
      '--no-fund',
      '--ignore-scripts',
      join(app, packed.filename),
      `vue@${vueVersion}`,
    ],
    { cwd: app, stdio: 'inherit' },
  )
  await writeFile(
    join(app, 'index.html'),
    '<div id="app"></div><script type="module" src="/main.js"></script>',
  )

  for (const selected of [false, true]) {
    await writeFile(
      join(app, 'main.js'),
      `
      import { createApp, h } from 'vue'
      import { VGrid${selected ? ', sortingFeature, attributesFeature, statusBarFeature, VGridColumnMenu' : ''} } from '${pkg}'
      import '${pkg}/core.css'
      ${
        selected
          ? Object.keys(styles)
              .map((file) => `import '${pkg}/${file}'`)
              .join('\n')
          : ''
      }
      const columns = [{ key: 'name', sortable: ${selected} }]
      createApp({ render: () => h(VGrid, {
        rows: [{ id: 1, name: 'Example' }], columns, rowKey: 'id',
        ${selected ? 'features: [sortingFeature, attributesFeature, statusBarFeature], statusBar: true' : ''}
      }${selected ? ', { toolbar: () => h(VGridColumnMenu, { columns }) }' : ''}) }).mount('#app')
    `,
    )
    const bundles = [
      await build({ root: app, configFile: false, logLevel: 'warn', build: { write: false } }),
    ].flat()
    const output = bundles.flatMap((bundle) => bundle.output)
    const modules = output.flatMap((item) =>
      item.type === 'chunk'
        ? Object.entries(item.modules)
            .filter(([, module]) => module.renderedLength)
            .map(([id]) => id)
        : [],
    )
    for (const name of [
      'VGridColumnMenu',
      'VGridSortIcon',
      'useExtraAttrs',
      'useStatusBar',
      'VGridStatusBar',
      'dataAttrs',
    ]) {
      assert.equal(
        modules.some((id) => id.includes(`/dist/`) && id.includes(`/${name}`)),
        selected,
        `${name} in ${selected ? 'selected' : 'minimal'} bundle`,
      )
    }
    const css = output
      .filter((item) => item.fileName.endsWith('.css'))
      .map((item) => item.source)
      .join('\n')
    assert.ok(css.includes('.vg-root'), 'The app includes the grid layout styles')
    for (const marker of Object.values(styles)) assert.equal(css.includes(marker), selected, marker)
  }
  const fullCss = await readFile(join(app, 'node_modules', pkg, 'dist/vue-grid.css'), 'utf8')
  for (const marker of Object.values(styles)) assert.ok(fullCss.includes(marker), marker)
  console.log(`Verified ${pkg}@${packed.version} in clean minimal and selective builds.`)
} finally {
  await rm(app, { recursive: true, force: true })
}

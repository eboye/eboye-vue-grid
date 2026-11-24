/// <reference types="vite/client" />

/** The `@nocopypaste/vue-grid` version the site was built with. */
declare const __GRID_VERSION__: string

/** A demo file's own text, highlighted at build time (see `vite.config.ts`). */
interface DemoSource {
  /** Token styles: `--shiki-light` / `--shiki-dark` colours (and font style). */
  styles: Record<string, string>[]
  /** Lines of `[text, styleIndex]` tokens. */
  lines: [string, number][][]
}

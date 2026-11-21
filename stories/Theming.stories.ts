import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { computed } from 'vue'
import type { Density } from '@eboye/vue-grid'
import { Grid as VGrid } from './support'
import { betColumns, makeBets } from './data'

interface ThemeArgs {
  density: Density
  accent: string
  headerBg: string
  headerText: string
  rowHover: string
  radius: string
  cellPaddingX: string
  cellPaddingY: string
  fontFamily: string
  headerTransform: 'none' | 'uppercase'
}

const rows = makeBets(8, 21)
const columns = betColumns({ sortable: true })

/**
 * All styles sit in `@layer vue-grid` and read `--vg-*` variables. Change them in Controls — the code
 * panel of the Docs tab shows the matching CSS. Use the **Scheme** toolbar button for dark mode
 * (colours use `light-dark()`).
 */
const meta = {
  title: 'Theming',
  args: {
    density: 'cozy',
    accent: '#2563eb',
    headerBg: '',
    headerText: '',
    rowHover: '',
    radius: '0.5rem',
    cellPaddingX: '0.75rem',
    cellPaddingY: '0.5rem',
    fontFamily: '',
    headerTransform: 'none',
  },
  argTypes: {
    density: { control: 'inline-radio', options: ['compact', 'cozy', 'comfortable'] },
    accent: { control: 'color', description: '--vg-color-accent' },
    headerBg: { control: 'color', description: '--vg-color-header-bg (empty = default)' },
    headerText: { control: 'color', description: '--vg-color-header-text' },
    rowHover: { control: 'color', description: '--vg-color-row-hover' },
    radius: { control: 'text', description: '--vg-radius' },
    cellPaddingX: { control: 'text', description: '--vg-cell-padding-x' },
    cellPaddingY: { control: 'text', description: '--vg-cell-padding-y' },
    fontFamily: { control: 'text', description: '--vg-font-family' },
    headerTransform: {
      control: 'inline-radio',
      options: ['none', 'uppercase'],
      description: '--vg-header-text-transform',
    },
  },
  render: (args) => ({
    components: { VGrid },
    setup() {
      const vars = computed(() => {
        const out: Record<string, string> = {
          '--vg-color-accent': args.accent,
          '--vg-radius': args.radius,
          '--vg-cell-padding-x': args.cellPaddingX,
          '--vg-cell-padding-y': args.cellPaddingY,
          '--vg-header-text-transform': args.headerTransform,
        }
        if (args.headerBg) out['--vg-color-header-bg'] = args.headerBg
        if (args.headerText) out['--vg-color-header-text'] = args.headerText
        if (args.rowHover) out['--vg-color-row-hover'] = args.rowHover
        if (args.fontFamily) out['--vg-font-family'] = args.fontFamily
        return out
      })
      const css = computed(
        () =>
          `.my-grid {\n${Object.entries(vars.value)
            .map(([k, v]) => `  ${k}: ${v};`)
            .join('\n')}\n}`,
      )
      return { args, vars, css, rows, columns }
    },
    template: `
      <div :style="vars">
        <VGrid :rows="rows" :columns="columns" row-key="id" sort-mode="client" selectable :density="args.density" aria-label="Themed grid" />
      </div>
      <pre class="sb-note">{{ css }}</pre>`,
  }),
} satisfies Meta<ThemeArgs>

export default meta
type Story = StoryObj<typeof meta>

/** Edit the tokens in Controls. */
export const Tokens: Story = {}

/** A “brand” theme in a few lines of CSS (see `.sb-brand` in `.storybook/preview.css`). */
export const Brand: Story = {
  render: () => ({
    components: { VGrid },
    setup: () => ({ rows, columns }),
    template: `<div class="sb-brand"><VGrid :rows="rows" :columns="columns" row-key="id" sort-mode="client" aria-label="Brand theme" /></div>`,
  }),
}

/**
 * The `ui` prop adds classes to grid parts (`root`, `header`, `headerCell`, `row`, `cell`, `subgrid`,
 * `detail`, `empty`) — e.g. Tailwind utilities. Unlayered classes win over the grid's layer. Rows are
 * `display: contents`, so put backgrounds and padding on `cell`.
 */
export const UtilityClasses: Story = {
  render: () => ({
    components: { VGrid },
    setup: () => ({ rows, columns }),
    // .u-* stand in for Tailwind utilities (`italic`, `font-mono`, `shadow-lg`); see preview.css.
    template: `
      <VGrid :rows="rows" :columns="columns" row-key="id" aria-label="Utility classes"
        :ui="{ root: 'u-shadow', headerCell: 'u-italic', cell: 'u-mono' }" />`,
  }),
}

/** Forced dark via `color-scheme: dark` on a wrapper — independent of the page. */
export const DarkWrapper: Story = {
  render: () => ({
    components: { VGrid },
    setup: () => ({ rows, columns }),
    template: `
      <div style="color-scheme: dark; background: #0b0f17; padding: 1rem; border-radius: 0.75rem">
        <VGrid :rows="rows" :columns="columns" row-key="id" selectable aria-label="Dark" />
      </div>`,
  }),
}

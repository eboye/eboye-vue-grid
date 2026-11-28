import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { computed } from 'vue'
import type { Density } from '@nocopypaste/vue-grid'
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

const sortIndicatorStory = (customArtwork = false): Story => ({
  render: () => ({
    components: { VGrid },
    setup() {
      const columns = [
        { key: 'name', header: 'Item', width: '13rem', align: 'start', sortable: true },
        { key: 'location', header: 'Location', width: '10rem', align: 'center', sortable: true },
        { key: 'stock', header: 'Stock', width: '9rem', align: 'end', sortable: true },
      ]
      const rows = [
        { id: 1, name: 'Storage bin', location: 'North', stock: 24 },
        { id: 2, name: 'Folding crate', location: 'East', stock: 12 },
        { id: 3, name: 'Label holder', location: 'West', stock: 8 },
      ]
      return { columns, rows, customArtwork }
    },
    template: `
      <VGrid
        class="vg-sort-indicator-end"
        :rows="rows" :columns="columns" row-key="id" sort-mode="client" multi-sort
        aria-label="Stock by location" style="max-inline-size: 38rem"
      >
        <template #header-name>Item<br />description</template>
        <template v-if="customArtwork" #sort-icon="{ column, direction }">
          <svg
            :data-testid="'sort-art-' + column.key"
            :data-direction="direction ?? 'none'"
            viewBox="0 0 16 16"
            width="24"
            height="24"
            role="img"
            aria-label="Sort artwork"
            fill="none"
            stroke="currentColor"
          >
            <path v-if="direction === 'asc'" d="M8 13V3m-4 4 4-4 4 4" />
            <path v-else-if="direction === 'desc'" d="M8 3v10m-4-4 4 4 4-4" />
            <path v-else d="M3 5h10M3 8h7M3 11h4" />
          </svg>
        </template>
      </VGrid>`,
  }),
})

/** Sort indicators at the inline end with start, center, and end aligned labels. */
export const SortIndicatorAtEnd = sortIndicatorStory()

/** Custom decorative artwork for unsorted, ascending, and descending headers. */
export const SortIndicatorArtwork = sortIndicatorStory(true)

/** Independent header and body dividers on a compact grid with pinned columns. */
export const Dividers: Story = {
  render: () => ({
    components: { VGrid },
    setup() {
      const columns = [
        { key: 'id', header: 'ID', width: '5rem', pinned: 'left' },
        { key: 'name', header: 'Item', width: '11rem' },
        { key: 'location', header: 'Location', width: '9rem' },
        { key: 'stock', header: 'Stock', width: '7rem', renderer: 'number' },
        { key: 'status', header: 'Status', width: '6rem', pinned: 'right' },
      ]
      const rows = [
        { id: 1, name: 'Storage bin', location: 'North', stock: 24, status: 'Ready' },
        { id: 2, name: 'Folding crate', location: 'East', stock: 12, status: 'Ready' },
        { id: 3, name: 'Label holder', location: 'West', stock: 8, status: 'Low' },
      ]
      return { columns, rows }
    },
    template: `
      <VGrid
        :rows="rows" :columns="columns" row-key="id" density="compact" aria-label="Inventory"
        style="max-inline-size: 28rem;
               --vg-header-min-height: 3rem;
               --vg-header-border-inline-end: 2px solid var(--vg-color-border-strong);
               --vg-cell-border-inline-end: 1px solid var(--vg-color-border)"
      />`,
  }),
}

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

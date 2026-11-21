import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { defineComponent, h, ref } from 'vue'
import { fn } from 'storybook/test'
import {
  createColumnHelper,
  defineCellRenderer,
  type CellRendererProps,
  type CellRendererEmits,
} from '@eboye/vue-grid'
import { makeBets, type Bet } from '../data'
import { Grid as VGrid, type GridArgs } from '../support'

const bet = createColumnHelper<Bet>()
const sampleRows = makeBets(8)
const onCellAction = fn()

/**
 * Third-party renderers. `rating` comes from `@eboye/vue-grid-renderer-template` (the boilerplate add-on
 * package), registered app-wide in `.storybook/preview.ts` with `createVueGrid({ renderers: [ratingRenderer] })`.
 */
const meta = {
  title: 'Add-ons/Cell renderers',
  component: VGrid,
  args: { rows: sampleRows, rowKey: 'id', ariaLabel: 'Bets', onCellAction },
  argTypes: { rows: { control: false }, columns: { control: false } },
} satisfies Meta<GridArgs>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Click a star: the renderer emits `action('rate', n)` and the grid re-emits it as `cell-action`; the
 * story writes it back into the row. `rendererOptions` is type-checked through module augmentation.
 */
export const RatingAddon: Story = {
  args: {
    columns: [
      bet({ key: 'player', header: 'Player', field: 'player.name', width: '1fr' }),
      bet({
        key: 'rating',
        header: 'Rating',
        renderer: 'rating',
        rendererOptions: { max: 5 },
        sortable: true,
      }),
      bet({
        key: 'rating10',
        header: 'Out of 10 (readonly)',
        field: 'rating',
        renderer: 'rating',
        rendererOptions: { max: 10, readonly: true },
      }),
    ],
  },
  render: (args) => ({
    components: { VGrid },
    setup() {
      const rows = ref(sampleRows)
      const onAction = (e: { name: string; payload: unknown; rowKey: unknown }) => {
        onCellAction(e)
        if (e.name === 'rate')
          rows.value = rows.value.map((r) =>
            r.id === e.rowKey ? { ...r, rating: e.payload as number } : r,
          )
      }
      return { args, rows, onAction }
    },
    template: `<VGrid v-bind="args" :rows="rows" sort-mode="client" @cell-action="onAction" />`,
  }),
}

// A renderer written inline: a progress bar. In a real add-on this is an SFC plus a definition.
type ProgressOptions = { max?: number; color?: string }
const ProgressCell = defineComponent(
  (props: CellRendererProps<Bet, number, ProgressOptions>, { emit }: { emit: CellRendererEmits }) =>
    () => {
      const pct = Math.max(
        0,
        Math.min(100, (Number(props.value) / (props.options.max ?? 100)) * 100),
      )
      return h(
        'button',
        {
          type: 'button',
          title: `${pct.toFixed(0)}%`,
          onClick: () => emit('action', 'inspect', pct),
          style:
            'all: unset; cursor: pointer; display: block; inline-size: 100%; block-size: 0.5rem; border-radius: 999px; background: color-mix(in srgb, currentColor 15%, transparent)',
        },
        [
          h('span', {
            style: `display: block; block-size: 100%; inline-size: ${pct}%; border-radius: inherit; background: ${props.options.color ?? 'var(--vg-color-accent)'}`,
          }),
        ],
      )
    },
  {
    // Typed by the setup function's `CellRendererProps` annotation; runtime names only.
    // eslint-disable-next-line vue/require-prop-types
    props: ['value', 'row', 'rowKey', 'rowIndex', 'depth', 'column', 'options'],
    emits: ['action'],
  },
)

const progressRenderer = defineCellRenderer<ProgressOptions>({
  name: 'progress',
  component: ProgressCell,
  defaults: { max: 500 },
  sortValue: (v) => Number(v),
  format: (v, o) => `${Math.round((Number(v) / (o.max ?? 100)) * 100)}%`,
})

/**
 * Registered for one grid with `:renderers="[progressRenderer]"` (local renderers win over plugin and
 * built-in ones by name). Click a bar to emit `inspect`.
 */
export const LocalRenderer: Story = {
  args: {
    renderers: [progressRenderer],
    columns: [
      bet({ key: 'player', header: 'Player', field: 'player.name', width: '12rem' }),
      bet({ key: 'stake', header: 'Stake', renderer: 'currency' }),
      bet({
        key: 'stakeBar',
        header: 'Stake of €500',
        field: 'stake',
        renderer: 'progress',
        width: '1fr',
        sortable: true,
      }),
    ],
    sortMode: 'client',
  },
}

/** Skip the registry: pass the component itself as `renderer`. */
export const ComponentAsRenderer: Story = {
  args: {
    columns: [
      bet({ key: 'player', header: 'Player', field: 'player.name', width: '12rem' }),
      bet({
        key: 'payout',
        header: 'Payout of €2,000',
        renderer: ProgressCell,
        rendererOptions: { max: 2000, color: 'var(--vg-color-success)' },
        width: '1fr',
      }),
    ],
  },
}

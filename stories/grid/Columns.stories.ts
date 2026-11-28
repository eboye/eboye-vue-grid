import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { fn } from 'storybook/test'
import { createColumnHelper, VGridColumnMenu, type ColumnState } from '@nocopypaste/vue-grid'
import { makeBets, statusTones, type Bet } from '../data'
import { Grid as VGrid, type GridArgs } from '../support'
import InteractiveHeaderFixture from './InteractiveHeaderFixture.vue'

const bet = createColumnHelper<Bet>()
const wideColumns = [
  bet({
    key: 'id',
    header: '#',
    pinned: 'left',
    width: '4rem',
    hideable: false,
    reorderable: false,
  }),
  bet({ key: 'player', header: 'Player', field: 'player.name', pinned: 'left', width: '11rem' }),
  bet({ key: 'city', header: 'City', field: 'player.city', width: '10rem' }),
  bet({
    key: 'status',
    header: 'Status',
    renderer: 'status',
    rendererOptions: { tone: statusTones },
    width: '9rem',
  }),
  bet({ key: 'stake', header: 'Stake', renderer: 'currency', width: '9rem' }),
  bet({ key: 'payout', header: 'Payout', renderer: 'currency', width: '9rem' }),
  bet({ key: 'change', header: 'Δ odds', renderer: 'change', width: '8rem' }),
  bet({ key: 'placedAt', header: 'Placed', renderer: 'date', width: '9rem' }),
  bet({ key: 'verified', header: 'KYC', renderer: 'boolean', width: '6rem', hidden: true }),
  bet({ key: 'site', header: 'URL', width: '18rem', rendererOptions: { ellipsis: true } }),
  bet({
    key: 'open',
    header: 'Open',
    pinned: 'right',
    width: '6rem',
    renderer: 'action-button',
    rendererOptions: { label: 'Open' },
    value: () => 'Open',
  }),
]

/**
 * Column state is `{ order, hidden, pinned }`. Users change it by dragging headers, Alt+← / → on a
 * focused header, `VGridColumnMenu`, or the header right-click menu.
 */
const meta = {
  title: 'Grid/Columns',
  component: VGrid,
  args: {
    rows: makeBets(40, 11),
    columns: wideColumns,
    rowKey: 'id',
    ariaLabel: 'Bets',
    'onUpdate:columnState': fn(),
  },
  argTypes: { rows: { control: false }, columns: { control: false } },
} satisfies Meta<GridArgs>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Scroll sideways: # and Player stay left, Open stays right. Drag headers to reorder, right-click a
 * header to pin / move / hide, or use the Columns button. `storage` saves the layout in localStorage —
 * reload the story to see it kept. On a phone the pinned columns (21rem) would take most of the
 * grid, so they scroll like the others (`pinned-max-share`, half the grid by default).
 */
export const PinnedWithColumnMenu: Story = {
  args: { storage: 'storybook-columns-demo' },
  render: (args) => ({
    components: { VGrid, VGridColumnMenu },
    setup: () => ({ args }),
    template: `
      <div class="sb-frame" style="max-width: 900px">
        <VGrid v-bind="args">
          <template #toolbar="{ columnState, setColumnState }">
            <VGridColumnMenu :columns="args.columns" :column-state="columnState" @update:column-state="setColumnState($event)" />
          </template>
        </VGrid>
      </div>`,
  }),
}

/** `pinned-max-share="false"`: pinned columns stay pinned at any width, even when they leave little room. */
export const AlwaysPinned: Story = {
  args: { pinnedMaxShare: false },
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args }),
    template: `<div class="sb-frame" style="max-width: 900px"><VGrid v-bind="args" /></div>`,
  }),
}

/** `v-model:column-state` puts the layout in your hands, e.g. to sync it with user preferences. */
export const Controlled: Story = {
  render: (args) => ({
    components: { VGrid },
    setup() {
      const initial: ColumnState = {
        order: wideColumns.map((c) => c.key),
        hidden: ['payout', 'site'],
        pinned: {},
      }
      const state = ref<ColumnState>(initial)
      const toggle = (key: string) => {
        const hidden = state.value.hidden.includes(key)
          ? state.value.hidden.filter((k) => k !== key)
          : [...state.value.hidden, key]
        state.value = { ...state.value, hidden }
      }
      return { args, state, toggle, reset: () => (state.value = initial) }
    },
    template: `
      <div class="sb-row">
        <button class="sb-btn" @click="toggle('payout')">Toggle Payout</button>
        <button class="sb-btn" @click="toggle('site')">Toggle URL</button>
        <button class="sb-btn" @click="state = { ...state, pinned: { ...state.pinned, stake: 'left' } }">Pin Stake left</button>
        <button class="sb-btn" @click="reset">Reset</button>
      </div>
      <pre class="sb-note">{{ JSON.stringify(state) }}</pre>
      <div class="sb-frame" style="max-width: 900px"><VGrid v-bind="args" v-model:column-state="state" /></div>`,
  }),
}

/**
 * With `columnResizingFeature` (registered app-wide here via `allFeatures`), drag a header's right
 * edge to resize it (mouse, pen, touch), double-click the edge to fit the content, or focus the edge
 * and press ← / → (Shift for bigger steps). With keyboard navigation, Alt+Shift+← / → on a focused
 * header does the same. `minWidth` / `maxWidth` bound it (Player: 8–20rem); `resizable: false` opts
 * out (#). Widths go into `columnState.widths` and `storage`, and the header menu gains Fit width /
 * Reset width.
 */
export const Resizing: Story = {
  args: {
    storage: 'storybook-columns-resizing',
    columns: [
      bet({ key: 'id', header: '#', pinned: 'left', width: '4rem', resizable: false }),
      bet({
        key: 'player',
        header: 'Player',
        field: 'player.name',
        pinned: 'left',
        width: '11rem',
        minWidth: '8rem',
        maxWidth: '20rem',
      }),
      bet({ key: 'city', header: 'City', field: 'player.city', width: '10rem' }),
      bet({
        key: 'status',
        header: 'Status',
        renderer: 'status',
        rendererOptions: { tone: statusTones },
        width: '9rem',
      }),
      bet({ key: 'stake', header: 'Stake', renderer: 'currency', width: '9rem' }),
      bet({ key: 'site', header: 'URL', width: '14rem', rendererOptions: { ellipsis: true } }),
      bet({ key: 'placedAt', header: 'Placed', renderer: 'date', width: '9rem' }),
    ],
  },
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args }),
    template: `<div class="sb-frame" style="max-width: 900px"><VGrid v-bind="args" /></div>`,
  }),
}

/** Fit selected columns to the first rendered rows, while honoring saved widths. */
export const InitialAutosizing: Story = {
  render: () => ({
    components: { VGrid },
    setup() {
      const rows = ref<{ id: number; name: string; owner: string }[]>([])
      const loading = ref(true)
      const show = ref(true)
      const columns = [
        {
          key: 'name',
          header: 'Project',
          width: '100px',
          maxWidth: '240px',
          initialAutoSize: true,
        },
        { key: 'owner', header: 'Owner', width: '80px', minWidth: '120px', initialAutoSize: true },
        { key: 'stage', header: 'Stage', width: '70px', initialAutoSize: true, resizable: false },
        { key: 'id', header: 'ID', width: '1fr', resizable: false },
      ]
      const load = () => {
        rows.value = [
          { id: 1, name: 'A long project name that exceeds the width limit', owner: 'A' },
        ]
        loading.value = false
      }
      const replace = () => {
        rows.value = [{ id: 2, name: 'Roadmap', owner: 'A' }]
      }
      return { columns, rows, loading, show, load, replace }
    },
    template: `
      <button type="button" @click="load">Load projects</button>
      <button type="button" @click="replace">Replace projects</button>
      <button type="button" @click="show = !show">{{ show ? 'Hide table' : 'Show table' }}</button>
      <div v-show="show" class="sb-frame" style="max-width: 640px">
        <VGrid
          :rows="rows" :columns="columns" :loading="loading" row-key="id"
          storage="storybook-columns-initial-autosizing" aria-label="Projects" skeleton
        >
          <template #cell-stage><span>Ready for scheduling</span></template>
        </VGrid>
      </div>`,
  }),
}

/**
 * With `columnGroupsFeature`, give columns a `group` and adjacent columns of the same group share a
 * header cell above theirs. The group row is sticky, pinned groups stay pinned (a pin boundary
 * splits a group), and groups follow reordering, hiding and resizing: drag "Payout" out of "Money"
 * and the group splits; hide both money columns and it disappears.
 */
export const Groups: Story = {
  args: {
    columns: [
      bet({
        key: 'id',
        header: '#',
        pinned: 'left',
        width: '4rem',
        group: 'Bet',
        resizable: false,
      }),
      bet({
        key: 'player',
        header: 'Player',
        field: 'player.name',
        pinned: 'left',
        width: '11rem',
        group: 'Bet',
      }),
      bet({ key: 'city', header: 'City', field: 'player.city', width: '10rem', group: 'Customer' }),
      bet({
        key: 'verified',
        header: 'KYC',
        renderer: 'boolean',
        width: '6rem',
        group: 'Customer',
      }),
      bet({ key: 'stake', header: 'Stake', renderer: 'currency', width: '9rem', group: 'Money' }),
      bet({ key: 'payout', header: 'Payout', renderer: 'currency', width: '9rem', group: 'Money' }),
      bet({
        key: 'status',
        header: 'Status',
        renderer: 'status',
        rendererOptions: { tone: statusTones },
        width: '9rem',
      }),
      bet({ key: 'change', header: 'Δ odds', renderer: 'change', width: '8rem', group: 'Odds' }),
      bet({ key: 'placedAt', header: 'Placed', renderer: 'date', width: '9rem', group: 'Odds' }),
    ],
  },
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args }),
    template: `<div class="sb-frame" style="max-width: 900px; height: 420px"><VGrid v-bind="args" style="height: 100%" /></div>`,
  }),
}

/** Nested column groups over a mix of fixed and flexible columns. */
export const NestedGroups: Story = {
  render: () => ({
    components: { VGrid },
    setup() {
      const inventory = { key: 'inventory', label: 'Inventory' }
      const activity = { key: 'activity', label: 'Activity' }
      const identity = { key: 'identity', label: 'Identity' }
      const columns = [
        { key: 'id', width: '88px', pinned: 'left', groupPath: [inventory, identity] },
        { key: 'name', width: '1fr', minWidth: '132px', groupPath: [inventory, identity] },
        {
          key: 'location',
          width: '120px',
          groupPath: [inventory, { key: 'location', label: 'Location' }],
        },
        {
          key: 'quantity',
          width: '160px',
          groupPath: [activity, { key: 'current', label: 'Current' }],
        },
        {
          key: 'change',
          width: '1fr',
          minWidth: '150px',
          groupPath: [activity, { key: 'trend', label: 'Trend' }],
        },
        { key: 'status', width: '110px', groupPath: [activity] },
      ]
      const rows = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
        location: i % 2 ? 'East' : 'West',
        quantity: i * 10,
        change: i % 3,
        status: 'Available',
      }))
      const compact = ref(false)
      return { columns, rows, compact }
    },
    template: `
      <div>
        <button type="button" @click="compact = !compact">{{ compact ? 'Widen grid' : 'Narrow grid' }}</button>
        <div :style="{ width: compact ? '520px' : '920px', height: '360px' }">
          <VGrid
            :columns="columns"
            :rows="rows"
            :virtual="{ rowHeight: 36 }"
            row-key="id"
            storage="nested-group-layout"
            aria-label="Inventory activity"
            style="height: 100%"
          >
            <template #column-group="{ group }">{{ group.label }}</template>
          </VGrid>
        </div>
      </div>`,
  }),
}

/** Focus the Name header and press F2 to reach its menu. The menu can extend past the fitted grid. */
export const InteractiveHeaders: Story = {
  render: () => ({
    components: { InteractiveHeaderFixture },
    template: '<InteractiveHeaderFixture />',
  }),
}

/** `width` takes any CSS grid track: fixed, `fr`, `minmax()`, `min-content`; `minWidth` adds a floor. */
export const Sizing: Story = {
  args: {
    rows: makeBets(6),
    columns: [
      bet({ key: 'id', header: 'min-content', width: 'min-content' }),
      bet({
        key: 'player',
        header: '1fr, minWidth 10rem',
        field: 'player.name',
        width: '1fr',
        minWidth: '10rem',
      }),
      bet({ key: 'city', header: '8rem', field: 'player.city', width: '8rem' }),
      bet({
        key: 'site',
        header: 'minmax(8rem, 2fr) + ellipsis',
        width: 'minmax(8rem, 2fr)',
        rendererOptions: { ellipsis: true },
      }),
      bet({ key: 'stake', header: 'auto, centred', renderer: 'currency', align: 'center' }),
    ],
  },
}

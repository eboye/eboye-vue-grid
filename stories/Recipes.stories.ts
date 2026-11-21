import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { defineComponent, h, ref } from 'vue'
import { fn } from 'storybook/test'
import { createColumnHelper, type CellActionEvent } from '@eboye/vue-grid'
import { Grid as VGrid } from './support'

/**
 * Common back-office cells rebuilt from the generic renderers — no app-specific components:
 *
 * | Need | Renderer + options |
 * |---|---|
 * | Ticket id + reference, copyable | `multi-line` lines + `copy` |
 * | Player with a risk-class letter | `text` with `badge` |
 * | Risk category tile from the API colour | `chip` with `{ name, color }` values |
 * | Score with half-time score | `text` with `secondary` |
 * | Campaign status with label map | `status` with `label` map, `variant: 'outline'` |
 * | Monitoring % with an alert icon | `text` with `icon` |
 * | Terminal hardware summary + device list | `details` |
 * | Channel on/off | `switch` (controlled, emits `change`) |
 * | Favourite | `icon-toggle` |
 * | Balance drill-down | `currency` with `clickable` |
 * | Audit trail | `list` |
 */
const logAction = fn()

const meta = {
  title: 'Recipes/Back-office grid',
  args: { onCellAction: logAction },
} satisfies Meta<{ onCellAction: (e: CellActionEvent<Bet>) => void }>

export default meta
type Story = StoryObj<typeof meta>

interface Bet {
  id: number
  ticket: string
  reference: string
  player: { name: string; riskClass: 'A' | 'B' | 'C' }
  category: { name: string; color: string; description: string }
  score: string
  halfTime: string | null
  campaign: string
  usage: string
  usageAlert: 'NONE' | 'NOTIFY' | 'STOP'
  terminal: {
    state: string
    devices: {
      label: string
      value: string
      tone: 'success' | 'warning' | 'danger'
      detail?: string
    }[]
  }
  web: boolean
  favourite: boolean
  balance: number
  audits: string[]
}

const svgIcon = (d: string) =>
  defineComponent({
    setup: () => () =>
      h(
        'svg',
        {
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': 2,
          'aria-hidden': 'true',
        },
        [h('path', { d })],
      ),
  })
const BellIcon = svgIcon('M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0')
const StopIcon = svgIcon(
  'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
)

const initial: Bet[] = [
  {
    id: 1,
    ticket: 'TK-2026-000481',
    reference: 'REF-77A1',
    player: { name: 'Ana Ilić', riskClass: 'A' },
    category: { name: 'L', color: '#16a34a', description: 'Low risk' },
    score: '2:1',
    halfTime: '(1:0)',
    campaign: 'ACTIVE',
    usage: '42.10%',
    usageAlert: 'NONE',
    terminal: { state: 'OK', devices: [{ label: 'Printer', value: 'OK', tone: 'success' }] },
    web: true,
    favourite: true,
    balance: 15230.5,
    audits: ['odds 1.85 → 1.90'],
  },
  {
    id: 2,
    ticket: 'TK-2026-000482',
    reference: 'REF-77B4',
    player: { name: 'Marko Petrović', riskClass: 'C' },
    category: { name: 'H', color: '#b91c1c', description: 'High risk' },
    score: 'Jones',
    halfTime: null,
    campaign: 'CANCELLED',
    usage: '100.00%',
    usageAlert: 'STOP',
    terminal: {
      state: 'ERROR',
      devices: [
        { label: 'Printer', value: 'ERROR', tone: 'danger', detail: 'Paper jam' },
        { label: 'Scanner', value: 'OK', tone: 'success' },
      ],
    },
    web: false,
    favourite: false,
    balance: -320,
    audits: ['created', 'suspended', 'resumed'],
  },
  {
    id: 3,
    ticket: 'TK-2026-000483',
    reference: 'REF-77C9',
    player: { name: 'Jelena Nikolić', riskClass: 'B' },
    category: { name: 'M', color: '#facc15', description: 'Medium risk' },
    score: '0:0',
    halfTime: '(0:0)',
    campaign: 'DRAFT',
    usage: '86.67%',
    usageAlert: 'NOTIFY',
    terminal: {
      state: 'WARNING',
      devices: [{ label: 'Display', value: 'WARNING', tone: 'warning', detail: 'Low brightness' }],
    },
    web: true,
    favourite: false,
    balance: 980,
    audits: [],
  },
]

const col = createColumnHelper<Bet>()
const columns = [
  col({
    key: 'ticket',
    header: 'Ticket',
    renderer: 'multi-line',
    width: 'minmax(10rem, 1fr)',
    rendererOptions: {
      lines: (_v: unknown, row: Bet) => [
        { text: row.ticket, href: `https://example.com/tickets/${row.id}`, bold: true },
        { text: row.reference, muted: true },
      ],
      target: '_blank',
    },
  }),
  col({
    key: 'reference',
    header: 'Copy ref',
    renderer: 'copy',
    width: '8rem',
    rendererOptions: { iconOnly: true, title: 'Reference' },
  }),
  col({
    key: 'player',
    header: 'Player',
    field: 'player.name',
    width: 'minmax(10rem, 1fr)',
    rendererOptions: {
      badge: (_v: unknown, row: Bet) => ({
        text: row.player.riskClass,
        tone: ({ A: 'success', B: 'warning', C: 'danger' } as const)[row.player.riskClass],
        title: `Risk class ${row.player.riskClass}`,
      }),
    },
  }),
  col({ key: 'category', header: 'Risk', renderer: 'chip', align: 'center', width: 'min-content' }),
  col({
    key: 'score',
    header: 'Result',
    rendererOptions: { bold: true, secondary: (_v: unknown, row: Bet) => row.halfTime },
  }),
  col({
    key: 'campaign',
    header: 'Campaign',
    renderer: 'status',
    rendererOptions: {
      variant: 'outline',
      tone: { ACTIVE: 'success', DRAFT: 'warning', CANCELLED: 'danger' },
      label: { ACTIVE: 'Active', DRAFT: 'Draft', CANCELLED: 'Canceled' },
    },
  }),
  col({
    key: 'usage',
    header: 'Usage',
    align: 'end',
    rendererOptions: {
      icon: (_v: unknown, row: Bet) =>
        row.usageAlert === 'STOP'
          ? { icon: StopIcon, tone: 'danger', label: 'Stopped' }
          : row.usageAlert === 'NOTIFY'
            ? { icon: BellIcon, tone: 'neutral', label: 'Notify' }
            : null,
    },
  }),
  col({
    key: 'terminal',
    header: 'Terminal',
    renderer: 'details',
    rendererOptions: {
      label: (v: Bet['terminal']) => v.state,
      tone: (v: Bet['terminal']) =>
        (({ OK: 'success', WARNING: 'warning', ERROR: 'danger' }) as const)[v.state as 'OK'],
      items: (v: Bet['terminal']) => v.devices,
      title: 'Devices',
    },
  }),
  col({ key: 'web', header: 'Web', renderer: 'switch' }),
  col({
    key: 'favourite',
    header: '★',
    renderer: 'icon-toggle',
    rendererOptions: { label: 'Favourite' },
  }),
  col({
    key: 'balance',
    header: 'Balance',
    renderer: 'currency',
    rendererOptions: { clickable: true, currency: 'EUR' },
  }),
  col({ key: 'audits', header: 'Audit', renderer: 'list', rendererOptions: { placeholder: '—' } }),
]

/** Toggle the switch / star (the story applies the change, as your app would); actions are logged. */
export const BetMonitor: Story = {
  render: () => ({
    components: { VGrid },
    setup() {
      const rows = ref(initial.map((r) => ({ ...r })))
      function onCellAction(e: CellActionEvent<Bet>) {
        logAction(e)
        if (e.name === 'change' || e.name === 'toggle') {
          rows.value = rows.value.map((r) =>
            r.id === e.rowKey ? { ...r, [e.column.key]: e.payload } : r,
          )
        }
      }
      return { rows, columns, onCellAction }
    },
    template: `<VGrid :rows="rows" :columns="columns" row-key="id" aria-label="Bet monitor" @cell-action="onCellAction" />`,
  }),
}

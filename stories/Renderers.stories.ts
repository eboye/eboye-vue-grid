import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { computed, defineComponent, h, ref, watch } from 'vue'
import { fn } from 'storybook/test'
import type { CellActionEvent, ColumnDef, RendererName } from '@nocopypaste/vue-grid'
import { Grid as VGrid } from './support'

/** One sample row: a description of the case, the cell value, and extra fields option functions may read. */
interface Sample {
  id: number
  label: string
  value: unknown
  [extra: string]: unknown
}

interface RendererArgs {
  /** Registered renderer name. */
  renderer: RendererName
  /** Passed to the column as `rendererOptions`; edit it live in Controls. */
  rendererOptions: Record<string, unknown>
  samples: Sample[]
  /** The grid's `time-zone` (Storybook's default is UTC). */
  timeZone?: string
  onCellAction?: (...args: unknown[]) => void
}

const samples = (
  ...values: [label: string, value: unknown, extra?: Record<string, unknown>][]
): Sample[] => values.map(([label, value, extra], i) => ({ id: i + 1, label, value, ...extra }))

/**
 * Every built-in renderer, each with sample values that cover its edge cases (null, negative, invalid…).
 * Edit `rendererOptions` in the Controls panel to see each option's effect; option functions
 * receive `(value, row)`. Renderer actions (buttons, menus, links) are logged in Actions.
 *
 * ```ts
 * col({ key: 'total', renderer: 'currency', rendererOptions: { currency: 'GBP' } })
 * ```
 */
const meta = {
  title: 'Renderers',
  args: { rendererOptions: {}, onCellAction: fn() },
  argTypes: {
    renderer: { control: false },
    samples: { control: false },
    rendererOptions: { control: 'object' },
  },
  render: (args) => ({
    components: { VGrid },
    setup() {
      const columns = computed<ColumnDef<Sample>[]>(() => [
        { key: 'label', header: 'Case', width: 'minmax(10rem, 16rem)' },
        {
          key: 'value',
          header: `renderer: '${args.renderer}'`,
          width: 'minmax(12rem, 1fr)',
          renderer: args.renderer,
          rendererOptions: args.rendererOptions,
        },
      ])
      // Editable renderers (checkbox, switch, radio, icon-toggle) are controlled: like an app would,
      // the story writes the requested change back into its rows.
      const rows = ref<Sample[]>([])
      watch(
        () => args.samples,
        (s) => (rows.value = s.map((r) => ({ ...r }))),
        { immediate: true },
      )
      function onCellAction(e: CellActionEvent<Sample>) {
        args.onCellAction?.(e)
        if (e.name === 'change' || e.name === 'toggle') {
          rows.value = rows.value.map((r) => (r.id === e.rowKey ? { ...r, value: e.payload } : r))
        } else if (e.name === 'select') {
          rows.value = rows.value.map((r) => ({ ...r, value: r.id === e.rowKey }))
        }
      }
      return { args, columns, rows, onCellAction }
    },
    template: `<VGrid :rows="rows" :columns="columns" row-key="id" aria-label="Renderer samples" :time-zone="args.timeZone" @cell-action="onCellAction" />`,
  }),
} satisfies Meta<RendererArgs>

export default meta
type Story = StoryObj<typeof meta>

const long =
  'A fairly long piece of text that will not fit on one line in a narrow column, so it shows how ellipsis and line clamping behave.'

// ── text ─────────────────────────────────────────────────────────────────────────────

/** The default renderer. Options: `ellipsis`, `lines`, `maxWidth`, `tooltip`, `placeholder`, `tone`. */
export const Text: Story = {
  args: {
    renderer: 'text',
    rendererOptions: { placeholder: '—' },
    samples: samples(
      ['string', 'Hello'],
      ['number', 42],
      ['empty / null', null],
      ['long text', long],
    ),
  },
}

export const TextEllipsis: Story = {
  name: 'Text · ellipsis',
  args: {
    renderer: 'text',
    rendererOptions: { ellipsis: true, maxWidth: '16rem' },
    samples: samples(['long text (hover)', long], ['short', 'Fits']),
  },
}

export const TextClamp: Story = {
  name: 'Text · line clamp',
  args: {
    renderer: 'text',
    rendererOptions: { lines: 2, maxWidth: '16rem' },
    samples: samples(['clamped to 2 lines (hover)', long], ['short', 'Fits']),
  },
}

/** `tooltip: 'always'`: the full text as a tooltip on every cell, cut off or not (default with `ellipsis`: `'overflow'`). */
export const TextTooltipAlways: Story = {
  name: 'Text · tooltip always',
  args: {
    renderer: 'text',
    rendererOptions: { ellipsis: true, maxWidth: '16rem', tooltip: 'always' },
    samples: samples(['long text (hover)', long], ['short (hover)', 'Fits']),
  },
}

export const TextTone: Story = {
  name: 'Text · tone',
  args: {
    renderer: 'text',
    rendererOptions: {
      tone: (v: unknown) => (v === 'urgent' ? 'danger' : v === 'done' ? 'success' : undefined),
    },
    samples: samples(
      ['urgent → danger', 'urgent'],
      ['done → success', 'done'],
      ['other → no tone', 'pending'],
    ),
  },
}

/** Text that can be a button emitting a `toggle` action. Options: `clickable`, `highlighted`, `placeholder`. */
export const ToggleText: Story = {
  args: {
    renderer: 'toggle-text',
    rendererOptions: { clickable: true, highlighted: (_v: unknown, row: Sample) => row.id === 2 },
    samples: samples(
      ['clickable', 'Ana Ilić'],
      ['clickable + highlighted', 'Marko Petrović'],
      ['empty', null],
    ),
  },
}

// ── numbers ──────────────────────────────────────────────────────────────────────────

/** Locale-formatted, right-aligned, sorts numerically. Options: `format` (`Intl.NumberFormatOptions`), `placeholder`. */
export const Number: Story = {
  args: {
    renderer: 'number',
    rendererOptions: { format: { maximumFractionDigits: 2 }, placeholder: '—' },
    samples: samples(
      ['integer', 1234567],
      ['decimal', 3.14159],
      ['negative', -42.5],
      ['numeric string', '99.9'],
      ['null', null],
      ['not a number', 'abc'],
    ),
  },
}

export const NumberPercent: Story = {
  name: 'Number · percent',
  args: {
    renderer: 'number',
    rendererOptions: { format: { style: 'percent', minimumFractionDigits: 1 } },
    samples: samples(['0.125', 0.125], ['1', 1], ['-0.034', -0.034]),
  },
}

/** Like `number`, with an explicit sign. */
export const SignedNumber: Story = {
  args: {
    renderer: 'signed-number',
    rendererOptions: {},
    samples: samples(['positive', 12], ['negative', -3.5], ['zero', 0]),
  },
}

/** Options: `currency` (ISO code or `(value, row) => code`; default: grid/plugin currency), `format`. */
export const Currency: Story = {
  args: {
    renderer: 'currency',
    rendererOptions: { currency: (_v: unknown, row: Sample) => row.currency },
    samples: samples(
      ['EUR (from row)', 1234.5, { currency: 'EUR' }],
      ['USD (from row)', 99, { currency: 'USD' }],
      ['JPY (from row)', 5000, { currency: 'JPY' }],
      ['RSD (from row)', -250.75, { currency: 'RSD' }],
      ['null', null, { currency: 'EUR' }],
    ),
  },
}

/** Up / down / equal with arrow and colour. Options: `direction`, `currency`, `format`. */
export const Change: Story = {
  args: {
    renderer: 'change',
    rendererOptions: {},
    samples: samples(['up', 7.1], ['down', -1.6], ['equal', 0], ['null', null]),
  },
}

export const ChangeAsMoney: Story = {
  name: 'Change · as money',
  args: {
    renderer: 'change',
    rendererOptions: { currency: true },
    samples: samples(['gain', 1250], ['loss', -80.5]),
  },
}

// ── dates ────────────────────────────────────────────────────────────────────────────

const dates = samples(
  ['ISO string', '2026-11-21T14:30:15.250Z'],
  ['date-only string (a calendar day in every time zone)', '2026-01-05'],
  ['timestamp (ms)', Date.UTC(2026, 0, 1, 9, 5)],
  ['Date object', new Date(Date.UTC(2025, 6, 4, 18, 0))],
  ['invalid', 'not a date'],
  ['null', null],
)

/** Options: `format` (`Intl.DateTimeFormatOptions`), `placeholder`. Sorts by time. */
export const Date_: Story = {
  name: 'Date',
  args: { renderer: 'date', rendererOptions: { placeholder: '—' }, samples: dates },
}

/**
 * In a time zone west of UTC (`time-zone="America/New_York"`), instants shift to the local day,
 * while a date-only string (`2026-01-05`) stays that calendar day.
 */
export const DateInTimeZone: Story = {
  name: 'Date · New York time',
  args: {
    renderer: 'date',
    rendererOptions: { placeholder: '—' },
    samples: dates,
    timeZone: 'America/New_York',
  },
}

export const DateLong: Story = {
  name: 'Date · long format',
  args: {
    renderer: 'date',
    rendererOptions: { format: { dateStyle: 'full' } },
    samples: dates.slice(0, 3),
  },
}

/** Date and time, on two lines by default. Options: `twoLines`, `milliseconds`, `format`, `placeholder`. */
export const DateTime: Story = {
  args: {
    renderer: 'datetime',
    rendererOptions: { twoLines: true, milliseconds: false, placeholder: '—' },
    samples: dates,
  },
}

// ── status & flags ───────────────────────────────────────────────────────────────────

/** Options: `trueLabel`, `falseLabel`, `nullLabel`. */
export const Boolean: Story = {
  args: {
    renderer: 'boolean',
    rendererOptions: { trueLabel: 'Yes', falseLabel: 'No', nullLabel: 'Unknown' },
    samples: samples(['true', true], ['false', false], ['null', null]),
  },
}

/** Badge. Options: `tone` (value → tone map, one tone, or a function), `label`, `dot`. */
export const Status: Story = {
  args: {
    renderer: 'status',
    rendererOptions: {
      tone: {
        Won: 'success',
        Lost: 'danger',
        Open: 'info',
        Pending: 'warning',
        Void: 'neutral',
        VIP: 'accent',
      },
      dot: true,
    },
    samples: samples(
      ['success', 'Won'],
      ['danger', 'Lost'],
      ['info', 'Open'],
      ['warning', 'Pending'],
      ['neutral', 'Void'],
      ['accent', 'VIP'],
      ['unmapped', 'Other'],
    ),
  },
}

const svg = (name: string, d: string) =>
  defineComponent({
    name,
    setup: () => () =>
      h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: 16,
          height: 16,
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': 2.5,
          'aria-hidden': 'true',
        },
        [h('path', { d, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })],
      ),
  })
const CheckIcon = svg('CheckIcon', 'M5 12l5 5L20 7')
const CrossIcon = svg('CrossIcon', 'M6 6l12 12M18 6L6 18')
const ClockIcon = svg('ClockIcon', 'M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z')
const AlertIcon = svg(
  'AlertIcon',
  'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
)

/** Any icon component. Options: `icon` (fixed) or `iconFor` (per row), `show`, `label`, `tone`. */
export const Icon: Story = {
  args: {
    renderer: 'icon',
    rendererOptions: {
      iconFor: (v: unknown) => (v === 'done' ? CheckIcon : v === 'failed' ? CrossIcon : ClockIcon),
      tone: (v: unknown) => (v === 'done' ? 'success' : v === 'failed' ? 'danger' : 'warning'),
      label: (v: unknown) => String(v),
      show: (v: unknown) => v !== null,
    },
    samples: samples(
      ['done', 'done'],
      ['failed', 'failed'],
      ['pending', 'pending'],
      ['null (hidden by show)', null],
    ),
  },
}

// ── links & data ─────────────────────────────────────────────────────────────────────

/**
 * http(s) values link to themselves; unsafe schemes (`javascript:`, `data:`) are dropped. Without an
 * href the label renders as a button that emits `click`. Options: `href`, `label`, `target`.
 */
export const Link: Story = {
  args: {
    renderer: 'link',
    rendererOptions: { target: '_blank' },
    samples: samples(
      ['http(s) URL', 'https://example.com/bets/1'],
      ['javascript: URL (blocked)', 'javascript:alert(1)'],
      ['plain text', 'not a url'],
    ),
  },
}

export const LinkCustomHref: Story = {
  name: 'Link · custom href and label',
  args: {
    renderer: 'link',
    rendererOptions: {
      href: (v: unknown) => `/orders/${String(v)}`,
      label: (v: unknown) => `Order #${String(v)}`,
    },
    samples: samples(['id → /orders/:id', 1001], ['another', 1002]),
  },
}

const json = {
  channel: 'web',
  odds: [1.85, 2.1],
  tags: { vip: true, notes: null },
  nested: { deep: { deeper: 'value' } },
}

/** “View” button opening the escaped, pretty-printed value in a `<dialog>`. Options: `label`, `dialogTitle`. */
export const Json: Story = {
  args: {
    renderer: 'json',
    rendererOptions: { label: 'View', dialogTitle: 'Bet metadata' },
    samples: samples(['object', json], ['array', [1, 2, 3]]),
  },
}

/** Inline collapsible tree. Options: `collapseAt` (depth that starts collapsed). */
export const JsonTree: Story = {
  args: {
    renderer: 'json-tree',
    rendererOptions: { collapseAt: 1 },
    samples: samples(['object', json]),
  },
}

// ── actions ──────────────────────────────────────────────────────────────────────────

/** ⋯ button with a popover menu; emits the chosen item's `name`. Options: `actions` (items or `(row) => items`), `label`. */
export const ActionsMenu: Story = {
  args: {
    renderer: 'actions-menu',
    rendererOptions: {
      label: 'Row actions',
      actions: (row: Sample) => [
        { name: 'edit', label: 'Edit', hint: 'E' },
        { name: 'duplicate', label: 'Duplicate' },
        { name: 'archive', label: 'Archive', disabled: row.id === 2 },
        { separator: true },
        {
          name: 'delete',
          label: 'Delete',
          tone: 'danger',
          // a string says why it can't be chosen: shown under the label, read out as its description
          disabled: row.id === 3 && 'Settled rows can’t be deleted',
        },
      ],
    },
    samples: samples(
      ['all actions', null],
      ['“Archive” disabled', null],
      ['“Delete” disabled, with a reason', null],
    ),
  },
}

/** One button; emits `action` (default `click`). Options: `label`, `action`, `icon`, `tone`, `disabled`. */
export const ActionButton: Story = {
  args: {
    renderer: 'action-button',
    rendererOptions: {
      label: 'Approve',
      action: 'approve',
      tone: 'success',
      icon: CheckIcon,
      disabled: (_v: unknown, row: Sample) => row.id === 2,
    },
    samples: samples(['enabled', null], ['disabled', null]),
  },
}

// ── options added to existing renderers ──────────────────────────────────────────────

/** `secondary` (muted suffix), `badge` (before or after), `icon`, `bold`, `toneMode: 'fill'`. */
export const TextAdornments: Story = {
  name: 'Text · badge, icon, secondary',
  args: {
    renderer: 'text',
    rendererOptions: {
      secondary: (_v: unknown, row: Sample) => row.half as string | undefined,
      badge: (_v: unknown, row: Sample) => row.badge as string | undefined,
      icon: (_v: unknown, row: Sample) =>
        row.alert ? { icon: AlertIcon, tone: 'danger', label: 'Limit reached' } : null,
      bold: (_v: unknown, row: Sample) => !!row.half,
    },
    samples: samples(
      ['score + half-time (secondary)', '2:1', { half: '(1:0)' }],
      ['leading badge', 'TK-88213', { badge: 'A' }],
      ['leading icon', '86.67%', { alert: true }],
      ['plain', 'Nothing extra'],
    ),
  },
}

export const TextFill: Story = {
  name: 'Text · tone fill, newlines',
  args: {
    renderer: 'text',
    rendererOptions: {
      tone: (v: unknown) =>
        v === 'Rejected' ? 'danger' : v === 'Approved' ? 'success' : undefined,
      toneMode: 'fill',
      preserveNewlines: true,
    },
    samples: samples(
      ['danger fill', 'Rejected'],
      ['success fill', 'Approved'],
      ['line breaks kept', 'First line\nSecond line'],
    ),
  },
}

/**
 * `hoverCard`: lines with copy buttons in a small popup. Hover the text (after a short delay), or
 * click it / press Enter, which also moves focus into the card; Esc closes it. `copy: 'lines'` puts
 * a button on each line, `'all'` one for every line. A `tooltip` function can return lines too.
 */
export const TextHoverCard: Story = {
  name: 'Text · hover card',
  args: {
    renderer: 'text',
    rendererOptions: {
      hoverCard: (_v: unknown, row: Sample) =>
        row.id === 1
          ? {
              title: 'Payout account',
              copy: 'lines',
              lines: [
                { label: 'IBAN', text: 'RS35 1050 0812 3123 1231 73' },
                { label: 'SWIFT', text: 'AIKBRS22' },
                { label: 'Holder', text: 'Ana Petrović', copy: false },
              ],
            }
          : row.id === 2
            ? { copy: 'all', lines: ['TK-2026-000481', 'TK-2026-000482', 'TK-2026-000483'] }
            : null,
      tooltip: (_v: unknown, row: Sample) =>
        row.id === 3 ? ['Opened 10:42', 'Closed 11:07'] : undefined,
    },
    samples: samples(
      ['card, copy per line', 'Ana Petrović'],
      ['card, copy all', '3 tickets'],
      ['multi-line tooltip', 'Session 8812'],
    ),
  },
}

/** `copyable` adds a copy button (emits `copy`); `copyValue` changes what's copied. */
export const TextCopyable: Story = {
  name: 'Text · copyable',
  args: {
    renderer: 'text',
    rendererOptions: { copyable: true, ellipsis: true },
    samples: samples(['ticket id', 'TK-2026-000481'], ['empty (no button)', null]),
  },
}

/** `variant: 'soft' | 'solid' | 'outline'`, a value → label map, `clickable`, `placeholder`. */
export const StatusVariants: Story = {
  name: 'Status · variants, label map, clickable',
  args: {
    renderer: 'status',
    rendererOptions: {
      tone: { ACTIVE: 'success', DRAFT: 'warning', CANCELLED: 'danger', SCHEDULED: 'info' },
      label: { ACTIVE: 'Active', DRAFT: 'Draft', CANCELLED: 'Canceled', SCHEDULED: 'Scheduled' },
      variant: 'outline',
      clickable: true,
      placeholder: 'N/A',
    },
    samples: samples(
      ['ACTIVE', 'ACTIVE'],
      ['DRAFT', 'DRAFT'],
      ['CANCELLED', 'CANCELLED'],
      ['SCHEDULED', 'SCHEDULED'],
      ['empty', null],
    ),
  },
}

export const StatusSolid: Story = {
  name: 'Status · solid',
  args: {
    renderer: 'status',
    rendererOptions: {
      tone: { Won: 'success', Lost: 'danger', Open: 'info' },
      variant: 'solid',
      dot: false,
    },
    samples: samples(['Won', 'Won'], ['Lost', 'Lost'], ['Open', 'Open']),
  },
}

/** `display: 'icon'`: a check for true, nothing (or a cross with `falseIcon`) for false. */
export const BooleanIcon: Story = {
  name: 'Boolean · icon',
  args: {
    renderer: 'boolean',
    rendererOptions: { display: 'icon', falseIcon: false, nullLabel: 'N/A' },
    samples: samples(['true', true], ['false', false], ['null', null]),
  },
}

/** `clickable` turns numbers / currency into drill-down buttons (emit `click`). */
export const CurrencyClickable: Story = {
  name: 'Currency · clickable',
  args: {
    renderer: 'currency',
    rendererOptions: { clickable: true, currency: 'EUR', placeholder: 'N/A' },
    samples: samples(['balance', 15230.5], ['negative', -320], ['empty (not clickable)', null]),
  },
}

/** `iconOnly`, and booleans (also `'true'`/`'false'`) as a trend. */
export const ChangeIconOnly: Story = {
  name: 'Change · icon only',
  args: {
    renderer: 'change',
    rendererOptions: { iconOnly: true },
    samples: samples(['true', true], ["'false'", 'false'], ['number', 3.2], ['zero', 0]),
  },
}

/**
 * `to` → `<RouterLink>` when vue-router is installed (this Storybook has none, so string locations fall
 * back to an href); `to` returning null renders plain text.
 */
export const LinkRouter: Story = {
  name: 'Link · router `to`',
  args: {
    renderer: 'link',
    rendererOptions: {
      to: (v: unknown) => (v ? `/events/${String(v)}` : null),
      label: (v: unknown) => `Event ${String(v ?? '—')}`,
    },
    samples: samples(['route', 1201], ['no route → text', 0]),
  },
}

/** `parseNested` (JSON inside strings), `maxDepth`, `collapsed` behind a toggle, `emptyText`. */
export const JsonTreeNested: Story = {
  name: 'Json Tree · nested strings, collapsed',
  args: {
    renderer: 'json-tree',
    rendererOptions: {
      parseNested: true,
      collapsed: true,
      collapseAt: 3,
      maxDepth: 3,
      emptyText: 'No data to show',
    },
    samples: samples(
      ['JSON inside a string', { action: 'update', payload: '{"odds":{"home":1.85,"away":2.1}}' }],
      ['null', null],
    ),
  },
}

/** `visible`, `variant: 'solid' | 'outline' | 'ghost'`, `iconOnly`. */
export const ActionButtonVariants: Story = {
  name: 'Action Button · variants',
  args: {
    renderer: 'action-button',
    rendererOptions: {
      label: 'Resolve',
      variant: 'solid',
      action: 'resolve',
      visible: (_v: unknown, row: Sample) => !row.done,
    },
    samples: samples(['open ticket', null], ['resolved (hidden)', null, { done: true }]),
  },
}

export const ActionButtonIconOnly: Story = {
  name: 'Action Button · icon only',
  args: {
    renderer: 'action-button',
    rendererOptions: {
      label: 'Delete tag',
      icon: CrossIcon,
      iconOnly: true,
      variant: 'ghost',
      tone: 'danger',
      action: 'delete',
    },
    samples: samples(['tag', null]),
  },
}

// ── new renderers ────────────────────────────────────────────────────────────────────

/**
 * Stacked lines in one cell. Each line is a plain value or an object with
 * `text`, `href`, `to`, `tone`, `fill`, `bold`, `muted`, `tooltip`, `trend`, `action` and `badge`.
 * Options: `lines` (builder), `boldLines`, `ellipsis`, `target`, `placeholder`.
 */
export const MultiLine: Story = {
  args: {
    renderer: 'multi-line',
    rendererOptions: { target: '_blank', boldLines: [0] },
    samples: samples(
      ['sport / competition', ['Football', 'Premier League']],
      [
        'link + reference',
        [
          { text: 'TK-000481', href: 'https://example.com/t/481' },
          { text: 'REF-77', muted: true },
        ],
      ],
      ['badge line', [{ text: 'Won', tone: 'success', fill: true }, '2 legs']],
      [
        'market + odds trend',
        ['Match result · Home', { text: '1.85', trend: 'up', tone: 'success' }],
      ],
      ['action line', ['Sync failed', { text: 'Retry', action: 'retry' }]],
      ['empty', []],
    ),
  },
}

/** Text with a copy button; emits `copy` (or `copy-error`). Options: `copyValue`, `iconOnly`, `title`, `label`. */
export const Copy: Story = {
  args: {
    renderer: 'copy',
    rendererOptions: { title: 'Serial number' },
    samples: samples(
      ['serial number', 'SN-7F3A-22C9'],
      ['long value', 'b3f1c2e8-5d4a-4c1b-9a7e-1f2d3c4b5a69'],
      ['empty', null],
    ),
  },
}

export const CopyIconOnly: Story = {
  name: 'Copy · icon only (JSON)',
  args: {
    renderer: 'copy',
    rendererOptions: {
      iconOnly: true,
      label: 'Copy JSON',
      copyValue: (v: unknown) => JSON.stringify(v, null, 2),
    },
    samples: samples(['object', { action: 'void', by: 'admin' }]),
  },
}

/**
 * Compact tile with a raw per-row colour (text colour picked for contrast) or a tone. Accepts
 * `{ label | name, color, description }` objects. Options: `color`, `tone`, `label`, `tooltip`, `shape`, `size`.
 */
export const Chip: Story = {
  args: {
    renderer: 'chip',
    rendererOptions: { shape: 'square' },
    samples: samples(
      ['object with API colour', { name: 'A', color: '#16a34a', description: 'Low risk' }],
      ['light colour → dark text', { name: 'B', color: '#facc15', description: 'Medium risk' }],
      ['dark colour', { name: 'C', color: '#b91c1c', description: 'High risk' }],
      ['null', null],
    ),
  },
}

export const ChipTones: Story = {
  name: 'Chip · tone map, circle',
  args: {
    renderer: 'chip',
    rendererOptions: {
      tone: { A: 'success', B: 'warning', C: 'danger' },
      shape: 'circle',
      size: '1.5rem',
    },
    samples: samples(['A', 'A'], ['B', 'B'], ['C', 'C'], ['unmapped', 'D']),
  },
}

/** Editable boolean (controlled: emits `change` with the requested state). `disabled`, `disabledReason`, `label`. */
export const Checkbox: Story = {
  args: {
    renderer: 'checkbox',
    rendererOptions: {
      disabled: (_v: unknown, row: Sample) => row.id === 3,
      disabledReason: () => 'Settled markets are locked',
    },
    samples: samples(
      ['checked', true],
      ['unchecked', false],
      ['disabled (hover for reason)', true],
    ),
  },
}

/** Toggle switch (role="switch"); same options as checkbox. */
export const Switch: Story = {
  args: {
    renderer: 'switch',
    rendererOptions: { label: (_v: unknown, row: Sample) => `${row.label} channel` },
    samples: samples(['Web', true], ['Mobile', false], ['Retail', true]),
  },
}

/** Single choice across rows: emits `select` with the row key. */
export const Radio: Story = {
  args: {
    renderer: 'radio',
    rendererOptions: { label: (_v: unknown, row: Sample) => `Use ${row.label}` },
    samples: samples(['Main address', true], ['Billing address', false], ['Office', false]),
  },
}

/** Value plus a pencil button emitting `edit` (open your editor / modal). `format`, `placeholder`, `disabled`, `bold`. */
export const Edit: Story = {
  args: {
    renderer: 'edit',
    rendererOptions: {
      format: (v: unknown) => (v == null ? '' : `${String(v)} %`),
      placeholder: 'Not set',
      bold: true,
    },
    samples: samples(['margin', 4.5], ['not set', null]),
  },
}

/** Thumbnail with `src`, `baseUrl` for relative paths, `size`, `fit`, `shape`, `alt`; placeholder on empty / error. */
export const Image: Story = {
  args: {
    renderer: 'image',
    rendererOptions: {
      size: '2.5rem',
      shape: 'rounded',
      alt: (_v: unknown, row: Sample) => row.label,
    },
    samples: samples(
      [
        'data URL',
        'data:image/svg+xml,' +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#2563eb"/><text x="20" y="26" font-size="16" text-anchor="middle" fill="white" font-family="sans-serif">VG</text></svg>',
          ),
      ],
      ['broken URL → placeholder', 'https://invalid.example/missing.png'],
      ['empty → placeholder', null],
    ),
  },
}

/** Inline code block with JSON highlighting (text nodes only). `language`, `lines`, `indent`, `highlight`. */
export const Code: Story = {
  args: {
    renderer: 'code',
    rendererOptions: { lines: 6 },
    samples: samples(
      [
        'JSON string',
        '{"event":"odds-change","market":{"id":42,"suspended":false},"price":1.85,"note":null}',
      ],
      ['plain text', 'SELECT * FROM bets WHERE id = 42;'],
    ),
  },
}

/** Several buttons; each emits its `name`. Items: `{ name, label, tone, variant, disabled, icon, hidden }`. */
export const ButtonGroup: Story = {
  args: {
    renderer: 'button-group',
    rendererOptions: {
      buttons: (row: Sample) => [
        { name: 'approve', label: 'Approve', tone: 'success', variant: 'solid' },
        {
          name: 'reject',
          label: 'Reject',
          tone: 'danger',
          variant: 'solid',
          disabled: row.id === 2,
        },
        { name: 'details', label: 'Details' },
      ],
    },
    samples: samples(['pending', null], ['reject disabled', null]),
  },
}

/** Pressed / unpressed icon button (default: a star); emits `toggle` with the next state. */
export const IconToggle: Story = {
  args: {
    renderer: 'icon-toggle',
    rendererOptions: { label: 'Favourite' },
    samples: samples(['on', true], ['off', false]),
  },
}

/** Summary badge plus an info button opening a popover with a list of `{ label, value, tone, detail, tooltip }`. */
export const Details: Story = {
  args: {
    renderer: 'details',
    rendererOptions: {
      tone: { OK: 'success', WARNING: 'warning', ERROR: 'danger' },
      title: (_v: unknown, row: Sample) => `${row.label} devices`,
      items: (_v: unknown, row: Sample) => row.devices,
    },
    samples: samples(
      [
        'Terminal 12',
        'ERROR',
        {
          devices: [
            {
              label: 'Printer',
              value: 'ERROR',
              tone: 'danger',
              detail: 'Paper jam',
              tooltip: 'since 10:42',
            },
            { label: 'Scanner', value: 'OK', tone: 'success', detail: 'Model S-200' },
            { label: 'Display', value: 'WARNING', tone: 'warning' },
          ],
        },
      ],
      ['Terminal 7', 'OK', { devices: [{ label: 'Printer', value: 'OK', tone: 'success' }] }],
      ['no devices (no button)', 'OK', { devices: [] }],
    ),
  },
}

/** First item(s) of an array with a “+N more” toggle. `items`, `itemLabel`, `max`, `placeholder`. */
export const List: Story = {
  args: {
    renderer: 'list',
    rendererOptions: {
      max: 1,
      itemLabel: (item: { dataPoint: string }) => item.dataPoint,
      placeholder: '—',
    },
    samples: samples(
      [
        '3 audits',
        [{ dataPoint: 'odds 1.85 → 1.90' }, { dataPoint: 'suspended' }, { dataPoint: 'resumed' }],
      ],
      ['1 audit', [{ dataPoint: 'created' }]],
      ['none', []],
    ),
  },
}

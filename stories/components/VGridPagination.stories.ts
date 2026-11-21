import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { fn } from 'storybook/test'
import { VGridPagination } from '@eboye/vue-grid'

/**
 * Stand-alone pager: `v-model:page`, `v-model:page-size`, `total`. Works with any list, not only the
 * grid. `summary` takes `{from}`, `{to}`, `{total}` placeholders (empty string hides it).
 */
const meta = {
  title: 'Components/VGridPagination',
  component: VGridPagination,
  args: {
    total: 1234,
    pageSizes: [10, 25, 50, 100],
    siblings: 1,
    summary: '{from}–{to} of {total}',
    'onUpdate:page': fn(),
    'onUpdate:pageSize': fn(),
  },
  render: (args) => ({
    components: { VGridPagination },
    setup: () => ({ args, page: ref(7), pageSize: ref(25) }),
    template: `
      <VGridPagination v-bind="args" v-model:page="page" v-model:page-size="pageSize" />
      <p class="sb-note">page = {{ page }}, pageSize = {{ pageSize }}</p>`,
  }),
} satisfies Meta<typeof VGridPagination>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** No page-size selector when `page-sizes` is omitted. */
export const WithoutPageSizes: Story = { args: { pageSizes: undefined } }

/** More page buttons around the current one. */
export const MoreSiblings: Story = { args: { siblings: 3 } }

export const CustomSummary: Story = { args: { summary: 'Showing {from} to {to} of {total} bets' } }

export const FewPages: Story = { args: { total: 42 } }

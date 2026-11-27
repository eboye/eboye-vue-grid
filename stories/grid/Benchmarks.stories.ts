import type { Meta, StoryObj } from '@storybook/vue3-vite'
import BenchmarkFixture from './BenchmarkFixture.vue'

const meta = {
  title: 'Grid/Benchmarks',
  component: BenchmarkFixture,
  tags: ['!autodocs'],
  args: { startMounted: true },
} satisfies Meta<typeof BenchmarkFixture>

export default meta
type Story = StoryObj<typeof meta>

export const Page: Story = { args: { workload: 'page' } }
export const Tree: Story = { args: { workload: 'tree' } }
export const Grouped: Story = { args: { workload: 'grouped' } }
export const Flat: Story = { args: { workload: 'flat' } }

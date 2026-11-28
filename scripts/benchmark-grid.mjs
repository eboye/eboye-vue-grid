import { availableParallelism, cpus, platform, release } from 'node:os'
import { chromium } from 'playwright'

const workloads = ['page', 'tree', 'grouped', 'flat', 'custom-overscan-two', 'custom-overscan-six']
const samples = Number(process.env.BENCHMARK_RUNS ?? 7)
const freshContexts = Number(process.env.BENCHMARK_FRESH_CONTEXTS ?? 7)
const warmups = 2
const scrollFrames = 60
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const viewport = { width: 1280, height: 900 }

if (!Number.isSafeInteger(samples) || samples < 1)
  throw new Error('BENCHMARK_RUNS must be a positive integer')
if (!Number.isSafeInteger(freshContexts) || freshContexts < 1)
  throw new Error('BENCHMARK_FRESH_CONTEXTS must be a positive integer')

const quantile = (values, fraction) => {
  const sorted = values.toSorted((a, b) => a - b)
  return sorted[Math.ceil(sorted.length * fraction) - 1]
}
const round = (value) => Number(value.toFixed(2))

const browser = await chromium.launch()
async function measure(workload, count, mountOnly = false) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })
  try {
    await page.goto(
      `${base}/iframe.html?id=grid-benchmarks--${workload}&viewMode=story&args=startMounted:!false`,
    )
    await page.evaluate(async () => void (await document.fonts.ready))
    return await page.getByTestId('grid-benchmark').evaluate(
      async (fixture, { count, scrollFrames, custom, mountOnly }) => {
        const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
        const grid = () => fixture.querySelector('.vg[aria-label="Benchmark grid"]')
        const revision = () =>
          grid()?.querySelector('[data-row-key="task-1"] > [data-col-key="revision"]')
        const settle = async () => {
          await frame()
          await frame()
        }

        async function commit(action) {
          const control = fixture.querySelector(`[data-action="${action}"]`)
          const committed = new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error(`${action} did not commit`)), 5000)
            fixture.addEventListener(
              'benchmark-commit',
              () => {
                clearTimeout(timer)
                resolve()
              },
              { once: true },
            )
          })
          const start = performance.now()
          control.click()
          await committed
          // Include synchronous style and layout for the changed cell, or the grid on mount.
          ;(revision() ?? grid())?.getBoundingClientRect()
          return performance.now() - start
        }

        if (grid()) throw new Error('The benchmark grid must start unmounted')
        const runs = []
        for (let run = 0; run < count; run++) {
          const mountMs = await commit('mount')
          await settle()
          const viewport = grid()
          if (!viewport || revision()?.textContent.trim() !== '0')
            throw new Error('Expected a mounted grid with the initial revision')
          if (mountOnly) return [{ mountMs }]
          const renderedRows = viewport.querySelectorAll('.vg-row').length

          const max = viewport.scrollHeight - viewport.clientHeight
          if (max <= 96) throw new Error('The workload must scroll')
          const intervals = []
          let previous = await frame()
          for (let index = 1; index <= scrollFrames; index++) {
            const distance = (index * 96) % (2 * max)
            viewport.scrollTop = Math.min(distance, 2 * max - distance)
            const now = await frame()
            intervals.push(now - previous)
            previous = now
          }

          viewport.scrollTop = 0
          await settle()
          const updateMs = await commit('update')
          if (revision()?.textContent.trim() !== '1')
            throw new Error('The row update did not render')
          let freshUpdateMs, detailMs, jumpMs
          if (custom) {
            freshUpdateMs = await commit('fresh')
            if (revision()?.textContent.trim() !== '2') throw new Error('Snapshot did not render')
            detailMs = await commit('detail')
            if (!viewport.querySelector('.vg-detail')) throw new Error('Detail did not open')
            await settle()
            const last = `[data-row-key="${CSS.escape(fixture.dataset.lastRow)}"] > [data-col-key="revision"]`
            const start = performance.now()
            viewport.scrollTop = viewport.scrollHeight
            for (let i = 0; i < 20 && !viewport.querySelector(last); i++) await frame()
            const lastCell = viewport.querySelector(last)
            if (!lastCell) throw new Error('Native jump did not render the last row')
            lastCell.getBoundingClientRect()
            jumpMs = performance.now() - start
          }
          runs.push({ mountMs, updateMs, freshUpdateMs, detailMs, jumpMs, intervals, renderedRows })
          await commit('mount')
          await settle()
        }
        return runs
      },
      { count, scrollFrames, custom: workload.startsWith('custom-'), mountOnly },
      { timeout: 10_000 },
    )
  } finally {
    await page.close()
  }
}

try {
  const firstMounts = new Map(workloads.map((workload) => [workload, []]))
  for (let context = 0; context < freshContexts; context++) {
    for (let offset = 0; offset < workloads.length; offset++) {
      const workload = workloads[(context + offset) % workloads.length]
      const [run] = await measure(workload, 1, true)
      firstMounts.get(workload).push(run.mountMs)
    }
  }

  const results = []
  for (const workload of workloads) {
    const runs = await measure(workload, warmups + samples)
    const firstMountSamples = firstMounts.get(workload)
    const measured = runs.slice(warmups)
    const intervals = measured.flatMap((run) => run.intervals)
    results.push({
      workload,
      firstMountMs: round(quantile(firstMountSamples, 0.5)),
      firstMountSamplesMs: firstMountSamples.map(round),
      medianMountMs: round(
        quantile(
          measured.map((run) => run.mountMs),
          0.5,
        ),
      ),
      medianUpdateMs: round(
        quantile(
          measured.map((run) => run.updateMs),
          0.5,
        ),
      ),
      p95ScrollFrameMs: round(quantile(intervals, 0.95)),
      slowScrollFrames: intervals.filter((interval) => interval > 25).length,
      scrollFrames: intervals.length,
      renderedRowsAtTop: measured[0].renderedRows,
      mountSamplesMs: measured.map((run) => round(run.mountMs)),
      updateSamplesMs: measured.map((run) => round(run.updateMs)),
      ...(workload.startsWith('custom-') && {
        medianFreshUpdateMs: round(
          quantile(
            measured.map((run) => run.freshUpdateMs),
            0.5,
          ),
        ),
        medianDetailMs: round(
          quantile(
            measured.map((run) => run.detailMs),
            0.5,
          ),
        ),
        medianNativeJumpMs: round(
          quantile(
            measured.map((run) => run.jumpMs),
            0.5,
          ),
        ),
      }),
    })
  }
  console.log(
    JSON.stringify(
      {
        environment: {
          cpu: cpus()[0]?.model,
          availableProcessors: availableParallelism(),
          os: `${platform()} ${release()}`,
          node: process.version,
          chromium: browser.version(),
          viewport,
        },
        warmups,
        samples,
        freshContexts,
        results,
      },
      null,
      2,
    ),
  )
} finally {
  await browser.close()
}

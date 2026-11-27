# Grid performance baseline

The benchmark mounts the grid inside a production Storybook build with six columns. The two
hierarchical workloads use the same 2,000 tasks in 50 expanded branches or groups. The 50-row
workload represents one already-fetched server page. Only that workload renders every row.

- **First mount** measures the first grid mount on a freshly loaded story. Dataset construction,
  Storybook startup, asset loading, and server fetch time are outside the measurement.
- **Warm mount and update** measure from the action through Vue's DOM commit and synchronous
  layout. The update changes a field on ten displayed rows through the `rows` prop and retains
  their keys. These timings stop before paint.
- **Scrolling** sets the scroll position in 96 px steps over 60 animation frames per run,
  reversing at the end of the range. The report pools frame intervals and counts those over
  25 ms. This measures scripted scrolling in a headless browser.

Two warm-up runs precede seven measured runs per workload. The first warm-up supplies the first
mount measurement. All workloads use a 448 px high grid at a 1280 × 900 browser viewport. The
virtual workloads use 36 px rows with six rows of overscan.

## Results

Measured on 2026-11-27 on a Ryzen 7 5800X with 14 logical CPUs available, Arch Linux
7.3.6, Node 24.19.0, and headless Chromium 159.0.8154.6.

| Workload                         | Rows rendered at top | First mount | Median warm mount | Median 10-row update | Scroll p95 | Frames over 25 ms |
| -------------------------------- | -------------------: | ----------: | ----------------: | -------------------: | ---------: | ----------------: |
| 50-row server page               |                   50 |     55.2 ms |           18.4 ms |               4.8 ms |    16.7 ms |           0 / 420 |
| 2,000-task virtual tree          |                   19 |     43.5 ms |           11.3 ms |               4.8 ms |    16.8 ms |           0 / 420 |
| 2,000-task virtual grouped table |                   19 |     59.8 ms |           12.7 ms |               4.6 ms |    16.7 ms |           0 / 420 |
| 10,000-row virtual flat table    |                   19 |     50.9 ms |           10.5 ms |               4.2 ms |    16.7 ms |           0 / 420 |

The first mount was the most expensive step in every workload. The virtual workloads started
with 19 rendered rows each, even at 10,000 data rows. Warm timings varied between runs. For
example, the tree's median warm mount was 11.3 ms, with one sample at 32.2 ms. This baseline
covers local grid work with simple renderers on one machine.

## Reproduce

Run against the production Storybook build.

```sh
npm run build-storybook -- --quiet
npx vite preview --outDir storybook-static --host 127.0.0.1 --port 6006 --strictPort
```

In a second shell, run the benchmark with Playwright Chromium installed.

```sh
STORYBOOK_URL=http://127.0.0.1:6006 npm run --silent benchmark:grid > grid-benchmark.json
```

Set `BENCHMARK_RUNS` to change the sample count. The JSON records the environment, frame counts,
and individual warm mount and update samples. Run the same workloads in the same browser and
environment when comparing changes. Portable CI pass/fail thresholds are outside this baseline.

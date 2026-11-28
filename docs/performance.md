# Grid performance baseline

The benchmark mounts the grid inside a production Storybook build. The four standard workloads
use six columns. The two standard hierarchical workloads use the same 2,000 tasks in 50 expanded
branches or groups. The 50-row workload represents one already-fetched server page and renders
every row.
Two additional workloads exercise the same 500 expanded child rows with 17 custom cell slots,
a pinned column, and a content-height detail grid. They use a 640 px wide grid and vary overscan.

- **First mount** measures from the mount action through DOM commit and synchronous layout on a
  freshly loaded story. Each workload has seven samples from separate browser contexts. The
  workload order rotates between rounds. Dataset construction, Storybook startup, asset loading,
  and server fetch time are outside the measurement.
- **Warm mount and update** measure from the action through Vue's DOM commit and synchronous
  layout. The update changes a field on ten displayed rows through the `rows` prop and retains
  their keys. These timings stop before paint.
- **Scrolling** sets the scroll position in 96 px steps over 60 animation frames per run,
  reversing at the end of the range. The report pools frame intervals and counts those over
  25 ms. This measures scripted scrolling in a headless browser.
- **Custom-cell updates** change one value. The sparse update keeps unchanged child objects,
  while the snapshot update replaces them all. The detail measurement ends after DOM commit
  and layout. The native jump runs with the detail open and ends when the last row is laid out.

In a separate context for each workload, two warm-up runs precede seven measured warm runs.
All workloads use a 448 px high grid at a 1280 × 900 browser viewport. The virtual workloads use
36 px rows. The standard virtual workloads use six rows of overscan.

## Results

Measured with the 0.28.0 grid on 2026-11-28 on a Ryzen 7 5800X with 14 logical CPUs available, Arch Linux
7.3.6, Node 24.19.0, and headless Chromium 159.0.8154.6. Mount and update timings in the tables
are medians.

| Workload                         | Rows rendered at top | First mount | Median warm mount | Median 10-row update | Scroll p95 | Frames over 25 ms |
| -------------------------------- | -------------------: | ----------: | ----------------: | -------------------: | ---------: | ----------------: |
| 50-row server page               |                   50 |     64.1 ms |           31.2 ms |               6.0 ms |    16.7 ms |           0 / 420 |
| 2,000-task virtual tree          |                   19 |     40.7 ms |           12.5 ms |               5.2 ms |    16.7 ms |           0 / 420 |
| 2,000-task virtual grouped table |                   19 |     52.2 ms |           16.1 ms |               6.8 ms |    16.8 ms |           0 / 420 |
| 10,000-row virtual flat table    |                   19 |     39.9 ms |           16.3 ms |               7.4 ms |    16.8 ms |           0 / 420 |

| Overscan | Rows at top | First mount | Warm mount | Sparse update | Snapshot update | Open detail | Native jump | Frames over 25 ms |
| -------: | ----------: | ----------: | ---------: | ------------: | --------------: | ----------: | ----------: | ----------------: |
|        2 |          15 |     58.9 ms |    30.2 ms |        6.4 ms |         12.4 ms |      9.3 ms |     36.1 ms |           5 / 420 |
|        6 |          19 |     67.6 ms |    27.3 ms |        4.7 ms |          9.8 ms |      8.0 ms |     34.6 ms |          10 / 420 |

First-mount samples for the grouped table ranged from 38.4 ms to 100.7 ms. The previous baseline
recorded a single first-mount sample per workload, so its first-mount figures cannot establish
a version-to-version change.

The custom-cell workload with overscan set to two mounted four fewer rows and had a lower median
first-mount time in this run. The workload with overscan set to six had lower median warm mount
and update times. These local measurements are sensitive to machine load. Evaluate overscan with
the expected cell content and scrolling pattern. The global default is six.

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

Set `BENCHMARK_FRESH_CONTEXTS` to change the number of first-mount samples per workload and
`BENCHMARK_RUNS` to change the number of measured warm runs. The JSON records the environment,
frame counts, and individual first-mount, warm mount, and update samples. Run the same workloads
in the same browser and environment when comparing changes.
